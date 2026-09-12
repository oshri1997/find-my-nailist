import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase/admin'
import { COLLECTIONS } from '@/lib/firebase/collections'
import { FieldValue } from 'firebase-admin/firestore'
import { MAX_PORTFOLIO_PHOTOS } from '@/lib/portfolio'
import { assertCompletedUpload, UploadError } from '@/lib/upload-guard'

function isOwnedPortfolioKey(key: unknown, profileId: string): key is string {
  if (typeof key !== 'string') return false
  const escapedProfileId = profileId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`^portfolio/${escapedProfileId}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\\.(png|jpg|webp)$`, 'i').test(key)
}

function isPortfolioUploadUrl(value: unknown, storageKey: string): value is string {
  if (typeof value !== 'string') return false
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:' || url.hostname !== 'firebasestorage.googleapis.com') return false
    const match = /^\/v0\/b\/[^/]+\/o\/(.+)$/.exec(url.pathname)
    return !!match
      && decodeURIComponent(match[1]) === storageKey
      && url.searchParams.get('alt') === 'media'
      && /^[0-9a-f-]{36}$/i.test(url.searchParams.get('token') ?? '')
  } catch { return false }
}

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
    if (!nailistProfileId || !url || !storageKey) {
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

    if (!isOwnedPortfolioKey(storageKey, nailistProfileId) || !isPortfolioUploadUrl(url, storageKey)) {
      return NextResponse.json({ error: 'Invalid portfolio upload' }, { status: 400 })
    }

    try {
      await assertCompletedUpload(decoded.uid, storageKey)
    } catch (error) {
      if (error instanceof UploadError) return NextResponse.json({ error: error.message }, { status: error.status })
      throw error
    }

    const photos = db.collection(COLLECTIONS.PORTFOLIO_PHOTOS)
    const photoRef = photos.doc()
    const photo = {
      nailistProfileId,
      url,
      storageKey,
      caption: caption ?? null,
      displayOrder: displayOrder ?? 0,
      createdAt: FieldValue.serverTimestamp(),
    }

    // Transaction reads the full profile query before creating a new photo.
    // Firestore retries conflicting requests, so parallel requests cannot both
    // pass the 20-photo check. A counter would require a migration/backfill;
    // this query is already canonical for legacy and current profiles.
    try {
      await db.runTransaction(async transaction => {
        const existingSnap = await transaction.get(photos.where('nailistProfileId', '==', nailistProfileId))
        if (existingSnap.docs.length >= MAX_PORTFOLIO_PHOTOS) throw new UploadError('Portfolio photo limit reached', 409)
        if (existingSnap.docs.some(doc => doc.data().storageKey === storageKey)) throw new UploadError('Portfolio upload already used', 409)
        transaction.create(photoRef, photo)
      })
    } catch (error) {
      if (error instanceof UploadError) return NextResponse.json({ error: error.message }, { status: error.status })
      throw error
    }

    return NextResponse.json({ data: { id: photoRef.id, nailistProfileId, url, storageKey, caption, displayOrder } }, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to save photo' }, { status: 500 })
  }
}
