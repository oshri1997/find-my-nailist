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
        setSent(true)
      } else {
        setError('שגיאה בשליחת המייל — נסי שוב')
      }
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
        {/* Logo */}
        <div className="text-center mb-10">
          <Link href="/" className="inline-flex items-center gap-2.5 group mb-8">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-[0_4px_16px_rgba(236,72,153,0.35)] group-hover:scale-105 transition-transform">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-black gradient-text">נייליסטיות</span>
          </Link>
        </div>

        <div className="bg-card rounded-2xl p-8 border border-border shadow-[0_4px_24px_rgba(236,72,153,0.08)]">
          {sent ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-2"
            >
              <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl flex items-center justify-center mx-auto mb-5">
                <CheckCircle2 className="h-8 w-8 text-emerald-500" />
              </div>
              <h2 className="text-2xl font-black text-foreground mb-3">המייל נשלח!</h2>
              <p className="text-muted-foreground text-sm leading-relaxed mb-6">
                אם הכתובת קיימת במערכת, שלחנו לך מייל עם קישור לאיפוס הסיסמה.
                <br />בדקי גם את תיקיית הספאם.
              </p>
              <Link href="/login">
                <Button className="bg-primary hover:bg-primary/90 text-white border-0 rounded-xl h-11 font-bold shadow-[0_4px_16px_rgba(236,72,153,0.25)] gap-2 cursor-pointer">
                  <ArrowRight className="h-4 w-4" />
                  חזרי להתחברות
                </Button>
              </Link>
            </motion.div>
          ) : (
            <>
              <div className="text-center mb-8">
                <h1 className="text-2xl font-black text-foreground mb-2">שכחתי סיסמה</h1>
                <p className="text-muted-foreground text-sm">הכניסי את האימייל שלך ונשלח לך קישור לאיפוס</p>
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
                  <label className="text-sm font-bold text-foreground" htmlFor="email">אימייל</label>
                  <div className="relative">
                    <Mail className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      required
                      className="pr-10 rounded-xl border-border focus:border-primary h-12 bg-card"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-primary hover:bg-primary/90 text-white border-0 rounded-xl h-12 font-black text-base shadow-[0_4px_16px_rgba(236,72,153,0.25)] cursor-pointer disabled:opacity-60"
                >
                  {loading ? 'שולחת...' : 'שלחי לי קישור לאיפוס'}
                </Button>
              </form>

              <p className="text-center text-sm text-muted-foreground mt-6">
                נזכרת?{' '}
                <Link href="/login" className="text-primary hover:text-primary/80 font-black">חזרי להתחברות</Link>
              </p>
            </>
          )}
        </div>
      </motion.div>
    </div>
  )
}
