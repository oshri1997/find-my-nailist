import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb, adminStorage } from '@/lib/firebase/admin'
import { COLLECTIONS } from '@/lib/firebase/collections'
import { verifyAdmin, adminUnauthorized } from '@/lib/admin-auth'
import { FieldValue } from 'firebase-admin/firestore'

// Portfolio photo docs store their own storageKey, but the profile
// avatar/cover fields are plain download URLs — the storage path is embedded
// in them as the `/o/<encoded-path>` segment.
function storageKeyFromUrl(url?: string | null): string | null {
  if (!url) return null
  const match = url.match(/\/o\/([^?]+)/)
  if (!match) return null
  try {
    return decodeURIComponent(match[1])
  } catch {
    return null
  }
}

async function deleteStorageKeys(keys: (string | null | undefined)[]) {
  const bucket = adminStorage().bucket()
  await Promise.all(
    keys.filter((k): k is string => !!k).map((key) =>
      bucket.file(key).delete({ ignoreNotFound: true }).catch(() => {})
    )
  )
}

async function recalculateNailistRating(nailistProfileId: string) {
  const db = adminDb()
  const remainingSnap = await db.collection(COLLECTIONS.REVIEWS)
    .where('nailistProfileId', '==', nailistProfileId).get()
  const count = remainingSnap.size
  const avg = count > 0
    ? remainingSnap.docs.reduce((sum, d) => sum + (d.data().rating ?? 0), 0) / count
    : 0
  await db.collection(COLLECTIONS.NAILIST_PROFILES).doc(nailistProfileId).update({
    avgRating: Math.round(avg * 10) / 10,
    reviewCount: count,
    updatedAt: FieldValue.serverTimestamp(),
  })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await verifyAdmin(request)) return adminUnauthorized()

  const { id } = await params
  const body = await request.json()
  const newRole: string = body.role

  if (!['CLIENT', 'NAILIST'].includes(newRole)) {
    return NextResponse.json({ error: 'תפקיד לא תקין' }, { status: 400 })
  }

  const db = adminDb()
  const userDoc = await db.collection(COLLECTIONS.USERS).doc(id).get()
  if (!userDoc.exists) return NextResponse.json({ error: 'משתמש לא נמצא' }, { status: 404 })

  const currentRole = userDoc.data()?.role

  // If demoting from NAILIST → CLIENT, hide the nailist profile from search
  if (currentRole === 'NAILIST' && newRole === 'CLIENT') {
    const profileSnap = await db.collection(COLLECTIONS.NAILIST_PROFILES)
      .where('userId', '==', id).limit(1).get()
    if (!profileSnap.empty) {
      await profileSnap.docs[0].ref.update({ isActive: false, updatedAt: FieldValue.serverTimestamp() })
    }
  }

  await db.collection(COLLECTIONS.USERS).doc(id).update({ role: newRole })
  return NextResponse.json({ message: 'התפקיד עודכן בהצלחה' })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await verifyAdmin(request)) return adminUnauthorized()

  const { id } = await params
  const db = adminDb()

  try {
    const userDoc = await db.collection(COLLECTIONS.USERS).doc(id).get()
    if (!userDoc.exists) return NextResponse.json({ error: 'משתמש לא נמצא' }, { status: 404 })

    const userData = userDoc.data()
    const role = userData?.role

    if (userData?.isAdmin === true) {
      return NextResponse.json({ error: 'לא ניתן למחוק חשבון אדמין' }, { status: 403 })
    }

    const storageKeysToDelete: (string | null | undefined)[] = []

    if (role === 'NAILIST') {
      const profileSnap = await db.collection(COLLECTIONS.NAILIST_PROFILES)
        .where('userId', '==', id).limit(1).get()

      if (!profileSnap.empty) {
        const profileId = profileSnap.docs[0].id
        const profileData = profileSnap.docs[0].data()
        storageKeysToDelete.push(
          storageKeyFromUrl(profileData.photoUrl),
          storageKeyFromUrl(profileData.coverPhotoUrl)
        )

        const [servicesSnap, photosSnap, hoursSnap, appointmentsSnap, reviewsSnap, favoritedBySnap] = await Promise.all([
          db.collection(COLLECTIONS.SERVICES).where('nailistProfileId', '==', profileId).get(),
          db.collection(COLLECTIONS.PORTFOLIO_PHOTOS).where('nailistProfileId', '==', profileId).get(),
          db.collection(COLLECTIONS.WORKING_HOURS).where('nailistProfileId', '==', profileId).get(),
          db.collection(COLLECTIONS.APPOINTMENTS).where('nailistProfileId', '==', profileId).get(),
          db.collection(COLLECTIONS.REVIEWS).where('nailistProfileId', '==', profileId).get(),
          // Other users' favorites pointing at this now-deleted profile.
          db.collection(COLLECTIONS.FAVORITES).where('nailistProfileId', '==', profileId).get(),
        ])

        photosSnap.docs.forEach(d => storageKeysToDelete.push(d.data().storageKey))

        const batch = db.batch()
        ;[...servicesSnap.docs, ...photosSnap.docs, ...hoursSnap.docs,
          ...appointmentsSnap.docs, ...reviewsSnap.docs, ...favoritedBySnap.docs].forEach(d => batch.delete(d.ref))
        batch.delete(profileSnap.docs[0].ref)
        await batch.commit()
      }
    } else {
      const profileSnap = await db.collection(COLLECTIONS.CLIENT_PROFILES)
        .where('userId', '==', id).limit(1).get()

      if (!profileSnap.empty) {
        const profileId = profileSnap.docs[0].id
        const profileData = profileSnap.docs[0].data()
        storageKeysToDelete.push(storageKeyFromUrl(profileData.photoUrl))

        const [appointmentsSnap, reviewsSnap] = await Promise.all([
          db.collection(COLLECTIONS.APPOINTMENTS).where('clientProfileId', '==', profileId).get(),
          // Reviews this client wrote about various nailists — deleted below,
          // then each affected nailist's avgRating/reviewCount is recalculated.
          db.collection(COLLECTIONS.REVIEWS).where('clientProfileId', '==', profileId).get(),
        ])
        const affectedNailistIds = [...new Set(reviewsSnap.docs.map(d => d.data().nailistProfileId as string))]

        const batch = db.batch()
        ;[...appointmentsSnap.docs, ...reviewsSnap.docs].forEach(d => batch.delete(d.ref))
        batch.delete(profileSnap.docs[0].ref)
        await batch.commit()

        await Promise.all(affectedNailistIds.map(recalculateNailistRating))
      }
    }

    // This user's own favorites list, regardless of role.
    const ownFavoritesSnap = await db.collection(COLLECTIONS.FAVORITES).where('userId', '==', id).get()
    if (!ownFavoritesSnap.empty) {
      const favBatch = db.batch()
      ownFavoritesSnap.docs.forEach(d => favBatch.delete(d.ref))
      await favBatch.commit()
    }

    // Profile photo storage path is keyed by uid, shared between roles.
    storageKeysToDelete.push(storageKeyFromUrl(userData?.photoUrl))
    await deleteStorageKeys(storageKeysToDelete)

    await db.collection(COLLECTIONS.USERS).doc(id).delete()

    try {
      await adminAuth().deleteUser(id)
    } catch {
      // Firebase Auth user may not exist — Firestore cleanup already done
    }

    return NextResponse.json({ message: 'המשתמש נמחק בהצלחה' })
  } catch (err) {
    console.error('[admin] delete user error:', err)
    return NextResponse.json({ error: 'שגיאה במחיקת המשתמש' }, { status: 500 })
  }
}
