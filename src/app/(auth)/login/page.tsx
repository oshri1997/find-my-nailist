'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Sparkles, Mail, Lock, ArrowLeft, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { signInWithEmail, signInWithGoogle } from '@/lib/firebase/auth-helpers'
import { useAuth } from '@/components/auth/auth-provider'

type Role = 'nailist' | 'client'

export default function LoginPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [role, setRole] = useState<Role>('nailist')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!authLoading && user) {
      // Ensure the user record exists then redirect based on chosen role
      fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: user.uid,
          email: user.email ?? '',
          displayName: user.displayName ?? '',
          photoUrl: user.photoURL ?? undefined,
          role: role === 'nailist' ? 'NAILIST' : 'CLIENT',
        }),
      }).finally(() => {
        router.replace(role === 'nailist' ? '/dashboard/nailist' : '/search')
      })
    }
  }, [user, authLoading, router, role])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signInWithEmail(email, password)
    } catch (err: unknown) {
      setError(friendlyError(err))
      setLoading(false)
    }
  }

  async function handleGoogle() {
    setError('')
    setLoading(true)
    try {
      await signInWithGoogle()
    } catch (err: unknown) {
      setError(friendlyError(err))
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden p-4">
      <div className="absolute inset-0 bg-mesh" />
      <motion.div
        animate={{ scale: [1, 1.2, 1], rotate: [0, 45, 0] }}
        transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
        className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full opacity-30"
        style={{ background: 'radial-gradient(circle, hsl(326,100%,75%) 0%, transparent 70%)' }}
      />
      <motion.div
        animate={{ scale: [1.2, 1, 1.2], rotate: [45, 0, 45] }}
        transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
        className="absolute bottom-[-20%] left-[-10%] w-[400px] h-[400px] rounded-full opacity-30"
        style={{ background: 'radial-gradient(circle, hsl(271,91%,75%) 0%, transparent 70%)' }}
      />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 group">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center shadow-lg shadow-pink-200 group-hover:scale-110 transition-transform">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <span className="text-2xl font-black gradient-text">מצאי נייליסטית</span>
          </Link>
        </div>

        <div className="glass rounded-3xl p-8 shadow-2xl shadow-pink-100/50">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-black text-gray-800 mb-2">ברוכה השבה! 👋</h1>
            <p className="text-gray-400 font-medium">התחברי לחשבון שלך</p>
          </div>

          {/* Role selector */}
          <div className="flex rounded-2xl bg-gray-100 p-1 mb-6">
            <button
              type="button"
              onClick={() => setRole('nailist')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-black transition-all ${
                role === 'nailist'
                  ? 'bg-white shadow-sm text-gray-800'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              💅 נייליסטית
            </button>
            <button
              type="button"
              onClick={() => setRole('client')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-black transition-all ${
                role === 'client'
                  ? 'bg-white shadow-sm text-gray-800'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              🌸 לקוחה
            </button>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 bg-red-50 border border-red-100 text-red-600 rounded-xl px-4 py-3 text-sm font-semibold mb-5"
            >
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-600" htmlFor="email">אימייל</label>
              <div className="relative">
                <Mail className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-pink-400" />
                <Input
                  id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com" required
                  className="pr-10 rounded-xl border-gray-200 focus:border-pink-300 h-12"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-bold text-gray-600" htmlFor="password">סיסמה</label>
                <Link href="/forgot-password" className="text-xs text-pink-500 hover:text-pink-600 font-semibold">
                  שכחתי סיסמה
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-pink-400" />
                <Input
                  id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••" required
                  className="pr-10 rounded-xl border-gray-200 focus:border-pink-300 h-12"
                />
              </div>
            </div>

            <Button
              type="submit" disabled={loading || authLoading}
              className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 border-0 rounded-xl h-12 font-black text-base shadow-lg shadow-pink-200 gap-2 group disabled:opacity-60"
            >
              {loading ? 'מתחברת...' : role === 'nailist' ? 'כניסה כנייליסטית' : 'כניסה כלקוחה'}
              {!loading && <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />}
            </Button>
          </form>

          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white/80 px-3 text-gray-400 font-medium">או</span>
            </div>
          </div>

          <Button
            type="button" variant="outline" disabled={loading || authLoading} onClick={handleGoogle}
            className="w-full rounded-xl h-12 border-gray-200 font-bold gap-3 hover:border-pink-300 hover:text-pink-600 transition-colors disabled:opacity-60"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            המשיכי עם Google
          </Button>

          <p className="text-center text-sm text-gray-400 mt-6">
            אין לך חשבון עדיין?{' '}
            <Link href="/register" className="text-pink-500 hover:text-pink-600 font-black">הרשמי עכשיו</Link>
          </p>
        </div>
      </motion.div>
    </div>
  )
}

function friendlyError(err: unknown): string {
  const code = (err as { code?: string })?.code ?? ''
  const message = (err as { message?: string })?.message ?? ''
  if (message.includes('not initialized') || message.includes('environment variables')) {
    return 'שגיאת תצורה — פנה לתמיכה'
  }
  const map: Record<string, string> = {
    'auth/user-not-found': 'לא נמצא חשבון עם כתובת אימייל זו',
    'auth/wrong-password': 'סיסמה שגויה',
    'auth/invalid-credential': 'אימייל או סיסמה שגויים',
    'auth/too-many-requests': 'יותר מדי ניסיונות — נסי שוב מאוחר יותר',
    'auth/user-disabled': 'החשבון הושבת',
    'auth/popup-closed-by-user': 'החלון נסגר לפני סיום ההתחברות',
    'auth/network-request-failed': 'בעיית חיבור — בדקי את האינטרנט',
    'auth/operation-not-allowed': 'שיטת התחברות זו אינה מאופשרת',
  }
  return map[code] ?? 'שגיאה בהתחברות — נסי שוב'
}
