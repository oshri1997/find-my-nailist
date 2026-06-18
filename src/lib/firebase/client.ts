import { initializeApp, getApps, getApp, type FirebaseOptions } from 'firebase/app'
import { getAuth, type Auth } from 'firebase/auth'
import { getFirestore, type Firestore } from 'firebase/firestore'
import { getStorage, type FirebaseStorage } from 'firebase/storage'

interface FirebaseClients {
  auth: Auth
  db: Firestore
  storage: FirebaseStorage
}

// Mutable exports — set after async init. Live bindings ensure importers see
// the updated values once initFirebase() resolves.
export let auth: Auth | null = null
export let db: Firestore | null = null
export let storage: FirebaseStorage | null = null

let _clients: FirebaseClients | null = null
let _promise: Promise<FirebaseClients | null> | null = null

function withProxiedAuthDomain(config: FirebaseOptions): FirebaseOptions {
  // Use the app's own origin as authDomain so Firebase OAuth redirects go through
  // our Next.js proxy (/__/auth/*) instead of firebaseapp.com. This prevents
  // iOS Safari ITP from blocking cross-origin sessionStorage during the OAuth flow.
  if (typeof window !== 'undefined') {
    return { ...config, authDomain: window.location.hostname }
  }
  return config
}

async function loadConfig(): Promise<FirebaseOptions | null> {
  // Fast path: NEXT_PUBLIC_ vars baked in at build time
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY
  if (apiKey) {
    return withProxiedAuthDomain({
      apiKey,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    })
  }
  // Runtime fallback: fetch config from the server API
  try {
    const res = await fetch('/api/firebase-config')
    if (!res.ok) return null
    const config = await res.json()
    if (!config.apiKey) return null
    return withProxiedAuthDomain(config)
  } catch {
    return null
  }
}

export function initFirebase(): Promise<FirebaseClients | null> {
  if (_clients) return Promise.resolve(_clients)
  if (!_promise) {
    _promise = loadConfig().then((config) => {
      if (!config?.apiKey) return null
      const app = getApps().length ? getApp() : initializeApp(config)
      _clients = {
        auth: getAuth(app),
        db: getFirestore(app),
        storage: getStorage(app),
      }
      // Update live exports so existing importers of { auth } etc. see the values
      auth = _clients.auth
      db = _clients.db
      storage = _clients.storage
      return _clients
    })
  }
  return _promise
}

export default null
