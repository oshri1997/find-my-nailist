import { createHash, randomInt, timingSafeEqual } from 'node:crypto'
import { adminAuth, adminDb } from '@/lib/firebase/admin'
import { COLLECTIONS } from '@/lib/firebase/collections'
import { sendAdminActionCodeEmail } from '@/lib/email'
import { writeAuditLog } from '@/lib/audit-log'
import { FieldValue, Timestamp } from 'firebase-admin/firestore'
import { CostQuotaExceeded, reserveCostQuota } from '@/lib/cost-quota'
import { validateEmailDomain } from '@/lib/email-domain'

const CODE_TTL_MS = 10 * 60 * 1000
const MAX_ATTEMPTS = 5
const REQUEST_COOLDOWN_MS = 60 * 1000
const PROCESSING_LEASE_MS = 60 * 1000
// A second factor is only a second factor if it lands somewhere the admin
// panel cannot reach. This address is fixed server-side and is never taken
// from the request.
const GUARD_EMAIL = process.env.ADMIN_ACTION_EMAIL || 'nailistiotil@gmail.com'

export type AdminEmailChangeResult<T> = { ok: true; data: T } | { ok: false; error: string; status: number }

export const normalizeEmail = (email: string) => email.trim().toLowerCase()

// Deliberately strict: this address becomes a Firebase Auth sign-in
// identifier, so anything the provider would reject is better refused here
// with a readable message.
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(email) && email.length <= 254
}

function hashCode(challengeId: string, code: string): string {
  return createHash('sha256').update(`${challengeId}:${code}`).digest('hex')
}

function codeMatches(expectedHash: string, challengeId: string, code: string): boolean {
  const actual = Buffer.from(hashCode(challengeId, code), 'hex')
  const expected = Buffer.from(expectedHash, 'hex')
  return actual.length === expected.length && timingSafeEqual(actual, expected)
}

export async function requestEmailChange(params: {
  targetUid: string
  newEmail: string
  admin: { uid: string; email: string }
}): Promise<AdminEmailChangeResult<{ challengeId: string; sentTo: string }>> {
  const newEmail = normalizeEmail(params.newEmail)
  if (!isValidEmail(newEmail)) {
    return { ok: false, error: 'כתובת מייל לא תקינה', status: 400 }
  }

  const db = adminDb()
  const userSnap = await db.collection(COLLECTIONS.USERS).doc(params.targetUid).get()
  if (!userSnap.exists) return { ok: false, error: 'משתמש לא נמצא', status: 404 }
  if (userSnap.data()?.isAdmin === true) {
    return { ok: false, error: 'לא ניתן לשנות כתובת מייל של חשבון אדמין', status: 403 }
  }

  let currentEmail: string | undefined
  try {
    currentEmail = (await adminAuth().getUser(params.targetUid)).email
  } catch {
    return { ok: false, error: 'למשתמש אין חשבון התחברות פעיל', status: 404 }
  }
  if (currentEmail && normalizeEmail(currentEmail) === newEmail) {
    return { ok: false, error: 'זו כבר הכתובת הרשומה למשתמש', status: 400 }
  }

  const domain = await validateEmailDomain(newEmail)
  if (domain.status === 'invalid') {
    return { ok: false, error: 'הדומיין של כתובת המייל אינו יכול לקבל מיילים', status: 400 }
  }

  try {
    await reserveCostQuota([
      { key: `admin-email-change:${params.admin.uid}:${params.targetUid}`, limit: 1, cooldownMs: REQUEST_COOLDOWN_MS },
    ])
  } catch (error) {
    if (error instanceof CostQuotaExceeded) {
      return { ok: false, error: 'קוד כבר נשלח לאחרונה — נסי שוב בעוד דקה', status: 429 }
    }
    throw error
  }

  const code = String(randomInt(0, 1_000_000)).padStart(6, '0')
  const challengeRef = db.collection(COLLECTIONS.ADMIN_EMAIL_CHALLENGES).doc()

  await challengeRef.set({
    actorUid: params.admin.uid,
    actorEmail: params.admin.email,
    targetUid: params.targetUid,
    currentEmail: currentEmail ?? null,
    newEmail,
    codeHash: hashCode(challengeRef.id, code),
    attempts: 0,
    expiresAt: Timestamp.fromMillis(Date.now() + CODE_TTL_MS),
    createdAt: FieldValue.serverTimestamp(),
  })

  await sendAdminActionCodeEmail({
    email: GUARD_EMAIL,
    code,
    action: 'שינוי כתובת מייל של משתמש',
    details: [
      `כתובת נוכחית: ${currentEmail ?? '—'}`,
      `כתובת חדשה: ${newEmail}`,
      `מבצע הפעולה: ${params.admin.email}`,
    ],
  })

  return { ok: true, data: { challengeId: challengeRef.id, sentTo: GUARD_EMAIL } }
}

