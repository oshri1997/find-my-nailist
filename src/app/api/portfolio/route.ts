import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase/admin'
import { COLLECTIONS } from '@/lib/firebase/collections'
import { FieldValue } from 'firebase-admin/firestore'

export async function GET(request: NextRequest) {
  try {
    const profileId = new URL(request.url).searchParams.get('profileId')
    if (!profileId) return NextResponse.json({ error: 'Missing profileId' }, { status: 400 })

    const snap = await adminDb()
      .collection(COLLECTIONS.PORTFOLIO_PHOTOS)
      .where('nailistProfileId', '==', profileId)
      .get()

    const photos = snap.docs
      .map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) }))
      .sort((a, b) => ((a.displayOrder as number) ?? 0) - ((b.displayOrder as number) ?? 0))

    return NextResponse.json({ data: photos })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch portfolio' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { nailistProfileId, url, storageKey, caption, displayOrder } = await request.json()
    if (!nailistProfileId || !url) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const ref = await adminDb().collection(COLLECTIONS.PORTFOLIO_PHOTOS).add({
      nailistProfileId,
      url,
      storageKey: storageKey ?? null,
      caption: caption ?? null,
      displayOrder: displayOrder ?? 0,
      createdAt: FieldValue.serverTimestamp(),
    })

    return NextResponse.json({ data: { id: ref.id, nailistProfileId, url, storageKey, caption, displayOrder } }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Failed to save photo' }, { status: 500 })
  }
}
