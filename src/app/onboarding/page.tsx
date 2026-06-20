'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, ArrowLeft, ArrowRight, ImagePlus, Plus, X, Loader2, MapPin, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PlacesInput, type PlaceResult } from '@/components/ui/places-input'
import { useAuth } from '@/components/auth/auth-provider'

const STEPS = [
  { label: 'כתובת העסק', emoji: '📍' },
  { label: 'תמונות עבודות', emoji: '🖼️' },
  { label: 'שירותים', emoji: '✂️' },
  { label: 'רשתות חברתיות', emoji: '📱' },
  { label: 'שעות פעילות', emoji: '⏰' },
]

const DAYS_HE = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת']

interface Photo { id: string; url: string }
interface Service { id: string; name: string; durationMinutes: number; price: number }
interface DayHours { dayOfWeek: number; isActive: boolean; startTime: string; endTime: string }

function defaultHours(): DayHours[] {
  return DAYS_HE.map((_, i) => ({
    dayOfWeek: i,
    isActive: i < 6,
    startTime: '09:00',
    endTime: '18:00',
  }))
}

export default function OnboardingPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [profileId, setProfileId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Step 1 — address
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [lat, setLat] = useState<number | undefined>()
  const [lng, setLng] = useState<number | undefined>()

  // Step 2 — photos
  const [photos, setPhotos] = useState<Photo[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Step 3 — services
  const [services, setServices] = useState<Service[]>([])
  const [svcName, setSvcName] = useState('')
  const [svcDuration, setSvcDuration] = useState(60)
  const [svcPrice, setSvcPrice] = useState('')

  // Step 4 — social links (optional)
  const [instagramUrl, setInstagramUrl] = useState('')
  const [tiktokUrl, setTiktokUrl] = useState('')

  // Step 5 — working hours
  const [workingHours, setWorkingHours] = useState<DayHours[]>(defaultHours)

  useEffect(() => {
    if (authLoading) return
    if (!user) { router.replace('/login'); return }
    fetch('/api/me/nailist-profile')
      .then(r => r.json())
      .then(({ data }) => setProfileId(data?.id ?? null))
      .catch(() => router.replace('/login'))
  }, [user, authLoading, router])

  function handlePlaceSelect(result: PlaceResult) {
    setAddress(result.address)
    setCity(result.city)
    setLat(result.lat)
    setLng(result.lng)
  }

  async function saveAddress() {
    if (!profileId || !lat) return
    setSaving(true)
    setError('')
    try {
      const res = await fetch(`/api/nailists/${profileId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, city, latitude: lat, longitude: lng }),
      })
      if (!res.ok) throw new Error()
      setStep(1)
    } catch {
      setError('שגיאה בשמירת הכתובת — נסי שוב')
    } finally {
      setSaving(false)
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !profileId) return
    if (file.size > 5 * 1024 * 1024) { setError('הקובץ גדול מדי — מקסימום 5MB'); return }
    setError('')
    setUploading(true)
    setUploadProgress(0)
    try {
      const { uploadPortfolioPhoto } = await import('@/lib/firebase/storage')
      const { url, storageKey } = await uploadPortfolioPhoto(profileId, file, setUploadProgress)
      const res = await fetch('/api/portfolio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nailistProfileId: profileId, url, storageKey, displayOrder: photos.length }),
      })
      if (res.ok) {
        const { data } = await res.json()
        setPhotos(prev => [...prev, data])
      } else {
        setError('שגיאה בשמירת התמונה')
      }
    } catch {
      setError('שגיאה בהעלאה — ודאי ש-Storage מופעל ב-Firebase')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function addService() {
    if (!svcName.trim() || !svcPrice || !profileId) return
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nailistProfileId: profileId,
          name: svcName.trim(),
          durationMinutes: svcDuration,
          price: parseFloat(svcPrice),
          currency: 'ILS',
        }),
      })
      if (res.ok) {
        const { data } = await res.json()
        setServices(prev => [...prev, data])
        setSvcName('')
        setSvcPrice('')
        setSvcDuration(60)
      } else {
        setError('שגיאה בהוספת שירות')
      }
    } catch {
      setError('שגיאה בהוספת שירות')
    } finally {
      setSaving(false)
    }
  }

  function toggleDay(i: number) {
    setWorkingHours(prev => prev.map((d, idx) => idx === i ? { ...d, isActive: !d.isActive } : d))
  }

  function updateTime(i: number, field: 'startTime' | 'endTime', value: string) {
    setWorkingHours(prev => prev.map((d, idx) => idx === i ? { ...d, [field]: value } : d))
  }

  async function saveSocialLinks() {
    setError('')
    setSaving(true)
    try {
      if ((instagramUrl.trim() || tiktokUrl.trim()) && profileId) {
        await fetch(`/api/nailists/${profileId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...(instagramUrl.trim() && { instagramUrl: instagramUrl.trim() }),
            ...(tiktokUrl.trim() && { tiktokUrl: tiktokUrl.trim() }),
          }),
        })
      }
      setStep(4)
    } catch {
      setError('שגיאה בשמירת הקישורים — נסי שוב')
    } finally {
      setSaving(false)
    }
  }

  async function saveWorkingHours() {
    setSaving(true)
    setError('')
    try {
      const [hoursRes] = await Promise.all([
        fetch('/api/working-hours', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ hours: workingHours }),
        }),
        profileId
          ? fetch(`/api/nailists/${profileId}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ isActive: true }),
            })
          : Promise.resolve(),
      ])
      if (!hoursRes.ok) throw new Error()
      router.replace('/dashboard/nailist')
    } catch {
      setError('שגיאה בשמירת שעות עבודה — נסי שוב')
    } finally {
      setSaving(false)
    }
  }

  if (authLoading || !profileId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-pink-400" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-pink-200">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-2xl font-black text-gray-800">בואי נגדיר את העסק שלך 💅</h1>
          <p className="text-gray-400 text-sm mt-1">עוד כמה צעדים ואת מוכנה לקבל לקוחות</p>
        </div>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-3 mb-8">
          {STEPS.map((s, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-black transition-all ${
                i < step
                  ? 'bg-gradient-to-br from-pink-500 to-purple-600 text-white shadow-md shadow-pink-200'
                  : i === step
                  ? 'bg-gradient-to-br from-pink-500 to-purple-600 text-white shadow-md shadow-pink-200 ring-4 ring-pink-100'
                  : 'bg-gray-100 text-gray-400'
              }`}>
                {i < step ? <Check className="h-4 w-4" /> : i + 1}
              </div>
              {i < STEPS.length - 1 && (
                <div className={`h-0.5 w-10 rounded-full transition-all ${i < step ? 'bg-gradient-to-r from-pink-500 to-purple-600' : 'bg-gray-200'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Step label */}
        <p className="text-center text-sm font-bold text-gray-500 mb-6">
          שלב {step + 1} מתוך {STEPS.length} — {STEPS[step].emoji} {STEPS[step].label}
        </p>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-xl shadow-pink-100/50 p-7">
          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-100 text-red-600 rounded-xl px-4 py-3 text-sm font-semibold mb-5">
              <X className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <AnimatePresence mode="wait">
            {step === 0 && (
              <motion.div key="step0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>
                <h2 className="text-xl font-black text-gray-800 mb-1">איפה העסק שלך?</h2>
                <p className="text-gray-400 text-sm mb-5">לקוחות בקרבתך יוכלו למצוא אותך</p>
                <PlacesInput
                  value={address}
                  onChange={setAddress}
                  onPlaceSelect={handlePlaceSelect}
                  placeholder="רחוב הרצל 12, תל אביב"
                />
                {lat && (
                  <p className="text-xs text-emerald-600 font-semibold flex items-center gap-1 mt-2">
                    <MapPin className="h-3 w-3" /> מיקום זוהה בהצלחה
                  </p>
                )}
                <Button
                  onClick={saveAddress}
                  disabled={!lat || saving}
                  className="w-full mt-6 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 border-0 rounded-xl h-12 font-black text-base shadow-lg shadow-pink-200 gap-2 group disabled:opacity-50"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <>המשיכי <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" /></>}
                </Button>
              </motion.div>
            )}

            {step === 1 && (
              <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>
                <h2 className="text-xl font-black text-gray-800 mb-1">תמונות של העבודות שלך</h2>
                <p className="text-gray-400 text-sm mb-5">
                  העלי לפחות 3 תמונות כדי להמשיך
                  <span className={`mr-2 font-bold ${photos.length >= 3 ? 'text-emerald-500' : 'text-pink-500'}`}>
                    ({photos.length}/3)
                  </span>
                </p>

                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />

                {uploading && (
                  <div className="mb-4">
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                      <span>מעלה תמונה...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <motion.div
                        animate={{ width: `${uploadProgress}%` }}
                        className="h-full bg-gradient-to-r from-pink-500 to-purple-600 rounded-full"
                      />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-3 mb-5">
                  {photos.map((p) => (
                    <div key={p.id} className="relative aspect-square rounded-xl overflow-hidden bg-gray-100">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.url} alt="" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-colors" />
                    </div>
                  ))}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="aspect-square rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-1 hover:border-pink-300 hover:bg-pink-50/30 transition-all text-gray-300 hover:text-pink-400 disabled:opacity-50"
                  >
                    <ImagePlus className="h-5 w-5" />
                    <span className="text-xs font-bold">הוסיפי</span>
                  </button>
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setStep(0)} className="flex-1 rounded-xl h-12 font-bold gap-2 border-gray-200">
                    <ArrowRight className="h-4 w-4" /> חזרה
                  </Button>
                  <Button
                    onClick={() => setStep(2)}
                    disabled={photos.length < 3}
                    className="flex-1 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 border-0 rounded-xl h-12 font-black gap-2 group shadow-lg shadow-pink-200 disabled:opacity-50"
                  >
                    המשיכי <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
                  </Button>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>
                <h2 className="text-xl font-black text-gray-800 mb-1">מה השירותים שלך?</h2>
                <p className="text-gray-400 text-sm mb-5">הוסיפי לפחות שירות אחד כדי שלקוחות יוכלו להזמין</p>

                {/* Service list */}
                {services.length > 0 && (
                  <div className="space-y-2 mb-5">
                    {services.map((s) => (
                      <div key={s.id} className="flex items-center gap-3 bg-gradient-to-r from-pink-50 to-purple-50 rounded-xl px-4 py-3">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center shrink-0">
                          <Check className="h-3 w-3 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-gray-800 text-sm truncate">{s.name}</p>
                          <p className="text-xs text-gray-400">{s.durationMinutes} דק׳ · ₪{s.price}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add service form */}
                <div className="border border-gray-100 rounded-2xl p-4 bg-gray-50/50 space-y-3">
                  <p className="text-xs font-bold text-gray-500 mb-2">הוספת שירות חדש</p>
                  <Input
                    placeholder="שם השירות (למשל: ג׳ל צרפתי)"
                    value={svcName}
                    onChange={e => setSvcName(e.target.value)}
                    className="rounded-xl border-gray-200 focus:border-pink-300 h-11 bg-white"
                  />
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="text-xs font-bold text-gray-500 block mb-1">משך (דקות)</label>
                      <select
                        value={svcDuration}
                        onChange={e => setSvcDuration(Number(e.target.value))}
                        className="w-full h-11 rounded-xl border border-gray-200 bg-white px-3 text-sm font-semibold focus:outline-none focus:border-pink-300"
                      >
                        {[30, 45, 60, 75, 90, 120].map(d => (
                          <option key={d} value={d}>{d} דק׳</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex-1">
                      <label className="text-xs font-bold text-gray-500 block mb-1">מחיר (₪)</label>
                      <Input
                        type="number"
                        placeholder="150"
                        value={svcPrice}
                        onChange={e => setSvcPrice(e.target.value)}
                        className="rounded-xl border-gray-200 focus:border-pink-300 h-11 bg-white"
                        min={0}
                      />
                    </div>
                  </div>
                  <Button
                    type="button"
                    onClick={addService}
                    disabled={!svcName.trim() || !svcPrice || saving}
                    variant="outline"
                    className="w-full rounded-xl h-10 font-bold border-pink-200 text-pink-600 hover:bg-pink-50 gap-2 disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Plus className="h-4 w-4" /> הוסיפי שירות</>}
                  </Button>
                </div>

                <div className="flex gap-3 mt-5">
                  <Button variant="outline" onClick={() => setStep(1)} className="flex-1 rounded-xl h-12 font-bold gap-2 border-gray-200">
                    <ArrowRight className="h-4 w-4" /> חזרה
                  </Button>
                  <Button
                    onClick={() => { setError(''); setStep(3) }}
                    disabled={services.length === 0}
                    className="flex-1 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 border-0 rounded-xl h-12 font-black gap-2 group shadow-lg shadow-pink-200 disabled:opacity-50"
                  >
                    המשיכי <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
                  </Button>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-xl font-black text-gray-800">רשתות חברתיות</h2>
                  <span className="text-xs font-bold bg-gray-100 text-gray-400 rounded-full px-2.5 py-0.5">אופציונלי</span>
                </div>
                <p className="text-gray-400 text-sm mb-6">הוסיפי קישורים לפרופיל שלך — לקוחות יוכלו לראות את העבודות שלך</p>

                <div className="space-y-3 mb-6">
                  {/* Instagram */}
                  <div>
                    <label className="text-xs font-black text-gray-500 flex items-center gap-1.5 mb-1.5">
                      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{color:'#E1306C'}}>
                        <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
                      </svg>
                      Instagram
                    </label>
                    <Input
                      value={instagramUrl}
                      onChange={e => setInstagramUrl(e.target.value)}
                      placeholder="https://instagram.com/youraccount"
                      type="url"
                      dir="ltr"
                      className="rounded-xl border-gray-200 focus:border-pink-300 h-11 text-left placeholder:text-right"
                    />
                  </div>

                  {/* TikTok */}
                  <div>
                    <label className="text-xs font-black text-gray-500 flex items-center gap-1.5 mb-1.5">
                      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-gray-700">
                        <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.22 8.22 0 004.81 1.54V6.78a4.86 4.86 0 01-1.04-.09z"/>
                      </svg>
                      TikTok
                    </label>
                    <Input
                      value={tiktokUrl}
                      onChange={e => setTiktokUrl(e.target.value)}
                      placeholder="https://tiktok.com/@youraccount"
                      type="url"
                      dir="ltr"
                      className="rounded-xl border-gray-200 focus:border-pink-300 h-11 text-left placeholder:text-right"
                    />
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setStep(2)} className="flex-1 rounded-xl h-12 font-bold gap-2 border-gray-200">
                    <ArrowRight className="h-4 w-4" /> חזרה
                  </Button>
                  <Button
                    onClick={saveSocialLinks}
                    disabled={saving}
                    className="flex-1 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 border-0 rounded-xl h-12 font-black gap-2 group shadow-lg shadow-pink-200 disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <>המשיכי <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" /></>}
                  </Button>
                </div>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div key="step4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>
                <h2 className="text-xl font-black text-gray-800 mb-1">שעות פעילות</h2>
                <p className="text-gray-400 text-sm mb-5">הגדירי באילו ימים ושעות את זמינה ללקוחות</p>

                <div className="space-y-2 mb-5">
                  {workingHours.map((day, i) => (
                    <div
                      key={i}
                      className={`rounded-xl border px-4 py-3 transition-all ${day.isActive ? 'border-pink-200 bg-pink-50/40' : 'border-gray-100 bg-gray-50/50'}`}
                    >
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => toggleDay(i)}
                          className={`w-9 h-5 rounded-full transition-all shrink-0 relative ${day.isActive ? 'bg-gradient-to-r from-pink-500 to-purple-600' : 'bg-gray-200'}`}
                        >
                          <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${day.isActive ? 'right-0.5' : 'left-0.5'}`} />
                        </button>
                        <span className={`text-sm font-bold w-12 ${day.isActive ? 'text-gray-800' : 'text-gray-400'}`}>
                          {DAYS_HE[i]}
                        </span>
                        {day.isActive && (
                          <div className="flex items-center gap-2 flex-1">
                            <input
                              type="time"
                              value={day.startTime}
                              onChange={e => updateTime(i, 'startTime', e.target.value)}
                              className="flex-1 h-8 rounded-lg border border-gray-200 bg-white px-2 text-xs font-semibold focus:outline-none focus:border-pink-300 text-center"
                            />
                            <span className="text-xs text-gray-400">—</span>
                            <input
                              type="time"
                              value={day.endTime}
                              onChange={e => updateTime(i, 'endTime', e.target.value)}
                              className="flex-1 h-8 rounded-lg border border-gray-200 bg-white px-2 text-xs font-semibold focus:outline-none focus:border-pink-300 text-center"
                            />
                          </div>
                        )}
                        {!day.isActive && (
                          <span className="text-xs text-gray-400 font-medium">סגור</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setStep(3)} className="flex-1 rounded-xl h-12 font-bold gap-2 border-gray-200">
                    <ArrowRight className="h-4 w-4" /> חזרה
                  </Button>
                  <Button
                    onClick={saveWorkingHours}
                    disabled={saving}
                    className="flex-1 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 border-0 rounded-xl h-12 font-black gap-2 group shadow-lg shadow-pink-200 disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <>סיימתי! <Check className="h-4 w-4" /></>}
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <p className="text-center text-xs text-gray-300 mt-6">
          תוכלי לערוך הכל מאוחר יותר בהגדרות הפרופיל
        </p>
      </div>
    </div>
  )
}
