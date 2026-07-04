import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase/admin'
import { COLLECTIONS } from '@/lib/firebase/collections'
import { verifyAdmin, adminUnauthorized } from '@/lib/admin-auth'

export async function GET(request: NextRequest) {
  if (!await verifyAdmin(request)) return adminUnauthorized()

  const db = adminDb()
  const { searchParams } = new URL(request.url)
  const search = searchParams.get('search')?.toLowerCase() ?? ''

  // A search term must scan the full collection — capping at 200 before
  // filtering would silently miss any match outside the most-recent window.
  const usersQuery = search
    ? db.collection(COLLECTIONS.USERS).orderBy('createdAt', 'desc')
    : db.collection(COLLECTIONS.USERS).orderBy('createdAt', 'desc').limit(200)
  const usersSnap = await usersQuery.get()

  const users = usersSnap.docs.map(d => {
    const data = d.data()
    return {
      id: d.id,
      email: data.email ?? '',
      displayName: data.displayName ?? '',
      photoUrl: data.photoUrl ?? null,
      role: data.role ?? 'CLIENT',
      isAdmin: data.isAdmin === true,
      createdAt: data.createdAt?.toDate?.()?.toISOString() ?? null,
    }
  }).filter(u => {
    if (!search) return true
    return u.email.includes(search) || u.displayName.toLowerCase().includes(search)
  })

  return NextResponse.json({ data: users })
}
