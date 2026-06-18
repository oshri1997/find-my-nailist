'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import type { User } from 'firebase/auth'

interface AuthContextValue {
  user: User | null
  loading: boolean
}

const AuthContext = createContext<AuthContextValue>({ user: null, loading: false })

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let unsub: (() => void) | undefined

    async function init() {
      const { auth } = await import('@/lib/firebase/client')
      if (!auth) {
        setLoading(false)
        return
      }
      const { onAuthStateChanged } = await import('firebase/auth')
      unsub = onAuthStateChanged(auth, (firebaseUser) => {
        setUser(firebaseUser)
        setLoading(false)
      })
    }

    init()
    return () => unsub?.()
  }, [])

  return <AuthContext.Provider value={{ user, loading }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}
