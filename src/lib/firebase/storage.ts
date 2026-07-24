import { ref, uploadBytesResumable, getDownloadURL, deleteObject, type FirebaseStorage } from 'firebase/storage'
import { initFirebase } from './client'

async function getStorage(): Promise<FirebaseStorage> {
  const clients = await initFirebase()
  if (!clients?.storage) throw new Error('Firebase Storage is not initialized. Check your Firebase env vars.')
  return clients.storage
}

export async function uploadPortfolioPhoto(
  nailistId: string,
  file: File,
  onProgress?: (percent: number) => void
): Promise<{ url: string; storageKey: string }> {
  const storage = await getStorage()
  const ext = file.name.split('.').pop() ?? 'jpg'
  const storageKey = `portfolio/${nailistId}/${Date.now()}.${ext}`
  const storageRef = ref(storage, storageKey)

  return new Promise((resolve, reject) => {
    const task = uploadBytesResumable(storageRef, file, { contentType: file.type })
    task.on(
      'state_changed',
      (snapshot) => {
        const percent = (snapshot.bytesTransferred / snapshot.totalBytes) * 100
        onProgress?.(Math.round(percent))
      },
      reject,
      async () => {
        const url = await getDownloadURL(task.snapshot.ref)
        resolve({ url, storageKey })
      }
    )
  })
}

export async function uploadProfilePhoto(
  userId: string,
  file: File,
  onProgress?: (percent: number) => void
): Promise<{ url: string; storageKey: string }> {
  const storage = await getStorage()
  const ext = file.name.split('.').pop() ?? 'jpg'
  // Timestamped like portfolio/cover photos — a fixed filename would keep the
  // same Firebase Storage download URL across re-uploads (same path, same
  // token), so browsers serve the old cached image instead of the new one.
  const storageKey = `avatars/${userId}/profile-${Date.now()}.${ext}`
  const storageRef = ref(storage, storageKey)

  return new Promise((resolve, reject) => {
    const task = uploadBytesResumable(storageRef, file, { contentType: file.type })
    task.on(
      'state_changed',
      (snapshot) => {
        const percent = (snapshot.bytesTransferred / snapshot.totalBytes) * 100
        onProgress?.(Math.round(percent))
      },
      reject,
      async () => {
        const url = await getDownloadURL(task.snapshot.ref)
        resolve({ url, storageKey })
      }
    )
  })
}

export async function uploadCoverPhoto(
  nailistId: string,
  file: File,
  onProgress?: (percent: number) => void
): Promise<{ url: string; storageKey: string }> {
  const storage = await getStorage()
  const ext = file.name.split('.').pop() ?? 'jpg'
  const storageKey = `covers/${nailistId}/cover.${ext}`
  const storageRef = ref(storage, storageKey)

  return new Promise((resolve, reject) => {
    const task = uploadBytesResumable(storageRef, file, { contentType: file.type })
    task.on(
      'state_changed',
      (snapshot) => {
        const percent = (snapshot.bytesTransferred / snapshot.totalBytes) * 100
        onProgress?.(Math.round(percent))
      },
      reject,
      async () => {
        const url = await getDownloadURL(task.snapshot.ref)
        resolve({ url, storageKey })
      }
    )
  })
}

export async function deleteStorageFile(storageKey: string) {
  const storage = await getStorage()
  await deleteObject(ref(storage, storageKey))
}
