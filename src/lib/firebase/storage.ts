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
  file: File
): Promise<{ url: string; storageKey: string }> {
  const storage = await getStorage()
  const ext = file.name.split('.').pop() ?? 'jpg'
  const storageKey = `avatars/${userId}/profile.${ext}`
  const storageRef = ref(storage, storageKey)
  await uploadBytesResumable(storageRef, file, { contentType: file.type })
  const url = await getDownloadURL(storageRef)
  return { url, storageKey }
}

export async function deleteStorageFile(storageKey: string) {
  const storage = await getStorage()
  await deleteObject(ref(storage, storageKey))
}
