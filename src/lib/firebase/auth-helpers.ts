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
import { auth } from './client'

const googleProvider = new GoogleAuthProvider()

function requireAuth() {
  if (!auth) throw new Error('Firebase Auth is not initialized. Check your environment variables.')
  return auth
}

export async function signInWithEmail(email: string, password: string) {
  return signInWithEmailAndPassword(requireAuth(), email, password)
}

export async function signUpWithEmail(email: string, password: string, displayName: string) {
  const cred = await createUserWithEmailAndPassword(requireAuth(), email, password)
  await updateProfile(cred.user, { displayName })
  return cred
}

export async function signInWithGoogle() {
  return signInWithPopup(requireAuth(), googleProvider)
}

export async function signOutUser() {
  return signOut(requireAuth())
}

export async function getIdToken(user: User) {
  return user.getIdToken()
}
