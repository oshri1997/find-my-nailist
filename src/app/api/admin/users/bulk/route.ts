import { NextRequest, NextResponse } from 'next/server'
import { verifyAdmin, adminUnauthorized } from '@/lib/admin-auth'
import { deleteUserCascade, setUserSuspended } from '@/lib/admin-user-actions'

const ACTIONS = ['suspend', 'unsuspend', 'delete'] as const
type BulkAction = (typeof ACTIONS)[number]

export async function POST(request: NextRequest) {
  const admin = await verifyAdmin(request)
  if (!admin) return adminUnauthorized()

  const body = await request.json()
  const action: string = body.action
  const userIds: unknown = body.userIds

  if (!ACTIONS.includes(action as BulkAction)) {
    return NextResponse.json({ error: 'פעולה לא תקינה' }, { status: 400 })
  }
  if (!Array.isArray(userIds) || userIds.length === 0 || !userIds.every((id) => typeof id === 'string')) {
    return NextResponse.json({ error: 'רשימת משתמשים לא תקינה' }, { status: 400 })
  }
  if (userIds.length > 100) {
    return NextResponse.json({ error: 'ניתן לבחור עד 100 משתמשים בפעולה אחת' }, { status: 400 })
  }

  const succeeded: string[] = []
  const failed: { id: string; error: string }[] = []

  for (const id of userIds as string[]) {
    const result = action === 'delete'
      ? await deleteUserCascade(id, admin)
      : await setUserSuspended(id, action === 'suspend', admin)

    if (result.ok) {
      succeeded.push(id)
    } else {
      failed.push({ id, error: result.error })
    }
  }

  return NextResponse.json({ data: { succeeded, failed } })
}
