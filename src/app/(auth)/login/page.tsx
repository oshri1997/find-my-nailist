'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Mail, Lock, User, ArrowLeft, AlertCircle, Check, Eye, EyeOff } from 'lucide-react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { signInWithEmail, signInWithGoogle, signUpWithEmail } from '@/lib/firebase/auth-helpers'
import { useAuth } from '@/components/auth/auth-provider'
import Link from 'next/link'
import LegalModal from '@/components/auth/LegalModal'
import { sanitizeRedirect } from '@/lib/sanitize-redirect'
import { NailLoader } from '@/components/ui/nail-loader'

type Mode = 'login' | 'register'

const PANEL_CONTENT = {
  login: {
    heading: 'ברוכה השבה',
    sub: 'גלי את עולם הנייל המושלם',
    features: ['חיפוש לפי מיקום', 'הזמנת תור אונליין', 'ביקורות אמיתיות'],
  },
  register: {
    heading: 'הצטרפי אלינו',
    sub: 'בין אם את מחפשת נייליסטית או שאת אחת כזו',
    features: ['הצטרפות תוך שניות', 'פרופיל מותאם אישית', 'קהילה של נייליסטיות ולקוחות'],
  },
}

export default function AuthPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, loading: authLoading } = useAuth()

  const redirectTo = sanitizeRedirect(searchParams.get('redirect'))

  const [mode, setMode] = useState<Mode>(() =>
    searchParams.get('tab') === 'register' ? 'register' : 'login'
  )
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [legalModal, setLegalModal] = useState(false)
  const handlingFormRef = useRef(false)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (searchParams.get('suspended') === '1') setError('החשבון הושבת')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Auth-state redirect (handles Google OAuth callback + email login)
  useEffect(() => {
    if (authLoading || !user || handlingFormRef.current) return
    const pendingMode = (sessionStorage.getItem('pendingMode') as Mode | null) ?? mode
    sessionStorage.removeItem('pendingMode')

    fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        uid: user.uid,
        email: user.email ?? '',
        displayName: user.displayName ?? '',
        photoUrl: user.photoURL ?? undefined,
      }),
    })
      .then(r => ({ isNew: r.status === 201 }))
      .then(({ isNew }) => {
        // Brand new user → role selection onboarding, always — a deep-link
        // redirect (e.g. bounced here from a protected page) must not skip
        // mandatory onboarding for an account that doesn't exist yet.
        if (isNew) {
          router.replace('/onboarding/welcome')
          return
        }

        // Existing account — land on the deep-linked page if there was one,
        // otherwise the actual homepage (no more auto-bounce to a
        // role-specific dashboard: the navbar's own links get her there).
        // No more "registered as a different role" mismatch check: with no
        // role pre-declared at registration, there's nothing left to
        // mismatch — just sign the account in.
        router.replace(redirectTo || '/')
      })
      .catch(() => {
        // Network failure fallback — a registration attempt might be a brand
        // new account (isNew is unknown here since the request itself
        // failed), so route to onboarding first rather than risk skipping it
        // via redirectTo, same reasoning as the isNew branch above.
        if (pendingMode === 'register') {
          router.replace('/onboarding/welcome')
        } else {
          router.replace(redirectTo || '/')
        }
      })
  }, [user, authLoading]) // eslint-disable-line react-hooks/exhaustive-deps

  function switchMode(m: Mode) {
    setMode(m)
    setError('')
    setFirstName('')
    setLastName('')
    setEmail('')
    setPassword('')
    setAgreedToTerms(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    // Manual Hebrew validation (avoids English browser messages)
    if (mode === 'register' && (!firstName.trim() || !lastName.trim())) {
      setError('יש להזין שם פרטי ושם משפחה')
      return
    }
    if (!email.trim() || !email.includes('@')) {
      setError('יש להזין כתובת אימייל תקינה')
      return
    }
    if (!password) {
      setError('יש להזין סיסמה')
      return
    }
    if (mode === 'register' && password.length < 8) {
      setError('הסיסמה חייבת להכיל לפחות 8 תווים')
      return
    }

    setLoading(true)
    handlingFormRef.current = true
    try {
      if (mode === 'login') {
        await signInWithEmail(email, password)
        // Allow useEffect to run and redirect based on actual DB role
        handlingFormRef.current = false
      } else {
        const fullName = `${firstName} ${lastName}`.trim()
        const cred = await signUpWithEmail(email, password, fullName)

        // /api/users below requires the session cookie, which AuthProvider's
        // own onIdTokenChanged listener sets asynchronously in the
        // background — don't race it; establish the cookie explicitly
        // before calling in.
        const idToken = await cred.user.getIdToken()
        await fetch('/api/auth/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: idToken }),
        })

        // The verification email itself is sent later, once the role is
        // chosen (/api/me/set-role) — its copy is role-aware (nailist vs
        // client), which isn't possible yet at this point in the flow.
        const createUserProfile = () => fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            uid: cred.user.uid,
            email,
            displayName: fullName,
            firstName: firstName.trim(),
            lastName: lastName.trim(),
          }),
        })

        // The Firebase account already exists at this point, so a failure
        // here can't just be silently ignored — landing in onboarding with
        // no backing profile doc is a dead end (nothing to load, forever).
        // Retry a couple of times (transient network/500) before surfacing
        // an error; the request itself is idempotent (existing uid → 200).
        let createRes = await createUserProfile()
        for (let attempt = 0; !createRes.ok && attempt < 2; attempt++) {
          await new Promise((r) => setTimeout(r, 500 * (attempt + 1)))
          createRes = await createUserProfile()
        }
        if (!createRes.ok) throw new Error('Failed to create user profile')

        // Role isn't chosen at registration anymore — /onboarding/welcome
        // decides nailist vs client next, same as Google sign-up.
        router.push('/onboarding/welcome')
        handlingFormRef.current = false
        setLoading(false)
      }
    } catch (err: unknown) {
      setError(friendlyError(err, mode))
      handlingFormRef.current = false
      setLoading(false)
    }
  }

  async function handleGoogle() {
    setError('')
    setLoading(true)
    sessionStorage.setItem('pendingMode', mode)
    try {
      await signInWithGoogle()
    } catch (err: unknown) {
      setError(friendlyError(err, mode))
      setLoading(false)
    }
  }

  const panel = PANEL_CONTENT[mode]

  // `loading` stays true for the entire post-sign-in window — Firebase's own
  // auth-state sync, then the /api/users upsert + router.replace in the
  // effect above — not just the initial popup. Replacing the whole form with
  // a clear full-screen loader avoids the confusing alternative: a static,
  // seemingly-idle page with only a disabled Google button as feedback,
  // while the *other* (submit) button's "מתחברת..." label doesn't match
  // what was actually clicked.
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <NailLoader text="מתחברת..." />
      </div>
    )
  }

  return (
    <>
    <div className="min-h-screen flex bg-background">
      {/* ── Form panel (first in DOM = right side in RTL) ── */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="text-center mb-8">
            <Link href="/" className="inline-flex items-center gap-2.5 group">
              <Image src="/logo.png" alt="נייליסטיות לוגו" width={48} height={48} className="group-hover:scale-105 transition-transform" />
              <span className="text-xl font-black gradient-text">נייליסטיות</span>
            </Link>
          </div>

          {/* Login / Register toggle */}
          <div className="flex rounded-xl bg-muted p-1 mb-7">
            {(['login', 'register'] as Mode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => switchMode(m)}
                className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all cursor-pointer ${
                  mode === m
                    ? 'bg-card text-primary shadow-sm shadow-primary/30'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {m === 'login' ? 'התחברות' : 'הרשמה'}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={mode}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
            >
              {/* Heading */}
              <div className="mb-6">
                <h1 className="text-2xl font-black text-foreground">
                  {mode === 'login' ? 'ברוכה השבה' : 'יצירת חשבון חדש'}
                </h1>
                <p className="text-muted-foreground text-sm mt-1">
                  {mode === 'login' ? 'התחברי לחשבון שלך' : 'חינמי לחלוטין, מוכן תוך שניות'}
                </p>
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 bg-red-50 border border-red-100 text-red-600 dark:bg-red-950/30 dark:border-red-900/40 dark:text-red-400 rounded-xl px-4 py-3 text-sm font-semibold mb-5"
                >
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {error}
                </motion.div>
              )}

              <form onSubmit={handleSubmit} noValidate className="space-y-4">
                {mode === 'register' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-foreground" htmlFor="firstName">שם פרטי</label>
                      <div className="relative">
                        <User className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                        <Input
                          id="firstName" type="text" value={firstName}
                          onChange={e => setFirstName(e.target.value)}
                          placeholder="שרה"
                          required
                          className="pr-10 rounded-xl border-border focus:border-primary h-12 bg-card"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-foreground" htmlFor="lastName">שם משפחה</label>
                      <div className="relative">
                        <User className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                        <Input
                          id="lastName" type="text" value={lastName}
                          onChange={e => setLastName(e.target.value)}
                          placeholder="לוי"
                          required
                          className="pr-10 rounded-xl border-border focus:border-primary h-12 bg-card"
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-sm font-bold text-foreground" htmlFor="email">אימייל</label>
                  <div className="relative">
                    <Mail className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                    <Input
                      id="email" type="email" value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="you@example.com" required
                      className="pr-10 rounded-xl border-border focus:border-primary h-12 bg-card"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-bold text-foreground" htmlFor="password">סיסמה</label>
                    {mode === 'login' && (
                      <Link href="/forgot-password" className="text-xs text-primary hover:text-primary/80 font-semibold">
                        שכחתי סיסמה
                      </Link>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                    <Input
                      id="password" type={showPassword ? 'text' : 'password'} value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder={mode === 'register' ? 'לפחות 8 תווים' : '••••••••'}
                      minLength={mode === 'register' ? 8 : undefined}
                      required
                      className="pr-10 pl-10 rounded-xl border-border focus:border-primary h-12 bg-card"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(v => !v)}
                      aria-label={showPassword ? 'הסתירי סיסמה' : 'הציגי סיסמה'}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {mode === 'register' && (
                  <label className={`flex items-start gap-2.5 cursor-pointer rounded-xl border px-3 py-2.5 transition-colors ${agreedToTerms ? 'border-primary/40 bg-primary/5' : 'border-border'}`}>
                    <input
                      type="checkbox"
                      checked={agreedToTerms}
                      onChange={e => setAgreedToTerms(e.target.checked)}
                      className="mt-0.5 h-4 w-4 shrink-0 accent-primary cursor-pointer"
                    />
                    <span className="text-xs text-muted-foreground leading-relaxed">
                      קראתי ואני מסכים/ה ל
                      <button
                        type="button"
                        onClick={e => { e.preventDefault(); setLegalModal(true) }}
                        className="text-primary hover:underline font-semibold mx-0.5"
                      >
                        תנאי שימוש ומדיניות פרטיות
                      </button>
                    </span>
                  </label>
                )}

                <Button
                  type="submit" disabled={loading || authLoading || (mode === 'register' && !agreedToTerms)}
                  className="w-full bg-primary hover:bg-primary/90 text-white border-0 rounded-xl h-12 font-black text-base shadow-[0_4px_16px_rgba(194,84,45,0.30)] gap-2 group cursor-pointer disabled:opacity-60"
                >
                  {loading
                    ? (mode === 'login' ? 'מתחברת...' : 'יוצרת חשבון...')
                    : mode === 'login'
                    ? 'התחברי'
                    : 'צרי חשבון'}
                  {!loading && <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />}
                </Button>
              </form>

              <div className="relative my-5">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-background px-3 text-muted-foreground font-medium">או</span>
                </div>
              </div>

              <Button
                type="button" variant="outline" disabled={loading || authLoading} onClick={handleGoogle}
                className="w-full rounded-xl h-12 border-border font-semibold gap-3 hover:border-primary/40 hover:bg-primary/10 transition-colors cursor-pointer disabled:opacity-60 bg-card"
              >
                <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                {mode === 'login' ? 'כניסה עם Google' : 'הרשמה עם Google'}
              </Button>

              <p className="text-center text-sm text-muted-foreground mt-5">
                {mode === 'login' ? (
                  <>אין לך חשבון עדיין?{' '}
                    <button type="button" onClick={() => switchMode('register')} className="text-primary hover:text-primary/80 font-black">הרשמי עכשיו</button>
                  </>
                ) : (
                  <>כבר יש לך חשבון?{' '}
                    <button type="button" onClick={() => switchMode('login')} className="text-primary hover:text-primary/80 font-black">התחברי</button>
                  </>
                )}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* ── Decorative panel (second in DOM = left side in RTL) ── */}
      <div className="hidden lg:flex lg:w-5/12 xl:w-1/2 bg-gradient-to-br from-orange-500 via-red-500 to-amber-600 items-center justify-center relative overflow-hidden">
        <div className="absolute top-[-15%] left-[-15%] w-80 h-80 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute bottom-[-15%] right-[-15%] w-96 h-96 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute inset-0 dot-pattern pointer-events-none opacity-10" />

        <AnimatePresence mode="wait">
          <motion.div
            key={mode}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -24 }}
            transition={{ duration: 0.35 }}
            className="relative z-10 text-white text-center px-10 max-w-xs"
          >
            <div className="mx-auto mb-7 w-16 h-16 rounded-2xl overflow-hidden shadow-[0_8px_24px_rgba(0,0,0,0.2)]">
              <Image src="/logo.png" alt="נייליסטיות לוגו" width={64} height={64} className="w-full h-full object-cover" />
            </div>
            <h2 className="text-3xl font-black mb-2 leading-tight">{panel.heading}</h2>
            <p className="text-white/70 text-base mb-8">{panel.sub}</p>
            <div className="flex flex-col gap-2.5 text-right">
              {panel.features.map((f, i) => (
                <motion.div
                  key={`${mode}-${i}`}
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + i * 0.1 }}
                  className="flex items-center gap-3 bg-white/15 rounded-xl px-4 py-2.5"
                >
                  <div className="w-5 h-5 rounded-full bg-white/25 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                  <span className="text-sm font-semibold">{f}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>

    {legalModal && (
      <LegalModal
        onAgree={() => setAgreedToTerms(true)}
        onClose={() => setLegalModal(false)}
      />
    )}
    </>
  )
}

