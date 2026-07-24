export interface CropOffset {
  x: number
  y: number
}

const clamp = (n: number) => Math.min(100, Math.max(0, n))

// Reproduces `object-fit: cover` + `object-position: x% y%` semantics for a
// square viewport: the crop window is the largest square that fits inside
// the source image, positioned according to the offset percentages (0% =
// top/left of the image, 100% = bottom/right).
export function computeCropRect(imgWidth: number, imgHeight: number, offset: CropOffset) {
  const side = Math.min(imgWidth, imgHeight)
  const maxX = imgWidth - side
  const maxY = imgHeight - side
  return {
    side,
    sx: (clamp(offset.x) / 100) * maxX,
    sy: (clamp(offset.y) / 100) * maxY,
  }
}

const OUTPUT_SIZE = 512

// Bakes the chosen crop position into an actual square image (rather than
// storing the offset as separate metadata), so every place the photo is
// later displayed — search cards, the public profile, etc. — shows it
// correctly centered without needing to know about the offset at all.
export async function cropImageToSquare(file: File, offset: CropOffset): Promise<File> {
  const objectUrl = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image()
      el.onload = () => resolve(el)
      el.onerror = () => reject(new Error('image load failed'))
      el.src = objectUrl
    })
    const { side, sx, sy } = computeCropRect(img.naturalWidth, img.naturalHeight, offset)

    const canvas = document.createElement('canvas')
    canvas.width = OUTPUT_SIZE
    canvas.height = OUTPUT_SIZE
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('canvas not supported')
    ctx.drawImage(img, sx, sy, side, side, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE)

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('crop failed'))), 'image/jpeg', 0.92)
    })
    return new File([blob], file.name.replace(/\.\w+$/, '.jpg') || 'photo.jpg', { type: 'image/jpeg' })
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}
