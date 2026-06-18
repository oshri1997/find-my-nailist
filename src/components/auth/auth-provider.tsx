'use client'

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react'
import type { User } from 'firebase/auth'

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

  const signOut = useCallback(async () => {
    const { signOutUser } = await import('@/lib/firebase/auth-helpers')
    await signOutUser()
    await fetch('/api/auth/session', { method: 'DELETE' })
    setUser(null)
  }, [])

  useEffect(() => {
    let unsub: (() => void) | undefined

    async function init() {
      const { initFirebase } = await import('@/lib/firebase/client')
      const clients = await initFirebase()
      if (!clients) { setLoading(false); return }

      const { onAuthStateChanged } = await import('firebase/auth')
      unsub = onAuthStateChanged(clients.auth, async (firebaseUser) => {
        setUser(firebaseUser)
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
        setLoading(false)
      })
    }

    init()
    return () => unsub?.()
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