function friendlyError(err: unknown, mode: Mode): string {
  const code = (err as { code?: string })?.code ?? ''
  const message = (err as { message?: string })?.message ?? ''
  if (message.includes('not initialized') || message.includes('environment variables')) return 'שגיאת תצורה — פנה לתמיכה'
  const loginMap: Record<string, string> = {
    'auth/user-not-found': 'לא נמצא חשבון עם כתובת אימייל זו',
    'auth/wrong-password': 'סיסמה שגויה',
    'auth/invalid-credential': 'אימייל או סיסמה שגויים',
    'auth/too-many-requests': 'יותר מדי ניסיונות — נסי שוב מאוחר יותר',
    'auth/user-disabled': 'החשבון הושבת',
    'auth/popup-closed-by-user': 'החלון נסגר לפני סיום ההתחברות',
    'auth/network-request-failed': 'בעיית חיבור — בדקי את האינטרנט',
  }
  const registerMap: Record<string, string> = {
    'auth/email-already-in-use': 'כתובת האימייל כבר קיימת במערכת',
    'auth/weak-password': 'הסיסמה חלשה מדי — לפחות 8 תווים',
    'auth/invalid-email': 'כתובת אימייל לא תקינה',
    'auth/popup-closed-by-user': 'החלון נסגר לפני סיום ההתחברות',
    'auth/network-request-failed': 'בעיית חיבור — בדקי את האינטרנט',
  }
  const map = mode === 'login' ? loginMap : registerMap
  return map[code] ?? (mode === 'login' ? 'שגיאה בהתחברות — נסי שוב' : 'שגיאה בהרשמה — נסי שוב')
}
