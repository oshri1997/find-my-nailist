// Ensures the E2E test account's email is marked verified in Firebase Auth.
// Booking now requires a verified email (see POST /api/appointments), so
// without this the real-session E2E suite can never get past step 1 of the
// booking flow. Run once at the start of the E2E CI job — idempotent, safe
// to run every time.
//
// The Auth account itself is expected to already exist and is never deleted
// by this project's CI (see e2e-cleanup-test-data.mjs, which resets this
// account's Firestore data every run but deliberately leaves the Auth user
// alone) — recreating a real account in the shared Firebase project from CI
// is a deliberately separate, manual step, not something a script does
// unattended on every run.
import { initializeApp, cert } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'

const email = process.env.TEST_USER_EMAIL
if (!email) {
  console.log('[e2e-verify-test-user] TEST_USER_EMAIL not set — skipping')
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

try {
  const user = await auth.getUserByEmail(email)
  if (user.emailVerified) {
    console.log(`[e2e-verify-test-user] ${email} already verified`)
  } else {
    await auth.updateUser(user.uid, { emailVerified: true })
    console.log(`[e2e-verify-test-user] marked ${email} as verified`)
  }
} catch (err) {
  console.error('[e2e-verify-test-user] failed:', err instanceof Error ? err.message : err)
  process.exit(1)
}
