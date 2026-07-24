'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { Lock, ArrowRight, CheckCircle2, AlertCircle, Eye, EyeOff } from 'lucide-react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NailLoader } from '@/components/ui/nail-loader'
import { verifyResetCode, confirmReset } from '@/lib/firebase/auth-helpers'

// Same 8-character minimum enforced at signup — kept consistent so a
// password reset can never leave an account weaker than a fresh signup would.
const MIN_PASSWORD_LENGTH = 8

function friendlyResetError(err: unknown): string {
  const code = (err as { code?: string })?.code ?? ''
  const map: Record<string, string> = {
    'auth/weak-password': `הסיסמה חלשה מדי — לפחות ${MIN_PASSWORD_LENGTH} תווים`,
    'auth/expired-action-code': 'הקישור פג תוקף — בקשי קישור חדש',
    'auth/invalid-action-code': 'הקישור אינו תקין או שכבר נעשה בו שימוש',
    'auth/user-disabled': 'החשבון הושבת',
    'auth/user-not-found': 'לא נמצא חשבון התואם לקישור זה',
    'auth/network-request-failed': 'בעיית חיבור — בדקי את האינטרנט',
  }
  return map[code] ?? 'שגיאה באיפוס הסיסמה — נסי שוב'
}

type VerifyState = 'verifying' | 'valid' | 'invalid'

export default function ResetPasswordPage() {
  const searchParams = useSearchParams()
  const oobCode = searchParams.get('oobCode')

  const [verifyState, setVerifyState] = useState<VerifyState>('verifying')
  const [verifyError, setVerifyError] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!oobCode) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setVerifyError('הקישור אינו תקין')
      setVerifyState('invalid')
      return
    }
    verifyResetCode(oobCode)
      .then(() => setVerifyState('valid'))
      .catch((err) => {
        setVerifyError(friendlyResetError(err))
        setVerifyState('invalid')
      })
  }, [oobCode])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`הסיסמה חייבת להכיל לפחות ${MIN_PASSWORD_LENGTH} תווים`)
      return
    }
    if (password !== confirmPassword) {
      setError('הסיסמאות אינן תואמות')
      return
    }

    setLoading(true)
    try {
      await confirmReset(oobCode!, password)
      setDone(true)
    } catch (err) {
      setError(friendlyResetError(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-sm"
      >
        <div className="text-center mb-10">
          <Link href="/" className="inline-flex items-center gap-2.5 group mb-8">
            <Image src="/logo.png" alt="נייליסטיות לוגו" width={48} height={48} className="group-hover:scale-105 transition-transform" />
            <span className="text-xl font-black gradient-text">נייליסטיות</span>
          </Link>
        </div>

        <div className="bg-card rounded-2xl p-8 border border-border shadow-[0_4px_24px_rgba(245,23,92,0.08)]">
          {verifyState === 'verifying' ? (
            <div className="flex flex-col items-center py-6">
              <NailLoader />
              <p className="text-muted-foreground text-sm mt-4">מאמתת קישור...</p>
            </div>
          ) : verifyState === 'invalid' ? (
            <div className="text-center py-2">
              <div className="w-16 h-16 bg-red-50 dark:bg-red-950/30 rounded-2xl flex items-center justify-center mx-auto mb-5">
                <AlertCircle className="h-8 w-8 text-red-500" />
              </div>
              <h2 className="text-2xl font-black text-foreground mb-3">הקישור לא תקין</h2>
              <p className="text-muted-foreground text-sm leading-relaxed mb-6">{verifyError}</p>
              <Link href="/forgot-password">
                <Button className="bg-primary hover:bg-primary/90 text-white border-0 rounded-xl h-11 font-bold shadow-[0_4px_16px_rgba(245,23,92,0.25)] gap-2 cursor-pointer">
                  <ArrowRight className="h-4 w-4" />
                  בקשי קישור חדש
                </Button>
              </Link>
            </div>
          ) : done ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-2"
            >
              <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl flex items-center justify-center mx-auto mb-5">
                <CheckCircle2 className="h-8 w-8 text-emerald-500" />
              </div>
              <h2 className="text-2xl font-black text-foreground mb-3">הסיסמה עודכנה!</h2>
              <p className="text-muted-foreground text-sm leading-relaxed mb-6">אפשר להתחבר עכשיו עם הסיסמה החדשה.</p>
              <Link href="/login">
                <Button className="bg-primary hover:bg-primary/90 text-white border-0 rounded-xl h-11 font-bold shadow-[0_4px_16px_rgba(245,23,92,0.25)] gap-2 cursor-pointer">
                  <ArrowRight className="h-4 w-4" />
                  חזרי להתחברות
                </Button>
              </Link>
            </motion.div>
          ) : (
            <>
              <div className="text-center mb-8">
                <h1 className="text-2xl font-black text-foreground mb-2">איפוס סיסמה</h1>
                <p className="text-muted-foreground text-sm">בחרי סיסמה חדשה לחשבון שלך</p>
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/40 text-red-600 dark:text-red-400 rounded-xl px-4 py-3 text-sm font-semibold mb-5"
                >
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {error}
                </motion.div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-foreground" htmlFor="password">סיסמה חדשה</label>
                  <div className="relative">
                    <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={`לפחות ${MIN_PASSWORD_LENGTH} תווים`}
                      minLength={MIN_PASSWORD_LENGTH}
                      required
                      className="pr-10 pl-10 rounded-xl border-border focus:border-primary h-12 bg-card"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? 'הסתירי סיסמה' : 'הציגי סיסמה'}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-foreground" htmlFor="confirmPassword">אימות סיסמה</label>
                  <div className="relative">
                    <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                    <Input
                      id="confirmPassword"
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="הקלידי שוב את הסיסמה"
                      required
                      className="pr-10 rounded-xl border-border focus:border-primary h-12 bg-card"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-primary hover:bg-primary/90 text-white border-0 rounded-xl h-12 font-black text-base shadow-[0_4px_16px_rgba(245,23,92,0.25)] cursor-pointer disabled:opacity-60"
                >
                  {loading ? 'מעדכנת...' : 'עדכני סיסמה'}
                </Button>
              </form>
            </>
          )}
        </div>
      </motion.div>
    </div>
  )
}
