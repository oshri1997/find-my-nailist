import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase/admin'
import { COLLECTIONS } from '@/lib/firebase/collections'
import { FieldValue } from 'firebase-admin/firestore'

type Params = { params: Promise<{ nailistId: string }> }

async function getUid(request: NextRequest): Promise<string | null> {
  const token = request.cookies.get('auth-token')?.value
  if (!token) return null
  try {
    const decoded = await adminAuth().verifyIdToken(token)
    return decoded.uid
  } catch {
    return null
  }
}

export async function GET(request: NextRequest, { params }: Params) {
  const uid = await getUid(request)
  if (!uid) return NextResponse.json({ data: { isFavorited: false } })

  const { nailistId } = await params
  const db = adminDb()
  const doc = await db.collection(COLLECTIONS.FAVORITES).doc(`${uid}_${nailistId}`).get()
  return NextResponse.json({ data: { isFavorited: doc.exists } })
}

export async function POST(request: NextRequest, { params }: Params) {
  const uid = await getUid(request)
  if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { nailistId } = await params
  const db = adminDb()
  await db.collection(COLLECTIONS.FAVORITES).doc(`${uid}_${nailistId}`).set({
    userId: uid,
    nailistProfileId: nailistId,
    createdAt: FieldValue.serverTimestamp(),
  })
  return NextResponse.json({ data: { isFavorited: true } })
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const uid = await getUid(request)
  if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { nailistId } = await params
  const db = adminDb()
  await db.collection(COLLECTIONS.FAVORITES).doc(`${uid}_${nailistId}`).delete()
  return NextResponse.json({ data: { isFavorited: false } })
}
