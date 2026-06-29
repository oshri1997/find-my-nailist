'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { ArrowLeft, Phone, Loader2, Check, User } from 'lucide-react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PlacesInput, type PlaceResult } from '@/components/ui/places-input'
import { useAuth } from '@/components/auth/auth-provider'

const STEPS = [
  { label: 'שם' },
  { label: 'טלפון' },
  { label: 'מיקום' },
]

export default function ClientOnboardingPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [lat, setLat] = useState<number | undefined>()
  const [lng, setLng] = useState<number | undefined>()
  const [agreedToTerms, setAgreedToTerms] = useState(false)

  useEffect(() => {
    if (authLoading) return
    if (!user) router.replace('/login')
  }, [user, authLoading, router])

  async function handleFinish() {
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/me/client-profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phoneNumber: phone,
          address: address || undefined,
          city: city || undefined,
          latitude: lat,
          longitude: lng,
        }),
      })
      if (!res.ok) throw new Error('failed')
      setDone(true)
      setTimeout(() => router.push('/search'), 1800)
    } catch {
      setError('שגיאה בשמירה — נסי שוב')
    } finally {
      setSaving(false)
    }
  }

  if (authLoading || !user) return null

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Image src="/logo.png" alt="נייליסטיות לוגו" width={56} height={56} className="mx-auto mb-1" />
          <h1 className="text-2xl font-black gradient-text">נייליסטיות</h1>
          <p className="text-muted-foreground text-sm mt-1">בואי נכיר אותך קצת יותר</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-3 mb-8">
          {STEPS.map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-black transition-all ${
                i < step ? 'bg-primary text-white' :
                i === step ? 'bg-primary text-white shadow-[0_0_12px_rgba(236,72,153,0.4)]' :
                'bg-muted text-muted-foreground'
              }`}>
                {i < step ? <Check className="h-4 w-4" /> : i + 1}
              </div>
              <span className={`text-xs font-semibold hidden sm:block ${i === step ? 'text-foreground' : 'text-muted-foreground'}`}>
                {s.label}
              </span>
              {i < STEPS.length - 1 && <div className={`w-8 h-0.5 rounded-full mx-1 ${i < step ? 'bg-primary' : 'bg-border'}`} />}
            </div>
          ))}
        </div>

        <div className="bg-card rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.06)] p-8 border border-border">
          <AnimatePresence mode="wait">
            {done ? (
              <motion.div
                key="done"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-4"
              >
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                  <Check className="h-8 w-8 text-green-600" />
                </div>
                <h2 className="text-xl font-black text-foreground mb-2">הפרופיל שלך מוכן!</h2>
                <p className="text-muted-foreground text-sm">מעבירה אותך לחיפוש נייליסטיות...</p>
              </motion.div>

            ) : step === 0 ? (
              <motion.div
                key="step0"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <h2 className="text-xl font-black text-foreground mb-1">מה השם שלך?</h2>
                <p className="text-sm text-muted-foreground mb-6">כדי שהנייליסטית תדע איך לפנות אלייך</p>

                <div className="space-y-4 mb-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-foreground" htmlFor="firstName">
                      שם פרטי <span className="text-primary">*</span>
                    </label>
                    <div className="relative">
                      <User className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                      <Input
                        id="firstName"
                        type="text"
                        value={firstName}
                        onChange={e => setFirstName(e.target.value)}
                        placeholder="שרה"
                        className="pr-10 rounded-xl border-border focus:border-primary h-12 bg-card"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-foreground" htmlFor="lastName">
                      שם משפחה <span className="text-primary">*</span>
                    </label>
                    <div className="relative">
                      <User className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                      <Input
                        id="lastName"
                        type="text"
                        value={lastName}
                        onChange={e => setLastName(e.target.value)}
                        placeholder="כהן"
                        className="pr-10 rounded-xl border-border focus:border-primary h-12 bg-card"
                      />
                    </div>
                  </div>
                </div>

                {error && <p className="text-sm text-red-500 font-semibold mb-4">{error}</p>}

                <Button
                  type="button"
                  disabled={!firstName.trim() || !lastName.trim()}
                  onClick={() => setStep(1)}
                  className="w-full bg-primary hover:bg-primary/90 text-white border-0 rounded-xl h-12 font-black text-base shadow-[0_4px_16px_rgba(236,72,153,0.30)] gap-2 group cursor-pointer disabled:opacity-60"
                >
                  המשיכי
                  <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
                </Button>
              </motion.div>

            ) : step === 1 ? (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <h2 className="text-xl font-black text-foreground mb-1">מה מספר הטלפון שלך?</h2>
                <p className="text-sm text-muted-foreground mb-6">כדי שהנייליסטית תוכל ליצור איתך קשר</p>

                <div className="space-y-2 mb-6">
                  <label className="text-sm font-bold text-foreground" htmlFor="phone">
                    מספר טלפון <span className="text-primary">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                    <Input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      placeholder="050-1234567"
                      className="pr-10 rounded-xl border-border focus:border-primary h-12 bg-card"
                      dir="ltr"
                    />
                  </div>
                </div>

                {error && <p className="text-sm text-red-500 font-semibold mb-4">{error}</p>}

                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep(0)}
                    className="flex-1 rounded-xl h-12 border-border font-semibold cursor-pointer"
                  >
                    חזרה
                  </Button>
                  <Button
                    type="button"
                    disabled={!phone.trim()}
                    onClick={() => setStep(2)}
                    className="flex-1 bg-primary hover:bg-primary/90 text-white border-0 rounded-xl h-12 font-black shadow-[0_4px_16px_rgba(236,72,153,0.30)] gap-2 group cursor-pointer disabled:opacity-60"
                  >
                    המשיכי
                    <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
                  </Button>
                </div>
              </motion.div>

            ) : (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <h2 className="text-xl font-black text-foreground mb-1">איפה את גרה?</h2>
                <p className="text-sm text-muted-foreground mb-6">אופציונלי — עוזר למצוא נייליסטיות קרובות</p>

                <div className="space-y-2 mb-6">
                  <label className="text-sm font-bold text-foreground">כתובת</label>
                  <PlacesInput
                    value={address}
                    onChange={setAddress}
                    onPlaceSelect={(result: PlaceResult) => {
                      setAddress(result.address)
                      setCity(result.city)
                      setLat(result.lat)
                      setLng(result.lng)
                    }}
                    placeholder="רחוב, עיר"
                  />
                </div>

                {error && <p className="text-sm text-red-500 font-semibold mb-4">{error}</p>}

                <label className="flex items-start gap-3 mb-5 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={agreedToTerms}
                    onChange={e => setAgreedToTerms(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-border accent-pink-500 shrink-0 cursor-pointer"
                  />
                  <span className="text-sm text-muted-foreground leading-snug group-hover:text-foreground transition-colors">
                    קראתי ואני מסכים/ה ל
                    <Link href="/terms" target="_blank" className="text-primary font-semibold hover:underline">תנאי שימוש</Link>
                    {' '}ו
                    <Link href="/privacy" target="_blank" className="text-primary font-semibold hover:underline">מדיניות פרטיות</Link>
                  </span>
                </label>

                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep(1)}
                    disabled={saving}
                    className="flex-1 rounded-xl h-12 border-border font-semibold cursor-pointer"
                  >
                    חזרה
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleFinish}
                    disabled={saving || !agreedToTerms}
                    className="flex-1 rounded-xl h-12 border-border font-semibold cursor-pointer disabled:opacity-60"
                  >
                    דלגי
                  </Button>
                  <Button
                    type="button"
                    disabled={saving || !agreedToTerms}
                    onClick={handleFinish}
                    className="flex-1 bg-primary hover:bg-primary/90 text-white border-0 rounded-xl h-12 font-black shadow-[0_4px_16px_rgba(236,72,153,0.30)] gap-2 cursor-pointer disabled:opacity-60"
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'שמרי'}
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {step < STEPS.length && !done && (
          <p className="text-center text-xs text-muted-foreground mt-4">
            ניתן לעדכן פרטים אלה בכל עת מהפרופיל שלך
          </p>
        )}
      </div>
    </div>
  )
}
