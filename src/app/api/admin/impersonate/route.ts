import { NextRequest, NextResponse } from 'next/server'
import { adminAuth } from '@/lib/firebase/admin'
import { verifyAdmin, adminUnauthorized } from '@/lib/admin-auth'

export async function POST(request: NextRequest) {
  if (!await verifyAdmin(request)) return adminUnauthorized()

  const { uid } = await request.json()
  if (!uid || typeof uid !== 'string') {
    return NextResponse.json({ error: 'uid required' }, { status: 400 })
  }

  try {
    const customToken = await adminAuth().createCustomToken(uid)
    return NextResponse.json({ customToken })
  } catch {
    return NextResponse.json({ error: 'Failed to create token' }, { status: 500 })
  }
}
