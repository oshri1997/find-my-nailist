'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Loader2 } from 'lucide-react'
import Image from 'next/image'
import { useAuth } from '@/components/auth/auth-provider'

type Role = 'NAILIST' | 'CLIENT'

export default function OnboardingWelcomePage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [selecting, setSelecting] = useState<Role | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (authLoading) return
    if (!user) router.replace('/login')
  }, [user, authLoading, router])

  async function handleSelect(role: Role) {
    setSelecting(role)
    setError('')
    try {
      const res = await fetch('/api/me/set-role', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      })
      if (!res.ok) throw new Error('failed')
      router.push(role === 'NAILIST' ? '/onboarding' : '/onboarding/client')
    } catch {
      setError('שגיאה — נסי שוב')
      setSelecting(null)
    }
  }

  if (authLoading || !user) return null

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <Image src="/logo.png" alt="נייליסטיות לוגו" width={56} height={56} className="mx-auto mb-1" />
          <h1 className="text-2xl font-black gradient-text">נייליסטיות</h1>
          <p className="text-muted-foreground text-sm mt-1">ברוכה הבאה! בואי נתחיל 🌸</p>
        </div>

        <div className="bg-card rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.06)] p-8 border border-border">
          <h2 className="text-xl font-black text-foreground mb-2 text-center">את מי את? ✨</h2>
          <p className="text-sm text-muted-foreground mb-8 text-center">
            בחרי את סוג החשבון שלך כדי שנוכל להתאים לך את החוויה
          </p>

          <div className="grid grid-cols-2 gap-4">
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => handleSelect('NAILIST')}
              disabled={!!selecting}
              className={`flex flex-col items-center gap-3 p-6 rounded-2xl border-2 transition-all cursor-pointer disabled:opacity-60 ${
                selecting === 'NAILIST'
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/40 hover:bg-muted/30'
              }`}
            >
              {selecting === 'NAILIST' ? (
                <Loader2 className="h-10 w-10 text-primary animate-spin" />
              ) : (
                <span className="text-5xl">💅</span>
              )}
              <div className="text-center">
                <p className="font-black text-foreground text-base">נייליסטית</p>
                <p className="text-xs text-muted-foreground mt-1">בעלת עסק</p>
              </div>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => handleSelect('CLIENT')}
              disabled={!!selecting}
              className={`flex flex-col items-center gap-3 p-6 rounded-2xl border-2 transition-all cursor-pointer disabled:opacity-60 ${
                selecting === 'CLIENT'
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/40 hover:bg-muted/30'
              }`}
            >
              {selecting === 'CLIENT' ? (
                <Loader2 className="h-10 w-10 text-primary animate-spin" />
              ) : (
                <span className="text-5xl">🌸</span>
              )}
              <div className="text-center">
                <p className="font-black text-foreground text-base">לקוחה</p>
                <p className="text-xs text-muted-foreground mt-1">מחפשת שירות</p>
              </div>
            </motion.button>
          </div>

          {error && (
            <p className="text-sm text-red-500 font-semibold text-center mt-4">{error}</p>
          )}
        </div>
      </div>
    </div>
  )
}
