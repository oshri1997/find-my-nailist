'use client'

import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PlacesInput, type PlaceResult } from '@/components/ui/places-input'
import { CheckCircle2, Loader2, AlertCircle, ImagePlus, X, Camera } from 'lucide-react'
import { useAuth } from '@/components/auth/auth-provider'

const EMPTY_FORM = {
  businessName: '',
  bio: '',
  city: '',
  address: '',
  phoneNumber: '',
  whatsappPhone: '',
  instagramUrl: '',
  tiktokUrl: '',
  isActive: false,
  latitude: undefined as number | undefined,
  longitude: undefined as number | undefined,
  depositEnabled: false,
  depositPercentage: 20 as number,
  bitPhone: '',
}

function initials(name: string) {
  return name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
}

export default function NailistSettingsPage() {
  const { user } = useAuth()
  const [profileId, setProfileId] = useState<string | null>(null)
  const [form, setForm] = useState<typeof EMPTY_FORM>(EMPTY_FORM)
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [photoUploading, setPhotoUploading] = useState(false)
  const [photoError, setPhotoError] = useState('')
  const photoInputRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const [coverPhotoUrl, setCoverPhotoUrl] = useState<string | null>(null)
  const [coverUploading, setCoverUploading] = useState(false)
  const [coverProgress, setCoverProgress] = useState(0)
  const [coverError, setCoverError] = useState('')
  const coverInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/me/nailist-profile')
      .then(async (r) => {
        if (!r.ok) {
          setError(r.status === 401 ? 'פג תוקף ההתחברות — אנא התחברי מחדש' : 'שגיאה בטעינת הפרופיל')
          return
        }
        const { data } = await r.json()
        if (!data) return
        setProfileId(data.id)
        setPhotoUrl(data.photoUrl ?? null)
        setCoverPhotoUrl(data.coverPhotoUrl ?? null)
        setForm({
          businessName: data.businessName ?? '',
          bio: data.bio ?? '',
          city: data.city ?? '',
          address: data.address ?? '',
          phoneNumber: data.phoneNumber ?? '',
          whatsappPhone: data.whatsappPhone ?? '',
          instagramUrl: data.instagramUrl ?? '',
          tiktokUrl: data.tiktokUrl ?? '',
          isActive: data.isActive ?? false,
          latitude: data.latitude,
          longitude: data.longitude,
          depositEnabled: data.depositEnabled ?? false,
          depositPercentage: data.depositPercentage ?? 20,
          bitPhone: data.bitPhone ?? '',
        })
      })
      .catch(() => setError('שגיאה בטעינת הפרופיל'))
      .finally(() => setLoading(false))
  }, [])

  async function handleCoverChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !profileId) return

    if (file.size > 5 * 1024 * 1024) {
      setCoverError('הקובץ גדול מדי — מקסימום 5MB')
      return
    }

    setCoverError('')
    setCoverUploading(true)
    setCoverProgress(0)

    try {
      const { uploadCoverPhoto } = await import('@/lib/firebase/storage')
      const { url } = await uploadCoverPhoto(profileId, file, setCoverProgress)
      const res = await fetch(`/api/nailists/${profileId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coverPhotoUrl: url }),
      })
      if (!res.ok) throw new Error()
      setCoverPhotoUrl(url)
    } catch {
      setCoverError('שגיאה בהעלאה — נסי שוב')
    } finally {
      setCoverUploading(false)
      if (coverInputRef.current) coverInputRef.current.value = ''
    }
  }

  async function handleRemoveCover() {
    if (!profileId) return
    const previous = coverPhotoUrl
    setCoverPhotoUrl(null)
    try {
      const res = await fetch(`/api/nailists/${profileId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coverPhotoUrl: null }),
      })
      if (!res.ok) throw new Error()
    } catch {
      setCoverPhotoUrl(previous)
      setCoverError('שגיאה בהסרת התמונה')
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !profileId || !user) return

    if (file.size > 5 * 1024 * 1024) {
      setPhotoError('הקובץ גדול מדי — מקסימום 5MB')
      return
    }

    setPhotoError('')
    setPhotoUploading(true)
    try {
      const { uploadProfilePhoto } = await import('@/lib/firebase/storage')
      // Storage rules key avatars/{userId}/ off the Firebase Auth uid, not the
      // nailistProfiles document id — they're different values.
      const { url } = await uploadProfilePhoto(user.uid, file)

      const res = await fetch(`/api/nailists/${profileId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photoUrl: url }),
      })
      if (!res.ok) throw new Error()
      setPhotoUrl(url)
    } catch {
      setPhotoError('שגיאה בהעלאת התמונה — נסי שוב')
    } finally {
      setPhotoUploading(false)
      if (photoInputRef.current) photoInputRef.current.value = ''
    }
  }

  function handlePlaceSelect(result: PlaceResult) {
    setForm((prev) => ({
      ...prev,
      address: result.address,
      city: result.city,
      latitude: result.lat,
      longitude: result.lng,
    }))
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!profileId) return
    setError('')
    setSaving(true)
    try {
      const res = await fetch(`/api/nailists/${profileId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error()
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch {
      setError('שגיאה בשמירה — נסי שוב')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center gap-3 text-muted-foreground font-medium">
        <Loader2 className="h-5 w-5 animate-spin" />
        טוענת פרופיל...
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto" dir="rtl">
      <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="text-3xl font-black text-foreground mb-1">הגדרות פרופיל</h1>
        <p className="text-muted-foreground font-medium">עדכני את פרטי העסק שלך</p>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="bg-card rounded-3xl border border-border p-6 shadow-sm flex items-center gap-4 mb-6">
        <div className="relative shrink-0">
          <div className="w-20 h-20 rounded-full bg-muted overflow-hidden flex items-center justify-center border-2 border-border">
            {photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photoUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-xl font-black text-muted-foreground">{initials(form.businessName || 'N')}</span>
            )}
          </div>
          <button
            type="button"
            onClick={() => photoInputRef.current?.click()}
            disabled={photoUploading || !profileId}
            className="absolute -bottom-1 -left-1 w-8 h-8 rounded-full bg-gradient-to-r from-primary to-amber-600 text-white flex items-center justify-center shadow-lg border-2 border-card disabled:opacity-60"
          >
            {photoUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
          </button>
          <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
        </div>
        <div>
          <h2 className="font-black text-foreground text-base">תמונת פרופיל</h2>
          <p className="text-sm text-muted-foreground font-medium">מוצגת בפרופיל הציבורי ובתוצאות החיפוש</p>
          {photoError && (
            <p className="text-xs text-red-500 font-semibold mt-1 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {photoError}
            </p>
          )}
        </div>
      </motion.div>

      <form onSubmit={handleSave} className="space-y-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 }}
          className={`rounded-3xl border p-6 shadow-sm ${form.isActive ? 'bg-green-50 dark:bg-green-950/30 border-green-200' : 'bg-card border-border'}`}>
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="font-black text-foreground text-base">פרסום פרופיל</h2>
              <p className="text-sm text-muted-foreground mt-0.5 font-medium">
                {form.isActive
                  ? 'הפרופיל שלך פעיל — לקוחות יכולות למצוא אותך בחיפוש'
                  : 'הפרופיל שלך מוסתר — לקוחות לא יכולות למצוא אותך עדיין'}
              </p>
            </div>
            <button
              type="button"
              dir="ltr"
              onClick={() => setForm((prev) => ({ ...prev, isActive: !prev.isActive }))}
              className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors focus:outline-none shrink-0 ${
                form.isActive ? 'bg-green-500' : 'bg-muted'
              }`}
            >
              <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${form.isActive ? 'translate-x-8' : 'translate-x-1'}`} />
            </button>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }}
          className="bg-card rounded-3xl border border-border p-6 shadow-sm space-y-4">
          <div>
            <h2 className="font-black text-muted-foreground text-sm uppercase tracking-wider">תמונת כרטיס</h2>
            <p className="text-xs text-muted-foreground mt-1 font-medium">התמונה שמוצגת על הכרטיס שלך בתוצאות החיפוש. אפשר גם לבחור תמונה מהפורטפוליו.</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-24 h-24 rounded-2xl overflow-hidden bg-muted border border-border flex items-center justify-center shrink-0">
              {coverPhotoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={coverPhotoUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <ImagePlus className="h-6 w-6 text-muted-foreground/40" />
              )}
            </div>
            <div className="flex flex-col items-start gap-2">
              <Button
                type="button"
                onClick={() => coverInputRef.current?.click()}
                disabled={coverUploading || !profileId}
                className="bg-gradient-to-r from-primary to-amber-600 hover:from-primary hover:to-amber-700 border-0 rounded-xl h-9 px-4 text-sm font-bold gap-2 disabled:opacity-60"
              >
                {coverUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImagePlus className="h-3.5 w-3.5" />}
                {coverUploading ? `${coverProgress}%` : coverPhotoUrl ? 'החליפי תמונה' : 'העלי תמונה'}
              </Button>
              {coverPhotoUrl && (
                <button
                  type="button"
                  onClick={handleRemoveCover}
                  className="flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-red-500 transition-colors"
                >
                  <X className="h-3 w-3" />
                  הסירי תמונה
                </button>
              )}
            </div>
            <input
              ref={coverInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleCoverChange}
            />
          </div>
          {coverError && (
            <div className="flex items-center gap-2 text-red-500 text-sm font-semibold">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {coverError}
            </div>
          )}
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
          className="bg-card rounded-3xl border border-border p-6 shadow-sm space-y-4">
          <h2 className="font-black text-muted-foreground text-sm uppercase tracking-wider">פרטי עסק</h2>
          <Field label="שם העסק" name="businessName" value={form.businessName} onChange={handleChange} placeholder="סטודיו שרה" />

          <div>
            <label className="text-sm font-bold text-muted-foreground block mb-1.5">כתובת מלאה</label>
            <PlacesInput
              value={form.address}
              onChange={(val) => setForm((prev) => ({ ...prev, address: val }))}
              onPlaceSelect={handlePlaceSelect}
              placeholder="רחוב הרצל 12, תל אביב"
            />
            {form.latitude && (
              <p className="text-xs text-green-600 mt-1 font-medium">מיקום נשמר מגוגל</p>
            )}
          </div>

          <div>
            <label className="text-sm font-bold text-muted-foreground block mb-1.5">תיאור עסק</label>
            <textarea
              name="bio"
              value={form.bio}
              onChange={handleChange}
              placeholder="ספרי על עצמך ועל השירותים שאת מציעה..."
              rows={3}
              className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm focus:outline-none focus:border-primary resize-none font-medium text-foreground placeholder:text-muted-foreground/40"
            />
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }}
          className="bg-card rounded-3xl border border-border p-6 shadow-sm space-y-4">
          <h2 className="font-black text-muted-foreground text-sm uppercase tracking-wider">יצירת קשר</h2>
          <Field label="טלפון" name="phoneNumber" value={form.phoneNumber} onChange={handleChange} placeholder="0501234567" type="tel" />
          <div>
            <label className="text-sm font-bold text-muted-foreground block mb-1.5 flex items-center gap-2">
              <svg viewBox="0 0 24 24" className="h-4 w-4 fill-[#25D366]">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              מספר WhatsApp
            </label>
            <Input name="whatsappPhone" value={form.whatsappPhone} onChange={handleChange} placeholder="0501234567" type="tel" className="rounded-xl border-[#25D366]/40 focus:border-[#25D366] h-11" />
            <p className="text-xs text-muted-foreground mt-1 font-medium">לקוחות יוכלו לשלוח לך הודעה ישירה</p>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.17 }}
          className="bg-card rounded-3xl border border-border p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="font-black text-foreground text-base">מקדמה בביט</h2>
              <p className="text-sm text-muted-foreground mt-0.5 font-medium">
                {form.depositEnabled
                  ? 'לקוחות יתבקשו לשלוח מקדמה דרך Bit לפני התור'
                  : 'לא נדרשת מקדמה מלקוחות'}
              </p>
            </div>
            <button
              type="button"
              dir="ltr"
              aria-label="הפעלת מקדמה בביט"
              onClick={() => setForm((prev) => ({ ...prev, depositEnabled: !prev.depositEnabled }))}
              className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors focus:outline-none shrink-0 ${
                form.depositEnabled ? 'bg-gradient-to-r from-primary to-amber-600' : 'bg-muted'
              }`}
            >
              <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${form.depositEnabled ? 'translate-x-8' : 'translate-x-1'}`} />
            </button>
          </div>

          {form.depositEnabled && (
            <div className="space-y-4 pt-2 border-t border-border">
              <div>
                <label className="text-sm font-bold text-muted-foreground block mb-1.5">אחוז מקדמה</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={form.depositPercentage}
                    onChange={(e) => setForm((prev) => ({ ...prev, depositPercentage: Number(e.target.value) || 0 }))}
                    className="w-24 rounded-xl border border-border bg-card px-3 py-2.5 text-sm focus:outline-none focus:border-primary font-medium text-foreground"
                  />
                  <span className="text-sm text-muted-foreground font-medium">%</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1 font-medium">
                  לדוגמה: שירות ב-₪150 ידרוש מקדמה של ₪{Math.round((form.depositPercentage || 0) / 100 * 150)}
                </p>
              </div>
              <div>
                <label className="text-sm font-bold text-muted-foreground block mb-1.5">מספר טלפון לביט</label>
                <Input name="bitPhone" value={form.bitPhone} onChange={handleChange} placeholder="0501234567" type="tel" className="rounded-xl border-border focus:border-primary h-11" />
                <p className="text-xs text-muted-foreground mt-1 font-medium">לקוחות ישלחו את המקדמה למספר הזה דרך אפליקציית Bit</p>
              </div>
            </div>
          )}
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="bg-card rounded-3xl border border-border p-6 shadow-sm space-y-4">
          <h2 className="font-black text-muted-foreground text-sm uppercase tracking-wider">רשתות חברתיות</h2>
          <Field label="Instagram" name="instagramUrl" value={form.instagramUrl} onChange={handleChange} placeholder="https://instagram.com/youraccount" />
          <Field label="TikTok" name="tiktokUrl" value={form.tiktokUrl} onChange={handleChange} placeholder="https://tiktok.com/@youraccount" />
        </motion.div>

        {error && (
          <div className="flex items-center gap-2 text-red-500 text-sm font-semibold">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }} className="flex items-center gap-3">
          <Button
            type="submit"
            disabled={saving || !profileId}
            className="bg-gradient-to-r from-primary to-amber-600 hover:from-primary hover:to-amber-700 border-0 rounded-xl h-12 px-8 font-black shadow-lg shadow-primary/40 gap-2 disabled:opacity-60"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {saving ? 'שומרת...' : 'שמרי שינויים'}
          </Button>
          {saved && (
            <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-1.5 text-green-600 font-bold text-sm">
              <CheckCircle2 className="h-4 w-4" />
              נשמר בהצלחה!
            </motion.div>
          )}
        </motion.div>
      </form>
    </div>
  )
}

function Field({ label, name, value, onChange, placeholder, type = 'text' }: {
  label: string; name: string; value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  placeholder?: string; type?: string
}) {
  return (
    <div>
      <label className="text-sm font-bold text-muted-foreground block mb-1.5">{label}</label>
      <Input name={name} value={value} onChange={onChange} placeholder={placeholder} type={type} className="rounded-xl border-border focus:border-primary h-11" />
    </div>
  )
}
