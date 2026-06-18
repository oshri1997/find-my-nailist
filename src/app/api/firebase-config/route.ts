import { NextResponse } from 'next/server'

// Server can always read env vars at runtime, regardless of NEXT_PUBLIC_ prefix.
// This lets the client initialize Firebase even when NEXT_PUBLIC_ vars weren't
// available at build time.
export async function GET() {
  const apiKey =
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY

  if (!apiKey) {
    return NextResponse.json({ error: 'Firebase not configured' }, { status: 503 })
  }

  return NextResponse.json({
    apiKey,
    authDomain:
      process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || process.env.FIREBASE_AUTH_DOMAIN,
    projectId:
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID,
    storageBucket:
      process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId:
      process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ||
      process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || process.env.FIREBASE_APP_ID,
  })
}