export async function confirmEmailChange(params: {
  challengeId: string
  code: string
  targetUid: string
  admin: { uid: string; email: string }
}): Promise<AdminEmailChangeResult<{ targetUid: string; newEmail: string }>> {
  if (!/^\d{6}$/.test(params.code)) {
    return { ok: false, error: 'קוד אישור לא תקין', status: 400 }
  }
  const db = adminDb()
  const challengeRef = db.collection(COLLECTIONS.ADMIN_EMAIL_CHALLENGES).doc(params.challengeId)

  // The attempt counter is incremented in the same transaction that reads
  // it, so parallel requests cannot spend more than MAX_ATTEMPTS guesses
  // between them.
  const verdict = await db.runTransaction(async (tx) => {
    const snap = await tx.get(challengeRef)
    if (!snap.exists) return { ok: false as const, error: 'הבקשה לא נמצאה או שפג תוקפה', status: 400 }

    const data = snap.data()!
    if (data.consumedAt) return { ok: false as const, error: 'הקוד כבר נוצל', status: 400 }
    if (data.actorUid !== params.admin.uid) {
      return { ok: false as const, error: 'רק האדמין שביקש את השינוי יכול לאשר אותו', status: 403 }
    }
    if (data.expiresAt.toMillis() < Date.now()) {
      return { ok: false as const, error: 'פג תוקף הקוד — התחילי מחדש', status: 400 }
    }
    if ((data.attempts ?? 0) >= MAX_ATTEMPTS) {
      return { ok: false as const, error: 'יותר מדי ניסיונות — התחילי מחדש', status: 429 }
    }

    if (!codeMatches(data.codeHash, params.challengeId, params.code)) {
      tx.update(challengeRef, { attempts: FieldValue.increment(1) })
      const left = MAX_ATTEMPTS - (data.attempts ?? 0) - 1
      return { ok: false as const, error: `קוד שגוי — נותרו ${left} ניסיונות`, status: 400 }
    }

    if (data.targetUid !== params.targetUid) {
      return { ok: false as const, error: 'הקוד אינו שייך למשתמש הזה', status: 400 }
    }

    const processingAt = data.processingAt?.toMillis?.()
    if (processingAt && Date.now() - processingAt < PROCESSING_LEASE_MS) {
      return { ok: false as const, error: 'השינוי כבר מעובד — נסי שוב בעוד רגע', status: 409 }
    }

    // Claim the challenge before calling Auth. It becomes consumed only after
    // the Auth update succeeds, so a provider failure can be retried safely.
    tx.update(challengeRef, { processingAt: FieldValue.serverTimestamp() })
    return {
      ok: true as const,
      targetUid: data.targetUid as string,
      newEmail: data.newEmail as string,
      currentEmail: (data.currentEmail as string | null) ?? null,
    }
  })

  if (!verdict.ok) return { ok: false, error: verdict.error, status: verdict.status }

  const releaseChallenge = async () => {
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(challengeRef)
      if (snap.exists && !snap.data()?.consumedAt) {
        tx.update(challengeRef, { processingAt: FieldValue.delete() })
      }
    })
  }

  // Re-check the target after the code was issued: a concurrent role or email
  // change must not let an old challenge overwrite newer account data.
  const [targetSnap, authUser] = await Promise.all([
    db.collection(COLLECTIONS.USERS).doc(verdict.targetUid).get(),
    adminAuth().getUser(verdict.targetUid),
  ]).catch(async () => {
    await releaseChallenge()
    return [null, null] as const
  })

  if (!targetSnap || !authUser) {
    return { ok: false, error: 'לא ניתן לאמת את מצב המשתמש — נסי שוב', status: 503 }
  }
  if (targetSnap.data()?.isAdmin === true) {
    await releaseChallenge()
    return { ok: false, error: 'לא ניתן לשנות כתובת מייל של חשבון אדמין', status: 403 }
  }

  const authEmail = authUser.email ? normalizeEmail(authUser.email) : null
  const expectedEmail = verdict.currentEmail ? normalizeEmail(verdict.currentEmail) : null
  if (authEmail !== expectedEmail && authEmail !== verdict.newEmail) {
    await releaseChallenge()
    return { ok: false, error: 'כתובת המייל השתנתה מאז בקשת הקוד — התחילי מחדש', status: 409 }
  }

  try {
    if (authEmail !== verdict.newEmail) {
      await adminAuth().updateUser(verdict.targetUid, {
        email: verdict.newEmail,
        // The new address is unproven until its owner clicks the link, and the
        // account must not inherit the old address's verified state.
        emailVerified: false,
      })
    }
  } catch (error) {
    await releaseChallenge()
    const code = (error as { code?: string }).code
    if (code === 'auth/email-already-exists') {
      return { ok: false, error: 'הכתובת כבר רשומה לחשבון אחר', status: 409 }
    }
    console.error('[admin-email-change] updateUser failed:', error)
    return { ok: false, error: 'עדכון כתובת המייל נכשל', status: 500 }
  }

  try {
    await db.collection(COLLECTIONS.USERS).doc(verdict.targetUid).set(
      {
        email: verdict.newEmail,
        pendingEmail: FieldValue.delete(),
        emailDeliveryStatus: FieldValue.delete(),
        emailDeliveryBouncedAt: FieldValue.delete(),
        emailDeliveryEventId: FieldValue.delete(),
        // Lets the follow-up verification email go out immediately rather than
        // inheriting the cooldown stamped against the old address.
        lastVerificationEmailSentAt: FieldValue.delete(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    )
  } catch (error) {
    // Firebase Auth is authoritative. Do not report failure after its update;
    // the ordinary Auth-to-Firestore sync can repair this mirror later.
    console.error('[admin-email-change] Firestore mirror update failed:', error)
  }

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(challengeRef)
    if (snap.exists && !snap.data()?.consumedAt) {
      tx.update(challengeRef, {
        consumedAt: FieldValue.serverTimestamp(),
        processingAt: FieldValue.delete(),
      })
    }
  })

  await writeAuditLog({
    actorUid: params.admin.uid,
    actorEmail: params.admin.email,
    action: 'USER_EMAIL_CHANGE',
    targetType: 'user',
    targetId: verdict.targetUid,
    metadata: { oldEmail: verdict.currentEmail, newEmail: verdict.newEmail },
  })

  return { ok: true, data: { targetUid: verdict.targetUid, newEmail: verdict.newEmail } }
}
