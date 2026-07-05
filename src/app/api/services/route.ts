import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase/admin'
import { COLLECTIONS } from '@/lib/firebase/collections'
import { z } from 'zod'
import { FieldValue } from 'firebase-admin/firestore'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const nailistProfileId = searchParams.get('nailistProfileId')
    if (!nailistProfileId) {
      return NextResponse.json({ error: 'nailistProfileId is required' }, { status: 400 })
    }

    const db = adminDb()
    const snap = await db
      .collection(COLLECTIONS.SERVICES)
      .where('nailistProfileId', '==', nailistProfileId)
      .where('isActive', '==', true)
      .get()

    const services = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
    return NextResponse.json({ data: services })
  } catch (error) {
    console.error('GET /api/services error:', error)
    return NextResponse.json({ error: 'Failed to fetch services' }, { status: 500 })
  }
}

const createSchema = z.object({
  nailistProfileId: z.string(),
  name: z.string().min(1),
  description: z.string().optional(),
  durationMinutes: z.number().int().min(15),
  price: z.number().min(0),
  currency: z.string().default('USD'),
})

export async function POST(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let decoded: { uid: string }
  try {
    decoded = await adminAuth().verifyIdToken(token)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const data = createSchema.parse(body)
    const db = adminDb()

    // Verify caller owns the nailist profile
    const nailistSnap = await db
      .collection(COLLECTIONS.NAILIST_PROFILES)
      .where('userId', '==', decoded.uid)
      .limit(1)
      .get()
    const ownedProfileId = nailistSnap.empty ? null : nailistSnap.docs[0].id
    if (!ownedProfileId || ownedProfileId !== data.nailistProfileId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const now = FieldValue.serverTimestamp()
    const ref = await db.collection(COLLECTIONS.SERVICES).add({
      ...data,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    })

    return NextResponse.json({ data: { id: ref.id, ...data, isActive: true } }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    console.error('POST /api/services error:', error)
    return NextResponse.json({ error: 'Failed to create service' }, { status: 500 })
  }
}
