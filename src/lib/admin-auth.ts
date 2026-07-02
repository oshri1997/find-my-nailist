import { NextRequest, NextResponse } from 'next/server'
import { adminAuth } from '@/lib/firebase/admin'
import { ADMIN_EMAIL } from '@/lib/constants'

export { ADMIN_EMAIL }

export async function verifyAdmin(request: NextRequest): Promise<{ uid: string; email: string } | null> {
  const token = request.cookies.get('auth-token')?.value
  if (!token) return null
  try {
    const decoded = await adminAuth().verifyIdToken(token)
    if (decoded.email !== ADMIN_EMAIL) return null
    return { uid: decoded.uid, email: decoded.email }
  } catch {
    return null
  }
}

export function adminUnauthorized() {
  return NextResponse.json({ error: 'אין הרשאה' }, { status: 403 })
}
