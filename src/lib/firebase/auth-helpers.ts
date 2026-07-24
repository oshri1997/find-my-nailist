'use client'

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
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

export async function signInWithGoogle() {
  return signInWithPopup(await requireAuth(), googleProvider)
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

// Verifies an oobCode from a password-reset email link and returns the
// account email it belongs to — used by our own /reset-password page so we
// can enforce the same 8-character minimum as signup, instead of Firebase's
// default hosted reset page (which only enforces 6).
export async function verifyResetCode(oobCode: string): Promise<string> {
  const { verifyPasswordResetCode } = await import('firebase/auth')
  return verifyPasswordResetCode(await requireAuth(), oobCode)
}

export async function confirmReset(oobCode: string, newPassword: string) {
  const { confirmPasswordReset } = await import('firebase/auth')
  return confirmPasswordReset(await requireAuth(), oobCode, newPassword)
}
