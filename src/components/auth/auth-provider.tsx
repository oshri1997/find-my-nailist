'use client'

import { createContext, useContext, useEffect, useState, useRef, ReactNode, useCallback } from 'react'
import type { User } from 'firebase/auth'
import { NailLoader } from '@/components/ui/nail-loader'

interface AuthContextValue {
  user: User | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  signOut: async () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const skipCallbackRef = useRef(false)

  const signOut = useCallback(async () => {
    setLoading(true)
    skipCallbackRef.current = true
    const { signOutUser } = await import('@/lib/firebase/auth-helpers')
    await signOutUser()
    await fetch('/api/auth/session', { method: 'DELETE' })
    setUser(null)
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
        setUser(firebaseUser)
        try {
          if (firebaseUser) {
            const token = await firebaseUser.getIdToken()
            await fetch('/api/auth/session', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ token }),
            })
          } else {
            await fetch('/api/auth/session', { method: 'DELETE' })
          }
        } catch {
          // session sync failed — auth state is still valid, don't block the UI
        } finally {
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
    <AuthContext.Provider value={{ user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
