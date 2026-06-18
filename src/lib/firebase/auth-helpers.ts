'use client'

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  signOut,
  updateProfile,
  type User,
} from 'firebase/auth'
import { initFirebase } from './client'

const googleProvider = new GoogleAuthProvider()

async function requireAuth() {
  const clients = await initFirebase()
  if (!clients) throw new Error('Firebase Auth is not initialized. Check your environment variables.')
  return clients.auth
}

export async function signInWithEmail(email: string, password: string) {
  return signInWithEmailAndPassword(await requireAuth(), email, password)
}

export async function signUpWithEmail(email: string, password: string, displayName: string) {
  const a = await requireAuth()
  const cred = await createUserWithEmailAndPassword(a, email, password)
  await updateProfile(cred.user, { displayName })
  return cred
}

// Initiates Google redirect — navigates away, returns nothing useful
export async function signInWithGoogle() {
  return signInWithRedirect(await requireAuth(), googleProvider)
}

// Call this on page mount to retrieve the result after the redirect returns
export async function getGoogleRedirectResult() {
  return getRedirectResult(await requireAuth())
}

export async function signOutUser() {
  return signOut(await requireAuth())
}

export async function getIdToken(user: User) {
  return user.getIdToken()
}

export async function resetPassword(email: string) {
  const { sendPasswordResetEmail } = await import('firebase/auth')
  return sendPasswordResetEmail(await requireAuth(), email)
}
