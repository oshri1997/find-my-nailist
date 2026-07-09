import type { Firestore } from 'firebase-admin/firestore'
import { COLLECTIONS } from '@/lib/firebase/collections'
import { batchFetchByIds } from '@/lib/batch-fetch'

// Older reviews can have an empty clientDisplayName — it's a snapshot taken
// at booking time, and some client accounts predate a fix that made sure
// firstName/lastName always get collected before booking. Rather than a
// one-time backfill migration, resolve it live from the current profile —
// self-healing for any future gap too, not just this one. Shared by every
// reviews-listing route (the public nailist profile and the admin reviews
// list) so there's one batched implementation instead of a per-route N+1
// loop of individual doc reads.
export async function batchResolveClientDisplayNames(
  db: Firestore,
  clientProfileIds: string[]
): Promise<Record<string, string>> {
  const profileMap = await batchFetchByIds(db, COLLECTIONS.CLIENT_PROFILES, clientProfileIds)

  const missingUserIds = Object.values(profileMap)
    .filter((p) => !(p.firstName && p.lastName) && !p.displayName && p.userId)
    .map((p) => p.userId as string)
  const userMap = await batchFetchByIds(db, COLLECTIONS.USERS, missingUserIds)

  const result: Record<string, string> = {}
  for (const [id, profile] of Object.entries(profileMap)) {
    if (profile.firstName && profile.lastName) {
      result[id] = `${profile.firstName} ${profile.lastName}`
    } else if (profile.displayName) {
      result[id] = profile.displayName as string
    } else {
      const userId = profile.userId as string | undefined
      result[id] = (userId && (userMap[userId]?.displayName as string | undefined)) || ''
    }
  }
  return result
}
