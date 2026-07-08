import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase/admin'
import { COLLECTIONS } from '@/lib/firebase/collections'
import { verifyAdmin, adminUnauthorized } from '@/lib/admin-auth'
import { writeAuditLog } from '@/lib/audit-log'
import { deleteUserCascade } from '@/lib/admin-user-actions'
import { FieldValue } from 'firebase-admin/firestore'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await verifyAdmin(request)
  if (!admin) return adminUnauthorized()

  const { id } = await params
  const body = await request.json()
  const newRole: string = body.role

  if (!['CLIENT', 'NAILIST', 'ADMIN'].includes(newRole)) {
    return NextResponse.json({ error: 'תפקיד לא תקין' }, { status: 400 })
  }

  const db = adminDb()
  const userDoc = await db.collection(COLLECTIONS.USERS).doc(id).get()
  if (!userDoc.exists) return NextResponse.json({ error: 'משתמש לא נמצא' }, { status: 404 })

  const userData = userDoc.data()
  const currentRole = userData?.role

  // A pure-admin account's role can't be changed away from ADMIN through
  // this generic endpoint — this route never touches the isAdmin flag, so
  // demoting the role here would leave a confusing isAdmin:true + role:CLIENT
  // hybrid instead of cleanly revoking admin access.
  if (currentRole === 'ADMIN' && newRole !== 'ADMIN') {
    return NextResponse.json({ error: 'לא ניתן להסיר תפקיד אדמין דרך מסך זה' }, { status: 403 })
  }

  // If moving away from NAILIST (demoting to CLIENT, or promoting to ADMIN),
  // hide the nailist profile from search.
  if (currentRole === 'NAILIST' && newRole !== 'NAILIST') {
    const profileSnap = await db.collection(COLLECTIONS.NAILIST_PROFILES)
      .where('userId', '==', id).limit(1).get()
    if (!profileSnap.empty) {
      await profileSnap.docs[0].ref.update({ isActive: false, updatedAt: FieldValue.serverTimestamp() })
    }
  }

  const updates: Record<string, unknown> = { role: newRole }
  // Promoting to ADMIN grants actual admin-panel access — role alone
  // (checked by client-side routing/onboarding) doesn't gate /admin, isAdmin
  // (checked by verifyAdmin()) does.
  if (newRole === 'ADMIN') updates.isAdmin = true

  await db.collection(COLLECTIONS.USERS).doc(id).update(updates)

  await writeAuditLog({
    actorUid: admin.uid,
    actorEmail: admin.email,
    action: 'USER_ROLE_CHANGE',
    targetType: 'user',
    targetId: id,
    metadata: { targetEmail: userData?.email, oldRole: currentRole, newRole },
  })

  return NextResponse.json({ message: 'התפקיד עודכן בהצלחה' })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await verifyAdmin(request)
  if (!admin) return adminUnauthorized()

  const { id } = await params

  try {
    const result = await deleteUserCascade(id, admin)
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })
    return NextResponse.json({ message: 'המשתמש נמחק בהצלחה' })
  } catch (err) {
    console.error('[admin] delete user error:', err)
    return NextResponse.json({ error: 'שגיאה במחיקת המשתמש' }, { status: 500 })
  }
}
