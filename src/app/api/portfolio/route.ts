import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase/admin'
import { COLLECTIONS } from '@/lib/firebase/collections'
import { FieldValue } from 'firebase-admin/firestore'
import { MAX_PORTFOLIO_PHOTOS } from '@/lib/portfolio'

export async function GET(request: NextRequest) {
  try {
    const profileId = new URL(request.url).searchParams.get('profileId')
    if (!profileId) return NextResponse.json({ error: 'Missing profileId' }, { status: 400 })

    const snap = await adminDb()
      .collection(COLLECTIONS.PORTFOLIO_PHOTOS)
      .where('nailistProfileId', '==', profileId)
      .get()

    const photos = (snap.docs
      .map((d) => ({ id: d.id, ...d.data() })) as Array<Record<string, unknown>>)
      .sort((a, b) => ((a['displayOrder'] as number) ?? 0) - ((b['displayOrder'] as number) ?? 0))

    return NextResponse.json({ data: photos })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to fetch portfolio' }, { status: 500 })
  }
}

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
    const { nailistProfileId, url, storageKey, caption, displayOrder } = await request.json()
    if (!nailistProfileId || !url) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const db = adminDb()

    // Verify caller owns the nailist profile
    const nailistSnap = await db
      .collection(COLLECTIONS.NAILIST_PROFILES)
      .where('userId', '==', decoded.uid)
      .limit(1)
      .get()
    const ownedProfileId = nailistSnap.empty ? null : nailistSnap.docs[0].id
    if (!ownedProfileId || ownedProfileId !== nailistProfileId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Authoritative check — the upload UI already stops at the limit, but
    // that's only a courtesy; a direct API call must not be able to bypass it.
    const existingSnap = await db
      .collection(COLLECTIONS.PORTFOLIO_PHOTOS)
      .where('nailistProfileId', '==', nailistProfileId)
      .get()
    if (existingSnap.docs.length >= MAX_PORTFOLIO_PHOTOS) {
      return NextResponse.json({ error: 'Portfolio photo limit reached' }, { status: 409 })
    }

    const ref = await db.collection(COLLECTIONS.PORTFOLIO_PHOTOS).add({
      nailistProfileId,
      url,
      storageKey: storageKey ?? null,
      caption: caption ?? null,
      displayOrder: displayOrder ?? 0,
      createdAt: FieldValue.serverTimestamp(),
    })

    return NextResponse.json({ data: { id: ref.id, nailistProfileId, url, storageKey, caption, displayOrder } }, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to save photo' }, { status: 500 })
  }
}
