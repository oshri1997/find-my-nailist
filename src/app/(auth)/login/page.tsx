'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Mail, Lock, User, ArrowLeft, AlertCircle } from 'lucide-react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { signInWithEmail, signInWithGoogle, signUpWithEmail } from '@/lib/firebase/auth-helpers'
import { useAuth } from '@/components/auth/auth-provider'
import Link from 'next/link'
import LegalModal from '@/components/auth/LegalModal'

type Mode = 'login' | 'register'
type Role = 'nailist' | 'client'

const PANEL_CONTENT = {
  login: {
    heading: 'ברוכה השבה! 👋',
    sub: 'גלי את עולם הנייל המושלם —\nהזמיני תור בקליק אחד',
    emojis: ['💅', '🌸', '✨'],
  },
  register: {
    heading: 'הצטרפי אלינו! 💅',
    sub: 'צרי חשבון חינמי בכמה שניות\nוקבלי לקוחות חדשות',
    emojis: ['✨', '💎', '🌸'],
  },
}

export default function AuthPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, loading: authLoading } = useAuth()

  const redirectTo = searchParams.get('redirect') ?? ''

  const [mode, setMode] = useState<Mode>(() =>
    searchParams.get('tab') === 'register' ? 'register' : 'login'
  )
  const [role, setRole] = useState<Role>('nailist')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [legalModal, setLegalModal] = useState(false)
  const handlingFormRef = useRef(false)

  // Auth-state redirect (handles Google OAuth callback + email login)
  useEffect(() => {
    if (authLoading || !user || handlingFormRef.current) return
    const pendingRole = (sessionStorage.getItem('pendingRole') as Role | null) ?? role
    const pendingMode = (sessionStorage.getItem('pendingMode') as Mode | null) ?? mode
    sessionStorage.removeItem('pendingRole')
    sessionStorage.removeItem('pendingMode')

    fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        uid: user.uid,
        email: user.email ?? '',
        displayName: user.displayName ?? '',
        photoUrl: user.photoURL ?? undefined,
        role: pendingRole === 'nailist' ? 'NAILIST' : 'CLIENT',
      }),
    })
      .then(async r => {
        const isNew = r.status === 201
        const json = await r.json()
        return { isNew, data: json.data }
      })
      .then(({ isNew, data }) => {
        // Brand new user → role selection onboarding
        if (isNew) {
          router.replace(redirectTo || '/onboarding/welcome')
          return
        }

        const actualRole: Role = data?.role === 'NAILIST' ? 'nailist' : 'client'

        // Registering via Google but account already exists with a different role
        if (pendingMode === 'register' && actualRole !== pendingRole) {
          setError(
            actualRole === 'nailist'
              ? 'כתובת האימייל כבר רשומה כנייליסטית — אנא התחברי כנייליסטית'
              : 'כתובת האימייל כבר רשומה כלקוחה — אנא התחברי כלקוחה'
          )
          handlingFormRef.current = false
          setLoading(false)
          return
        }

        // Redirect existing user based on actual role stored in DB
        if (redirectTo) {
          router.replace(redirectTo)
        } else if (actualRole === 'nailist') {
          router.replace(pendingMode === 'register' ? '/onboarding' : '/')
        } else {
          router.replace(pendingMode === 'register' ? '/onboarding/client' : '/search')
        }
      })
      .catch(() => {
        // Network failure fallback
        if (redirectTo) {
          router.replace(redirectTo)
        } else if (pendingMode === 'register') {
          router.replace('/onboarding/welcome')
        } else if (pendingRole === 'nailist') {
          router.replace('/')
        } else {
          router.replace('/search')
        }
      })
  }, [user, authLoading]) // eslint-disable-line react-hooks/exhaustive-deps

  function switchMode(m: Mode) {
    setMode(m)
    setError('')
    setName('')
    setEmail('')
    setPassword('')
    setAgreedToTerms(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    handlingFormRef.current = true
    try {
      if (mode === 'login') {
        await signInWithEmail(email, password)
        // Allow useEffect to run and redirect based on actual DB role
        handlingFormRef.current = false
      } else {
        const cred = await signUpWithEmail(email, password, name)
        await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            uid: cred.user.uid,
            email,
            displayName: name,
            role: role === 'nailist' ? 'NAILIST' : 'CLIENT',
          }),
        })
        router.push(redirectTo || (role === 'nailist' ? '/onboarding' : '/onboarding/client'))
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
    sessionStorage.setItem('pendingRole', role)
    sessionStorage.setItem('pendingMode', mode)
    try {
      await signInWithGoogle()
    } catch (err: unknown) {
      setError(friendlyError(err, mode))
      setLoading(false)
    }
  }

  const panel = PANEL_CONTENT[mode]

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
                  {mode === 'login' ? 'ברוכה השבה! 👋' : 'יצירת חשבון חדש 🌸'}
                </h1>
                <p className="text-muted-foreground text-sm mt-1">
                  {mode === 'login' ? 'התחברי לחשבון שלך' : 'חינמי לחלוטין, מוכן תוך שניות'}
                </p>
              </div>

              {/* Role selector — only relevant when registering */}
              {mode === 'register' && (
                <div className="flex rounded-xl bg-muted p-1 mb-6">
                  {(['nailist', 'client'] as Role[]).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRole(r)}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-bold transition-all cursor-pointer ${
                        role === r
                          ? 'bg-card text-primary shadow-sm shadow-primary/30'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {r === 'nailist' ? '💅 נייליסטית' : '🌸 לקוחה'}
                    </button>
                  ))}
                </div>
              )}

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

              <form onSubmit={handleSubmit} className="space-y-4">
                {mode === 'register' && (
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-foreground" htmlFor="name">
                      {role === 'nailist' ? 'שם העסק / שם מלא' : 'שם מלא'}
                    </label>
                    <div className="relative">
                      <User className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                      <Input
                        id="name" type="text" value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder={role === 'nailist' ? 'סטודיו שרה' : 'שרה לוי'}
                        required
                        className="pr-10 rounded-xl border-border focus:border-primary h-12 bg-card"
                      />
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
                      id="password" type="password" value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder={mode === 'register' ? 'לפחות 8 תווים' : '••••••••'}
                      minLength={mode === 'register' ? 8 : undefined}
                      required
                      className="pr-10 rounded-xl border-border focus:border-primary h-12 bg-card"
                    />
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
                  className="w-full bg-primary hover:bg-primary/90 text-white border-0 rounded-xl h-12 font-black text-base shadow-[0_4px_16px_rgba(236,72,153,0.30)] gap-2 group cursor-pointer disabled:opacity-60"
                >
                  {loading
                    ? (mode === 'login' ? 'מתחברת...' : 'יוצרת חשבון...')
                    : mode === 'login'
                    ? 'התחברי'
                    : (role === 'nailist' ? 'הצטרפי כנייליסטית' : 'צרי חשבון')}
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
      <div className="hidden lg:flex lg:w-5/12 xl:w-1/2 bg-gradient-to-br from-pink-500 via-fuchsia-500 to-purple-600 items-center justify-center relative overflow-hidden">
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
            className="relative z-10 text-white text-center px-12 max-w-sm"
          >
            <div className="mx-auto mb-8">
              <Image src="/logo.png" alt="נייליסטיות לוגו" width={96} height={96} />
            </div>
            <h2 className="text-4xl font-black mb-4 leading-tight">{panel.heading}</h2>
            <p className="text-white/80 text-lg leading-relaxed mb-8 whitespace-pre-line">{panel.sub}</p>
            <div className="flex justify-center gap-4 text-5xl">
              {panel.emojis.map((e, i) => (
                <motion.span
                  key={`${mode}-${i}`}
                  animate={{ y: [0, -8, 0] }}
                  transition={{ duration: 2, repeat: Infinity, delay: i * 0.4 }}
                >
                  {e}
                </motion.span>
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
