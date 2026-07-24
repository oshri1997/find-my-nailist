/**
 * computeCropRect reproduces `object-fit: cover` + `object-position: x% y%`
 * semantics for a square viewport — it's what lets the onboarding photo
 * step's drag-to-reposition control actually bake the chosen position into
 * the uploaded image instead of just repositioning a preview.
 */
import { computeCropRect, cropImageToSquare } from '@/lib/image-crop'

describe('computeCropRect', () => {
  it('uses the smaller dimension as the crop side (largest square that fits)', () => {
    expect(computeCropRect(800, 1200, { x: 50, y: 50 }).side).toBe(800)
    expect(computeCropRect(1200, 800, { x: 50, y: 50 }).side).toBe(800)
  })

  it('centers the crop window for a 50/50 offset', () => {
    // image is 800x1200 (portrait) — vertical slack is 400px, so a centered
    // crop starts 200px down; horizontal slack is 0.
    expect(computeCropRect(800, 1200, { x: 50, y: 50 })).toEqual({ side: 800, sx: 0, sy: 200 })
  })

  it('a 0% y offset shows the top of a portrait image (sy = 0)', () => {
    expect(computeCropRect(800, 1200, { x: 50, y: 0 }).sy).toBe(0)
  })

  it('a 100% y offset shows the bottom of a portrait image (sy = full slack)', () => {
    expect(computeCropRect(800, 1200, { x: 50, y: 100 }).sy).toBe(400)
  })

  it('has no vertical slack for a square image regardless of offset', () => {
    expect(computeCropRect(800, 800, { x: 50, y: 0 }).sy).toBe(0)
    expect(computeCropRect(800, 800, { x: 50, y: 100 }).sy).toBe(0)
  })

  it('clamps out-of-range offsets into 0-100 before computing', () => {
    expect(computeCropRect(800, 1200, { x: 50, y: -20 }).sy).toBe(0)
    expect(computeCropRect(800, 1200, { x: 50, y: 150 }).sy).toBe(400)
  })
})

describe('cropImageToSquare', () => {
  const realImage = global.Image
  const realCreateObjectURL = URL.createObjectURL
  const realRevokeObjectURL = URL.revokeObjectURL
  let drawImageMock: jest.Mock

  beforeEach(() => {
    URL.createObjectURL = jest.fn().mockReturnValue('blob:fake')
    URL.revokeObjectURL = jest.fn()

    class MockImage {
      onload: (() => void) | null = null
      onerror: (() => void) | null = null
      naturalWidth = 800
      naturalHeight = 1200
      set src(_value: string) {
        setTimeout(() => this.onload?.(), 0)
      }
    }
    // @ts-expect-error - test double, not a full HTMLImageElement
    global.Image = MockImage

    drawImageMock = jest.fn()
    jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      drawImage: drawImageMock,
    } as unknown as CanvasRenderingContext2D)
    jest.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(function (
      this: HTMLCanvasElement,
      cb: BlobCallback
    ) {
      cb(new Blob(['cropped'], { type: 'image/jpeg' }))
    })
  })

  afterEach(() => {
    global.Image = realImage
    URL.createObjectURL = realCreateObjectURL
    URL.revokeObjectURL = realRevokeObjectURL
    jest.restoreAllMocks()
  })

  it('draws the computed crop rect onto the canvas and returns a jpeg File', async () => {
    const file = new File(['bytes'], 'avatar.png', { type: 'image/png' })
    const result = await cropImageToSquare(file, { x: 50, y: 0 })

    expect(drawImageMock).toHaveBeenCalledWith(
      expect.anything(),
      0, 0, 800, 800, // sx, sy, side, side for a top-aligned crop of an 800x1200 image
      0, 0, 512, 512
    )
    expect(result.type).toBe('image/jpeg')
    expect(result.name).toBe('avatar.jpg')
  })

  it('revokes the temporary object URL after cropping', async () => {
    const file = new File(['bytes'], 'avatar.jpg', { type: 'image/jpeg' })
    await cropImageToSquare(file, { x: 50, y: 50 })
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:fake')
  })
})
