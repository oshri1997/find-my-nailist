import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase/admin'
import { COLLECTIONS } from '@/lib/firebase/collections'
import { verifyAdmin, adminUnauthorized } from '@/lib/admin-auth'

export async function GET(request: NextRequest) {
  if (!await verifyAdmin(request)) return adminUnauthorized()

  const db = adminDb()
  const { searchParams } = new URL(request.url)
  const search = searchParams.get('search')?.toLowerCase() ?? ''

  const usersSnap = await db.collection(COLLECTIONS.USERS).orderBy('createdAt', 'desc').limit(200).get()

  const users = usersSnap.docs.map(d => {
    const data = d.data()
    return {
      id: d.id,
      email: data.email ?? '',
      displayName: data.displayName ?? '',
      photoUrl: data.photoUrl ?? null,
      role: data.role ?? 'CLIENT',
      createdAt: data.createdAt?.toDate?.()?.toISOString() ?? null,
    }
  }).filter(u => {
    if (!search) return true
    return u.email.includes(search) || u.displayName.toLowerCase().includes(search)
  })

  return NextResponse.json({ data: users })
}
