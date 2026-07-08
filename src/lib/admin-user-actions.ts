import { adminAuth, adminDb, adminStorage } from '@/lib/firebase/admin'
import { COLLECTIONS } from '@/lib/firebase/collections'
import { writeAuditLog } from '@/lib/audit-log'
import { FieldValue } from 'firebase-admin/firestore'

export type AdminActionResult = { ok: true } | { ok: false; error: string; status: number }

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

// Full cascading delete of a user account and everything connected to it —
// shared by the single-user DELETE route and the bulk-action route so the
// (substantial) cascade logic lives in exactly one place.
export async function deleteUserCascade(
  id: string,
  admin: { uid: string; email: string }
): Promise<AdminActionResult> {
  const db = adminDb()

  const userDoc = await db.collection(COLLECTIONS.USERS).doc(id).get()
  if (!userDoc.exists) return { ok: false, error: 'משתמש לא נמצא', status: 404 }

  const userData = userDoc.data()
  const role = userData?.role

  if (userData?.isAdmin === true) {
    return { ok: false, error: 'לא ניתן למחוק חשבון אדמין', status: 403 }
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

  await writeAuditLog({
    actorUid: admin.uid,
    actorEmail: admin.email,
    action: 'USER_DELETE',
    targetType: 'user',
    targetId: id,
    metadata: { email: userData?.email, role, displayName: userData?.displayName },
  })

  return { ok: true }
}

// Suspends/unsuspends a user: blocks new sign-ins via Firebase Auth's native
// `disabled` flag (shows Firebase's own "auth/user-disabled" error on the
// login page — no extra client code needed for that path), and blocks an
// already-signed-in session via the `suspended` Firestore flag checked in
// /api/auth/session on the next token refresh.
export async function setUserSuspended(
  id: string,
  suspended: boolean,
  admin: { uid: string; email: string }
): Promise<AdminActionResult> {
  const db = adminDb()
  const userDoc = await db.collection(COLLECTIONS.USERS).doc(id).get()
  if (!userDoc.exists) return { ok: false, error: 'משתמש לא נמצא', status: 404 }

  const userData = userDoc.data()
  if (userData?.isAdmin === true) {
    return { ok: false, error: 'לא ניתן להשעות חשבון אדמין', status: 403 }
  }
  if (id === admin.uid) {
    return { ok: false, error: 'לא ניתן להשעות את החשבון שלך', status: 403 }
  }

  await db.collection(COLLECTIONS.USERS).doc(id).update({
    suspended,
    updatedAt: FieldValue.serverTimestamp(),
  })

  try {
    await adminAuth().updateUser(id, { disabled: suspended })
  } catch {
    // Firebase Auth user may not exist — Firestore flag is still authoritative
  }

  await writeAuditLog({
    actorUid: admin.uid,
    actorEmail: admin.email,
    action: suspended ? 'USER_SUSPEND' : 'USER_UNSUSPEND',
    targetType: 'user',
    targetId: id,
    metadata: { email: userData?.email },
  })

  return { ok: true }
}
