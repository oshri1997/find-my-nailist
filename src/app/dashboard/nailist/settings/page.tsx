'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PlacesInput, type PlaceResult } from '@/components/ui/places-input'
import { CheckCircle2, Loader2, AlertCircle } from 'lucide-react'

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
}

export default function NailistSettingsPage() {
  const [profileId, setProfileId] = useState<string | null>(null)
  const [form, setForm] = useState<typeof EMPTY_FORM>(EMPTY_FORM)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

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
        })
      })
      .catch(() => setError('שגיאה בטעינת הפרופיל'))
      .finally(() => setLoading(false))
  }, [])

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  function handlePlaceSelect(result: PlaceResult) {
    setForm((prev) => ({
      ...prev,
      address: result.address,
      city: result.city || prev.city,
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
      <div className="p-8 flex items-center gap-3 text-gray-400 font-medium">
        <Loader2 className="h-5 w-5 animate-spin" />
        טוענת פרופיל...
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8 max-w-2xl">
      <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="text-3xl font-black text-gray-800 mb-1">הגדרות פרופיל ⚙️</h1>
        <p className="text-gray-400 font-medium">עדכני את פרטי העסק שלך</p>
      </motion.div>

      <form onSubmit={handleSave} className="space-y-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 }}
          className={`rounded-3xl border p-6 shadow-sm ${form.isActive ? 'bg-green-50 border-green-200' : 'bg-white border-gray-100'}`}>
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="font-black text-gray-800 text-base">פרסום פרופיל</h2>
              <p className="text-sm text-gray-500 mt-0.5 font-medium">
                {form.isActive
                  ? 'הפרופיל שלך פעיל — לקוחות יכולות למצוא אותך בחיפוש ✅'
                  : 'הפרופיל שלך מוסתר — לקוחות לא יכולות למצוא אותך עדיין'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setForm((prev) => ({ ...prev, isActive: !prev.isActive }))}
              className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors focus:outline-none shrink-0 ${
                form.isActive ? 'bg-green-500' : 'bg-gray-300'
              }`}
            >
              <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${form.isActive ? 'translate-x-8' : 'translate-x-1'}`} />
            </button>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
          className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm space-y-4">
          <h2 className="font-black text-gray-700 text-sm uppercase tracking-wider">פרטי עסק</h2>
          <Field label="שם העסק" name="businessName" value={form.businessName} onChange={handleChange} placeholder="סטודיו שרה" />

          <div>
            <label className="text-sm font-bold text-gray-600 block mb-1.5">כתובת</label>
            <PlacesInput
              value={form.address}
              onChange={(val) => setForm((prev) => ({ ...prev, address: val }))}
              onPlaceSelect={handlePlaceSelect}
              placeholder="רחוב הרצל 12, תל אביב"
            />
            {form.latitude && (
              <p className="text-xs text-green-600 mt-1 font-medium">📍 מיקום נשמר מגוגל</p>
            )}
          </div>

          <div>
            <label className="text-sm font-bold text-gray-600 block mb-1.5">עיר</label>
            <PlacesInput
              value={form.city}
              onChange={(val) => setForm((prev) => ({ ...prev, city: val }))}
              onPlaceSelect={(r) => setForm((prev) => ({ ...prev, city: r.city || r.address, latitude: r.lat, longitude: r.lng }))}
              placeholder="תל אביב"
            />
          </div>

          <div>
            <label className="text-sm font-bold text-gray-600 block mb-1.5">תיאור עסק</label>
            <textarea
              name="bio"
              value={form.bio}
              onChange={handleChange}
              placeholder="ספרי על עצמך ועל השירותים שאת מציעה..."
              rows={3}
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:border-pink-300 resize-none font-medium text-gray-700 placeholder:text-gray-300"
            />
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }}
          className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm space-y-4">
          <h2 className="font-black text-gray-700 text-sm uppercase tracking-wider">יצירת קשר</h2>
          <Field label="טלפון" name="phoneNumber" value={form.phoneNumber} onChange={handleChange} placeholder="0501234567" type="tel" />
          <div>
            <label className="text-sm font-bold text-gray-600 block mb-1.5 flex items-center gap-2">
              <svg viewBox="0 0 24 24" className="h-4 w-4 fill-[#25D366]">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              מספר WhatsApp
            </label>
            <Input name="whatsappPhone" value={form.whatsappPhone} onChange={handleChange} placeholder="0501234567" type="tel" className="rounded-xl border-[#25D366]/40 focus:border-[#25D366] h-11" />
            <p className="text-xs text-gray-400 mt-1 font-medium">לקוחות יוכלו לשלוח לך הודעה ישירה 💬</p>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm space-y-4">
          <h2 className="font-black text-gray-700 text-sm uppercase tracking-wider">רשתות חברתיות</h2>
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
            className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 border-0 rounded-xl h-12 px-8 font-black shadow-lg shadow-pink-200 gap-2 disabled:opacity-60"
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
      <label className="text-sm font-bold text-gray-600 block mb-1.5">{label}</label>
      <Input name={name} value={value} onChange={onChange} placeholder={placeholder} type={type} className="rounded-xl border-gray-200 focus:border-pink-300 h-11" />
    </div>
  )
}
