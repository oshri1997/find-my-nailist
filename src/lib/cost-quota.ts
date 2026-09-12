import { createHash } from 'node:crypto'

export function positiveLimit(name: string, fallback: number, maximum = 100000): number {
  const value = Number(process.env[name])
  return Number.isSafeInteger(value) && value > 0 ? Math.min(value, maximum) : fallback
}

export class CostQuotaExceeded extends Error {
  constructor(public retryAfterSeconds: number) {
    super('מכסת הפעולות הושגה. נסו שוב מאוחר יותר.')
  }
}

export type Quota = { key: string; limit: number; cooldownMs?: number }

// Stable documents roll over on UTC midnight; only hashed identifiers persist.
// Reserve before provider calls. Failed attempts consume quota (fail closed).
export async function reserveCostQuota(quotas: Quota[], now = Date.now()): Promise<void> {
  // Load Admin only when a quota is reserved. Email formatting/rendering is
  // pure work and must stay testable where Firebase Admin's optional ESM
  // dependencies are unavailable.
  const { adminDb } = await import('@/lib/firebase/admin')
  const db = adminDb()
  const day = Math.floor(now / 86400000)
  const refs = quotas.map(q => db.collection('costQuotas').doc(createHash('sha256').update(q.key).digest('hex')))
  await db.runTransaction(async tx => {
    const snapshots = await Promise.all(refs.map(ref => tx.get(ref)))
    const records = snapshots.map(s => s.data())
    for (let i = 0; i < quotas.length; i++) {
      const prior = records[i]
      const quota = quotas[i]
      const count = prior?.day === day ? Number(prior.count) || 0 : 0
      const cooldown = (Number(prior?.lastAt) || 0) + (quota.cooldownMs ?? 0) - now
      if (count >= quota.limit || cooldown > 0) {
        throw new CostQuotaExceeded(Math.max(1, Math.ceil((count >= quota.limit ? (day + 1) * 86400000 - now : cooldown) / 1000)))
      }
    }
    refs.forEach((ref, i) => tx.set(ref, {
      day, count: (records[i]?.day === day ? Number(records[i]?.count) || 0 : 0) + 1, lastAt: now,
    }))
  })
}

export const normalizeRecipient = (email: string) => email.trim().toLowerCase()

export async function reserveEmailQuota(email: string): Promise<void> {
  await reserveCostQuota([
    { key: 'mail:global', limit: positiveLimit('EMAIL_DAILY_LIMIT', 200) },
    { key: `mail:recipient:${normalizeRecipient(email)}`, limit: positiveLimit('EMAIL_RECIPIENT_DAILY_LIMIT', 20, 1000) },
  ])
}
