'use client'

import { createContext, useContext, useEffect, useState, useRef, ReactNode, useCallback } from 'react'
import type { User } from 'firebase/auth'
import * as Sentry from '@sentry/nextjs'
import { NailLoader } from '@/components/ui/nail-loader'

type UserRole = 'NAILIST' | 'CLIENT' | 'ADMIN' | null

interface AuthContextValue {
  user: User | null
  loading: boolean
  role: UserRole
  isAdmin: boolean
  onboardingCompleted: boolean
  // The name the client/nailist actually entered in the app (from her
  // profile, or the users doc as set at registration) — prefer this over
  // the raw Firebase Auth user.displayName, which is whatever the sign-in
  // provider (e.g. Google) happens to have on file and can be an unrelated
  // nickname/handle. Null until resolved or if nothing was ever collected.
  displayName: string | null
  signOut: () => Promise<void>
  refreshRole: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  role: null,
  isAdmin: false,
  onboardingCompleted: true,
  displayName: null,
  signOut: async () => {},
  refreshRole: async () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [role, setRole] = useState<UserRole>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [onboardingCompleted, setOnboardingCompleted] = useState(true)
  const [displayName, setDisplayName] = useState<string | null>(null)
  const skipCallbackRef = useRef(false)

  const refreshRole = useCallback(async () => {
    try {
      const roleRes = await fetch('/api/me/role')
      if (roleRes.ok) {
        const { role: fetchedRole, isAdmin: fetchedIsAdmin, onboardingCompleted: fetchedOnboarded, displayName: fetchedDisplayName } = await roleRes.json()
        setRole(fetchedRole ?? null)
        setIsAdmin(fetchedIsAdmin === true)
        setOnboardingCompleted(fetchedOnboarded !== false)
        setDisplayName(fetchedDisplayName ?? null)
      }
    } catch {}
  }, [])

  const signOut = useCallback(async () => {
    setLoading(true)
    skipCallbackRef.current = true
    const { signOutUser } = await import('@/lib/firebase/auth-helpers')
    await signOutUser()
    await fetch('/api/auth/session', { method: 'DELETE' })
    setUser(null)
    setRole(null)
    setIsAdmin(false)
    setOnboardingCompleted(true)
    setDisplayName(null)
    Sentry.setUser(null)
    skipCallbackRef.current = false
    setLoading(false)
  }, [])

  useEffect(() => {
    let unsub: (() => void) | undefined

    async function init() {
      const { initFirebase } = await import('@/lib/firebase/client')
      const clients = await initFirebase()
      if (!clients) { setLoading(false); return }

      const { onIdTokenChanged } = await import('firebase/auth')
      unsub = onIdTokenChanged(clients.auth, async (firebaseUser) => {
        if (skipCallbackRef.current) return
        // Suppresses the finally block's state update below — while a
        // suspended-account sign-out is in flight (see the 403 branch), we
        // must NOT flip user/loading back to "authenticated" for the stale
        // firebaseUser reference, even though window.location.assign()'s
        // navigation hasn't actually unloaded the page yet.
        let suspending = false
        try {
          if (firebaseUser) {
            Sentry.setUser({ id: firebaseUser.uid })
            const token = await firebaseUser.getIdToken()
            const sessionRes = await fetch('/api/auth/session', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ token }),
            })
            if (sessionRes.status === 403) {
              // Account was suspended after this session started — the
              // Firebase token itself is still cryptographically valid, so
              // this is the only place that catches it (a brand-new sign-in
              // attempt is already blocked earlier, by Firebase's own
              // auth/user-disabled error on the login page).
              suspending = true
              const { signOutUser } = await import('@/lib/firebase/auth-helpers')
              await signOutUser()
              window.location.assign('/login?suspended=1')
              return
            }
            const roleRes = await fetch('/api/me/role')
            if (roleRes.ok) {
              const { role: fetchedRole, isAdmin: fetchedIsAdmin, onboardingCompleted: fetchedOnboarded, displayName: fetchedDisplayName } = await roleRes.json()
              setRole(fetchedRole ?? null)
              setIsAdmin(fetchedIsAdmin === true)
              setOnboardingCompleted(fetchedOnboarded !== false)
              setDisplayName(fetchedDisplayName ?? null)
            } else {
              setRole(null)
              setIsAdmin(false)
              setOnboardingCompleted(true)
              setDisplayName(null)
            }
          } else {
            Sentry.setUser(null)
            await fetch('/api/auth/session', { method: 'DELETE' })
            setRole(null)
            setIsAdmin(false)
            setOnboardingCompleted(true)
            setDisplayName(null)
          }
        } catch {
          // session sync failed — auth state is still valid, don't block the UI
        } finally {
          if (!suspending) {
            // Set user AFTER the session cookie is written so any redirect
            // triggered by the login page useEffect finds the cookie already set.
            setUser(firebaseUser)
            setLoading(false)
          }
        }
      })
    }

    init()
    return () => unsub?.()
  }, [])

  if (loading) {
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-background">
        <NailLoader />
      </div>
    )
  }

  return (
    <AuthContext.Provider value={{ user, loading, role, isAdmin, onboardingCompleted, displayName, signOut, refreshRole }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
