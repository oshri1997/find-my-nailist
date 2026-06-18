import { test as setup } from '@playwright/test'
import path from 'path'
import fs from 'fs'

const authFile = path.join(__dirname, '.auth/user.json')

/**
 * Auth setup — signs in with a demo user and saves the auth state.
 *
 * Requires these env vars to be set:
 *   NEXT_PUBLIC_FIREBASE_API_KEY  — Firebase web API key
 *   TEST_USER_EMAIL               — test account email
 *   TEST_USER_PASSWORD            — test account password
 *
 * If the credentials are missing the file is written as empty so
 * authenticated tests will be skipped gracefully.
 */
setup('authenticate demo user', async ({ page, request }) => {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY
  const email = process.env.TEST_USER_EMAIL
  const password = process.env.TEST_USER_PASSWORD

  if (!apiKey || !email || !password) {
    console.warn('⚠️  TEST_USER_EMAIL / TEST_USER_PASSWORD / NEXT_PUBLIC_FIREBASE_API_KEY not set — saving empty auth state')
    fs.writeFileSync(authFile, JSON.stringify({ cookies: [], origins: [] }))
    return
  }

  // Sign in with Firebase REST API
  let idToken: string | undefined
  const signIn = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    }
  )

  if (signIn.ok) {
    ;({ idToken } = await signIn.json())
  } else {
    // User might not exist — try to create it
    const signUp = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, returnSecureToken: true }),
      }
    )
    if (signUp.ok) {
      ;({ idToken } = await signUp.json())
    }
  }

  if (!idToken) {
    console.error('❌ Could not obtain Firebase ID token. Saving empty auth state.')
    fs.writeFileSync(authFile, JSON.stringify({ cookies: [], origins: [] }))
    return
  }

  // Set the session cookie via the app's session API
  await page.goto('/login')
  const sessionRes = await request.post('/api/auth/session', {
    data: { token: idToken },
    headers: { 'Content-Type': 'application/json' },
  })

  if (!sessionRes.ok) {
    console.error('❌ Session API failed:', sessionRes.status())
    fs.writeFileSync(authFile, JSON.stringify({ cookies: [], origins: [] }))
    return
  }

  // Also ensure a nailist profile exists
  await request.post('/api/users', {
    data: { uid: email, email, displayName: 'Demo Nailist', role: 'NAILIST' },
    headers: { 'Content-Type': 'application/json' },
  })

  await page.context().storageState({ path: authFile })
  console.log('✅ Auth state saved to', authFile)
})
