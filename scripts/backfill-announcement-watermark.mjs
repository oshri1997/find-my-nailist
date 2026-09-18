// One-time migration for the announcement system: every user document that
// predates lastSeenAnnouncementsAt gets it seeded to "now", so nobody who
// already had an account gets the full historical backlog dumped on her
// next login. Anyone who signs up after this ran gets no explicit seed —
// GET /api/announcements already falls back to the user doc's own createdAt
// for a document with no watermark, which is correct for a genuinely new
// account.
//
// Idempotent and safe to re-run: only touches documents missing the field.
// Run once, after deploying the announcements feature, against each
// environment (staging first, then production):
//   node scripts/backfill-announcement-watermark.mjs
import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'

const app = initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
    clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  }),
})

const db = getFirestore(app)
const BATCH_SIZE = 400 // under Firestore's 500-write batch limit

let totalSeen = 0
let totalUpdated = 0
let lastDoc

for (;;) {
  let query = db.collection('users').orderBy('__name__').limit(BATCH_SIZE)
  if (lastDoc) query = query.startAfter(lastDoc)
  const snap = await query.get()
  if (snap.empty) break

  const batch = db.batch()
  let batchUpdates = 0
  for (const doc of snap.docs) {
    totalSeen += 1
    if (doc.data().lastSeenAnnouncementsAt === undefined) {
      batch.set(doc.ref, { lastSeenAnnouncementsAt: FieldValue.serverTimestamp() }, { merge: true })
      batchUpdates += 1
    }
  }
  if (batchUpdates > 0) {
    await batch.commit()
    totalUpdated += batchUpdates
  }

  lastDoc = snap.docs[snap.docs.length - 1]
  if (snap.docs.length < BATCH_SIZE) break
}

console.log(`[backfill-announcement-watermark] scanned ${totalSeen} user(s), seeded ${totalUpdated}`)
