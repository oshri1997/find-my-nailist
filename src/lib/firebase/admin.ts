import { initializeApp, getApps, cert, App } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'
import { getStorage } from 'firebase-admin/storage'

let adminApp: App

function getAdminApp(): App {
  if (adminApp) return adminApp

  if (getApps().length > 0) {
    adminApp = getApps()[0]
    return adminApp
  }

  adminApp = initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  })

  return adminApp
}

export const adminAuth = () => getAuth(getAdminApp())
export const adminDb = () => getFirestore(getAdminApp())
export const adminStorage = () => getStorage(getAdminApp())
