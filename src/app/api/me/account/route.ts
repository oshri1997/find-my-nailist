import { NextRequest, NextResponse } from 'next/server'
import { adminAuth } from '@/lib/firebase/admin'
import { deleteUserCascade } from '@/lib/admin-user-actions'

// Self-service account deletion — reuses the same cascading delete the admin
// panel uses (Firestore profile + related docs, storage, Firebase Auth
// user), with the caller as their own "actor" for the audit log. The client
// must have already re-authenticated (fresh password or Google popup) before
// calling this — deleteUserCascade itself has no way to verify that, since
// it only sees a valid ID token, not how recently the user proved it.
export async function DELETE(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let decoded: { uid: string; email?: string }
  try {
    decoded = await adminAuth().verifyIdToken(token)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await deleteUserCascade(decoded.uid, { uid: decoded.uid, email: decoded.email ?? '' })
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })
    return NextResponse.json({ message: 'החשבון נמחק בהצלחה' })
  } catch (err) {
    console.error('[me/account] delete error:', err)
    return NextResponse.json({ error: 'שגיאה במחיקת החשבון' }, { status: 500 })
  }
}
