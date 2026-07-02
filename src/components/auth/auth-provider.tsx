'use client'

import { createContext, useContext, useEffect, useState, useRef, ReactNode, useCallback } from 'react'
import type { User } from 'firebase/auth'
import { NailLoader } from '@/components/ui/nail-loader'

type UserRole = 'NAILIST' | 'CLIENT' | null

interface AuthContextValue {
  user: User | null
  loading: boolean
  role: UserRole
  signOut: () => Promise<void>
  refreshRole: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  role: null,
  signOut: async () => {},
  refreshRole: async () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [role, setRole] = useState<UserRole>(null)
  const skipCallbackRef = useRef(false)

  const refreshRole = useCallback(async () => {
    try {
      const roleRes = await fetch('/api/me/role')
      if (roleRes.ok) {
        const { role: fetchedRole } = await roleRes.json()
        setRole(fetchedRole ?? null)
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
        try {
          if (firebaseUser) {
            const token = await firebaseUser.getIdToken()
            await fetch('/api/auth/session', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ token }),
            })
            const roleRes = await fetch('/api/me/role')
            if (roleRes.ok) {
              const { role: fetchedRole } = await roleRes.json()
              setRole(fetchedRole ?? null)
            } else {
              setRole(null)
            }
          } else {
            await fetch('/api/auth/session', { method: 'DELETE' })
            setRole(null)
          }
        } catch {
          // session sync failed — auth state is still valid, don't block the UI
        } finally {
          // Set user AFTER the session cookie is written so any redirect
          // triggered by the login page useEffect finds the cookie already set.
          setUser(firebaseUser)
          setLoading(false)
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
    <AuthContext.Provider value={{ user, loading, role, signOut, refreshRole }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
