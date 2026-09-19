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
import { getFirestore, FieldValue } from 'firebase-admin/firestore'

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
const db = getFirestore(app)

try {
  const user = await auth.getUserByEmail(email)
  if (user.emailVerified) {
    console.log(`[e2e-verify-test-user] ${email} already verified`)
  } else {
    await auth.updateUser(user.uid, { emailVerified: true })
    console.log(`[e2e-verify-test-user] marked ${email} as verified`)
  }

  // The cleanup script deliberately deletes this reusable account's
  // Firestore documents after each run. Recreate the minimal, completed
  // nailist identity before Playwright starts, so every real-session suite
  // begins from the same state instead of racing the login page's client-side
  // provisioning request.
  const now = FieldValue.serverTimestamp()
  const userRef = db.collection('users').doc(user.uid)
  await userRef.set({
    email: user.email ?? email,
    displayName: 'E2E Nailist',
    role: 'NAILIST',
    roleChosen: true,
    updatedAt: now,
  }, { merge: true })

  const profiles = await db.collection('nailistProfiles').where('userId', '==', user.uid).limit(1).get()
  if (profiles.empty) {
    await db.collection('nailistProfiles').add({
      userId: user.uid,
      email: user.email ?? email,
      businessName: 'E2E Nailist',
      isActive: true,
      onboardingCompleted: true,
      isVerified: false,
      avgRating: 0,
      reviewCount: 0,
      createdAt: now,
      updatedAt: now,
    })
  }
  console.log('[e2e-verify-test-user] staging test profile is ready')
} catch (err) {
  console.error('[e2e-verify-test-user] failed:', err instanceof Error ? err.message : err)
  process.exit(1)
}
