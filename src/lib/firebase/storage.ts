import { validateFeedbackScreenshot } from '@/lib/feedback-screenshot'
export { FEEDBACK_SCREENSHOT_MAX_BYTES, validateFeedbackScreenshot } from '@/lib/feedback-screenshot'
type UploadedPhoto = { url: string; storageKey: string }

async function upload(kind: string, ownerId: string, file: File, onProgress?: (percent: number) => void): Promise<UploadedPhoto> {
  const error = validateFeedbackScreenshot(file)
  if (error) throw new Error(error)
  if (!file.size) throw new Error('התמונה ריקה.')
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', `/api/uploads?kind=${encodeURIComponent(kind)}&ownerId=${encodeURIComponent(ownerId)}`)
    xhr.setRequestHeader('Content-Type', file.type)
    xhr.upload.onprogress = event => {
      if (event.lengthComputable) onProgress?.(Math.min(99, Math.round(event.loaded / event.total * 100)))
    }
    xhr.onerror = () => reject(new Error('העלאת התמונה נכשלה. נסו שוב.'))
    xhr.onload = () => {
      try {
        const result = JSON.parse(xhr.responseText)
        if (xhr.status < 200 || xhr.status >= 300) throw new Error(result.error || 'העלאת התמונה נכשלה.')
        onProgress?.(100)
        resolve(result.data)
      } catch (cause) { reject(cause) }
    }
    xhr.send(file)
  })
}
export async function uploadFeedbackScreenshot(userId: string, file: File, onProgress?: (percent: number) => void): Promise<{ storageKey: string }> {
  const { storageKey } = await upload('feedback', userId, file, onProgress)
  return { storageKey }
}
export async function uploadPortfolioPhoto(nailistId: string, file: File, onProgress?: (percent: number) => void): Promise<UploadedPhoto> {
  return upload('portfolio', nailistId, file, onProgress)
}
export async function uploadProfilePhoto(userId: string, file: File, onProgress?: (percent: number) => void): Promise<UploadedPhoto> {
  return upload('avatars', userId, file, onProgress)
}
export async function uploadCoverPhoto(nailistId: string, file: File, onProgress?: (percent: number) => void): Promise<UploadedPhoto> {
  return upload('covers', nailistId, file, onProgress)
}
export async function deleteStorageFile(storageKey: string) {
  const response = await fetch(`/api/uploads?storageKey=${encodeURIComponent(storageKey)}`, { method: 'DELETE' })
  if (!response.ok) throw new Error((await response.json()).error || 'מחיקת התמונה נכשלה.')
}
