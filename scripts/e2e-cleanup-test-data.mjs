// Deletes everything the E2E test account created in Firestore in the REAL
// Firebase project (these tests run against production Firestore, not an
// emulator — see e2e/real-session-helper.ts). Without this, the nailist
// profile created by loginAsRealUser()'s registration fallback (displayName
// "Demo Nailist") persists indefinitely and — once active — shows up as a
// real result in production search, exactly like the profiles a user
// actually reported.
//
// Deliberately does NOT delete the Firebase Auth user itself — only its
// Firestore docs. TEST_USER_EMAIL/PASSWORD is a fixed, reusable credential;
// deleting the Auth account here would force every later run to recreate it
// from scratch, but account (re)creation in a shared/production-linked
// Firebase project is a manual, deliberate step, not something CI does
// unattended on every run — see e2e-verify-test-user.mjs. Once the Firestore
// docs are gone, the next login just gets a fresh, deactivated profile via
// /api/users' normal auto-provisioning, so the account is just as "clean"
// without ever touching Auth account lifecycle.
//
// Runs at the end of the E2E CI job with `if: always()` so it cleans up
// even when a test fails partway through. Idempotent: safe to run when
// nothing exists yet (first-ever run) or when a prior run already cleaned up.
import { initializeApp, cert } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'

const email = process.env.TEST_USER_EMAIL
if (!email) {
  console.log('[e2e-cleanup] TEST_USER_EMAIL not set — skipping')
  process.exit(0)
}

const app = initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
    clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  }),
})

const auth = getAuth(app)
const db = getFirestore(app)

async function deleteWhere(collection, field, value) {
  const snap = await db.collection(collection).where(field, '==', value).get()
  if (snap.empty) return 0
  await Promise.all(snap.docs.map((d) => d.ref.delete()))
  return snap.size
}

let uid
try {
  uid = (await auth.getUserByEmail(email)).uid
} catch {
  console.log(`[e2e-cleanup] no auth user for ${email} — nothing to clean up`)
  process.exit(0)
}

let deletedCount = 0

// Nailist-side data (the test account always registers as a NAILIST — see
// real-session-helper.ts — but a spec could switch its role, so clean both sides).
const nailistProfiles = await db.collection('nailistProfiles').where('userId', '==', uid).get()
for (const profile of nailistProfiles.docs) {
  deletedCount += await deleteWhere('services', 'nailistProfileId', profile.id)
  deletedCount += await deleteWhere('workingHours', 'nailistProfileId', profile.id)
  deletedCount += await deleteWhere('portfolioPhotos', 'nailistProfileId', profile.id)
  deletedCount += await deleteWhere('reviews', 'nailistProfileId', profile.id)
  deletedCount += await deleteWhere('appointments', 'nailistProfileId', profile.id)
  await profile.ref.delete()
  deletedCount += 1
}

// Client-side data
const clientProfiles = await db.collection('clientProfiles').where('userId', '==', uid).get()
for (const profile of clientProfiles.docs) {
  deletedCount += await deleteWhere('appointments', 'clientProfileId', profile.id)
  await profile.ref.delete()
  deletedCount += 1
}

deletedCount += await deleteWhere('favorites', 'userId', uid)

const userDoc = db.collection('users').doc(uid)
if ((await userDoc.get()).exists) {
  await userDoc.delete()
  deletedCount += 1
}

console.log(`[e2e-cleanup] deleted ${deletedCount} Firestore doc(s) for ${email} (Auth account left intact)`)
