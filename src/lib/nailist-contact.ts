import { NextRequest } from 'next/server'
import { adminAuth } from '@/lib/firebase/admin'

// Fields only returned to authenticated callers — keeps the profile itself
// public for SEO while forcing anonymous visitors through login to see them.
const CONTACT_FIELDS = ['whatsappPhone', 'instagramUrl', 'tiktokUrl', 'phoneNumber', 'email', 'address', 'userId'] as const

export async function isAuthenticatedRequest(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get('auth-token')?.value
  if (!token) return false
  try {
    await adminAuth().verifyIdToken(token)
    return true
  } catch {
    return false
  }
}

// Computed BEFORE stripping so anonymous callers can still know a nailist has
// contact info (to show a "log in to view" prompt) without receiving it.
export function computeHasContactInfo(profileData: Record<string, unknown>): boolean {
  return !!(profileData.whatsappPhone || profileData.instagramUrl || profileData.tiktokUrl || profileData.phoneNumber)
}

export function stripNailistContactFields(profileData: Record<string, unknown>): void {
  for (const field of CONTACT_FIELDS) delete profileData[field]
}
