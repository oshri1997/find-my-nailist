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

// Whether this account can authenticate with a password at all — a
// Google-only sign-in has no password to change or re-confirm with.
export function hasPasswordProvider(user: User): boolean {
  return user.providerData.some((p) => p.providerId === 'password')
}

// Firebase requires a *recent* sign-in before allowing a security-sensitive
// change (password update, account deletion) — re-authenticating with the
// current password proves that within this request.
export async function reauthenticateWithPassword(password: string) {
  const a = await requireAuth()
  const user = a.currentUser
  if (!user?.email) throw new Error('No signed-in user')
  const { EmailAuthProvider, reauthenticateWithCredential } = await import('firebase/auth')
  await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, password))
}

// Same "recent sign-in" requirement, for accounts with no password on file —
// re-running the Google popup stands in for re-entering a password.
export async function reauthenticateWithGoogle() {
  const a = await requireAuth()
  const user = a.currentUser
  if (!user) throw new Error('No signed-in user')
  const { reauthenticateWithPopup } = await import('firebase/auth')
  await reauthenticateWithPopup(user, googleProvider)
}

export async function changePassword(currentPassword: string, newPassword: string) {
  await reauthenticateWithPassword(currentPassword)
  const a = await requireAuth()
  const { updatePassword } = await import('firebase/auth')
  await updatePassword(a.currentUser!, newPassword)
}
