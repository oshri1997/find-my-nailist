'use client'

import Link from 'next/link'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { Sparkles, Mail, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { resetPassword } from '@/lib/firebase/auth-helpers'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await resetPassword(email)
      setSent(true)
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code ?? ''
      if (code === 'auth/user-not-found') {
        // Don't reveal whether the email exists
        setSent(true)
      } else {
        setError('שגיאה בשליחת המייל — נסי שוב')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden p-4">
      <div className="absolute inset-0 bg-mesh" />
      <motion.div
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
        className="absolute top-[-20%] right-[-10%] w-[400px] h-[400px] rounded-full opacity-25"
        style={{ background: 'radial-gradient(circle, hsl(326,100%,75%) 0%, transparent 70%)' }}
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
          {sent ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-4"
            >
              <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              </div>
              <h2 className="text-2xl font-black text-gray-800 mb-3">המייל נשלח! 📬</h2>
              <p className="text-gray-400 text-sm leading-relaxed mb-6">
                אם הכתובת קיימת במערכת, שלחנו לך מייל עם קישור לאיפוס הסיסמה.
                <br />בדקי גם את תיקיית הספאם.
              </p>
              <Link href="/login">
                <Button className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 border-0 rounded-xl h-11 font-black shadow-lg shadow-pink-200 gap-2">
                  <ArrowRight className="h-4 w-4" />
                  חזרי להתחברות
                </Button>
              </Link>
            </motion.div>
          ) : (
            <>
              <div className="text-center mb-8">
                <h1 className="text-3xl font-black text-gray-800 mb-2">שכחתי סיסמה 🔑</h1>
                <p className="text-gray-400 text-sm">הכניסי את האימייל שלך ונשלח לך קישור לאיפוס</p>
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
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

                <Button
                  type="submit" disabled={loading}
                  className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 border-0 rounded-xl h-12 font-black text-base shadow-lg shadow-pink-200 disabled:opacity-60"
                >
                  {loading ? 'שולחת...' : 'שלחי לי קישור לאיפוס'}
                </Button>
              </form>

              <p className="text-center text-sm text-gray-400 mt-6">
                נזכרת?{' '}
                <Link href="/login" className="text-pink-500 hover:text-pink-600 font-black">חזרי להתחברות</Link>
              </p>
            </>
          )}
        </div>
      </motion.div>
    </div>
  )
}
