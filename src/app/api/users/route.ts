import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase/admin'
import { COLLECTIONS } from '@/lib/firebase/collections'
import { z } from 'zod'
import { FieldValue } from 'firebase-admin/firestore'

const createUserSchema = z.object({
  uid: z.string(),
  email: z.string().email(),
  displayName: z.string().optional(),
  photoUrl: z.string().url().optional(),
  role: z.enum(['CLIENT', 'NAILIST']).default('CLIENT'),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = createUserSchema.parse(body)
    const db = adminDb()

    const userRef = db.collection(COLLECTIONS.USERS).doc(data.uid)
    const snap = await userRef.get()

    if (snap.exists) {
      return NextResponse.json({ data: { id: snap.id, ...snap.data() } })
    }

    const now = FieldValue.serverTimestamp()
    await userRef.set({ ...data, createdAt: now, updatedAt: now })

    if (data.role === 'NAILIST') {
      await db.collection(COLLECTIONS.NAILIST_PROFILES).add({
        userId: data.uid,
        businessName: data.displayName ?? 'My Nail Studio',
        isActive: true,
        isVerified: false,
        avgRating: 0,
        reviewCount: 0,
        createdAt: now,
        updatedAt: now,
      })
    } else {
      await db.collection(COLLECTIONS.CLIENT_PROFILES).add({
        userId: data.uid,
        createdAt: now,
        updatedAt: now,
      })
    }

    return NextResponse.json({ data: { id: data.uid, ...data } }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    console.error('POST /api/users error:', error)
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
  }
}
