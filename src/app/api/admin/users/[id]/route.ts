import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase/admin'
import { COLLECTIONS } from '@/lib/firebase/collections'
import { verifyAdmin, adminUnauthorized } from '@/lib/admin-auth'
import { FieldValue } from 'firebase-admin/firestore'

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

    const role = userDoc.data()?.role

    if (role === 'ADMIN') {
      return NextResponse.json({ error: 'לא ניתן למחוק חשבון אדמין' }, { status: 403 })
    }

    if (role === 'NAILIST') {
      const profileSnap = await db.collection(COLLECTIONS.NAILIST_PROFILES)
        .where('userId', '==', id).limit(1).get()

      if (!profileSnap.empty) {
        const profileId = profileSnap.docs[0].id

        const [servicesSnap, photosSnap, hoursSnap, appointmentsSnap, reviewsSnap] = await Promise.all([
          db.collection(COLLECTIONS.SERVICES).where('nailistProfileId', '==', profileId).get(),
          db.collection(COLLECTIONS.PORTFOLIO_PHOTOS).where('nailistProfileId', '==', profileId).get(),
          db.collection(COLLECTIONS.WORKING_HOURS).where('nailistProfileId', '==', profileId).get(),
          db.collection(COLLECTIONS.APPOINTMENTS).where('nailistProfileId', '==', profileId).get(),
          db.collection(COLLECTIONS.REVIEWS).where('nailistProfileId', '==', profileId).get(),
        ])

        const batch = db.batch()
        ;[...servicesSnap.docs, ...photosSnap.docs, ...hoursSnap.docs,
          ...appointmentsSnap.docs, ...reviewsSnap.docs].forEach(d => batch.delete(d.ref))
        batch.delete(profileSnap.docs[0].ref)
        await batch.commit()
      }
    } else {
      const profileSnap = await db.collection(COLLECTIONS.CLIENT_PROFILES)
        .where('userId', '==', id).limit(1).get()

      if (!profileSnap.empty) {
        const profileId = profileSnap.docs[0].id
        const appointmentsSnap = await db.collection(COLLECTIONS.APPOINTMENTS)
          .where('clientProfileId', '==', profileId).get()
        const batch = db.batch()
        appointmentsSnap.docs.forEach(d => batch.delete(d.ref))
        batch.delete(profileSnap.docs[0].ref)
        await batch.commit()
      }
    }

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
