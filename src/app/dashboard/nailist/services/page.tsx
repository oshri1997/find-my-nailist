'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2, Plus, Trash2, Clock, X } from 'lucide-react'

interface Service {
  id: string
  name: string
  description?: string
  durationMinutes: number
  price: number
  currency: string
}

interface ServiceForm {
  name: string
  description: string
  durationMinutes: number
  price: number
  currency: string
}

const DEFAULT_FORM: ServiceForm = {
  name: '',
  description: '',
  durationMinutes: 60,
  price: 0,
  currency: 'ILS',
}

export default function NailistServicesPage() {
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [profileId, setProfileId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<ServiceForm>(DEFAULT_FORM)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    async function init() {
      const res = await fetch('/api/me/nailist-profile')
      if (!res.ok) { setLoading(false); return }
      const { data } = await res.json()
      setProfileId(data.id)

      const svcRes = await fetch(`/api/services?nailistProfileId=${data.id}`)
      if (svcRes.ok) {
        const { data: svcs } = await svcRes.json()
        setServices(svcs ?? [])
      }
      setLoading(false)
    }
    init()
  }, [])

  async function handleCreate() {
    if (!profileId) return
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, nailistProfileId: profileId }),
      })
      if (!res.ok) {
        const body = await res.json()
        setError(typeof body.error === 'string' ? body.error : 'שגיאה בשמירה')
        return
      }
      const { data } = await res.json()
      setServices((prev) => [...prev, { id: data.id, ...form }])
      setForm(DEFAULT_FORM)
      setShowForm(false)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    try {
      await fetch(`/api/services/${id}`, { method: 'DELETE' })
      setServices((prev) => prev.filter((s) => s.id !== id))
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="p-4 md:p-8" dir="rtl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-gray-800">השירותים שלי</h1>
          <p className="text-gray-400 font-medium text-sm">ניהול מחירון</p>
        </div>
        <Button
          onClick={() => { setShowForm(true); setForm(DEFAULT_FORM); setError('') }}
          className="bg-gradient-to-r from-pink-500 to-purple-600 border-0 rounded-2xl font-bold shadow-md shadow-pink-200 gap-2"
        >
          <Plus className="h-4 w-4" />
          שירות חדש
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-pink-400" />
        </div>
      ) : (
        <>
          <AnimatePresence>
            {showForm && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-gradient-to-br from-pink-50 to-purple-50 rounded-3xl border border-pink-100 p-6 mb-6"
              >
                <div className="flex items-center justify-between mb-5">
                  <h2 className="font-black text-gray-800">שירות חדש</h2>
                  <button onClick={() => setShowForm(false)} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-white/60 transition-colors">
                    <X className="h-4 w-4 text-gray-400" />
                  </button>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-bold text-gray-600 block mb-1.5">שם השירות *</label>
                    <Input
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="לדוגמה: מניקור ג'ל"
                      className="rounded-xl border-gray-200 bg-white h-11"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-bold text-gray-600 block mb-1.5">תיאור (אופציונלי)</label>
                    <Input
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      placeholder="תיאור קצר..."
                      className="rounded-xl border-gray-200 bg-white h-11"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-bold text-gray-600 block mb-1.5">משך (דקות)</label>
                      <Input
                        type="number"
                        min={15}
                        step={15}
                        value={form.durationMinutes}
                        onChange={(e) => setForm({ ...form, durationMinutes: Number(e.target.value) })}
                        className="rounded-xl border-gray-200 bg-white h-11"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-bold text-gray-600 block mb-1.5">מחיר (₪)</label>
                      <Input
                        type="number"
                        min={0}
                        value={form.price}
                        onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                        className="rounded-xl border-gray-200 bg-white h-11"
                      />
                    </div>
                  </div>
                  {error && <p className="text-sm text-red-500 font-medium">{error}</p>}
                  <Button
                    onClick={handleCreate}
                    disabled={saving || !form.name || form.price < 0}
                    className="w-full bg-gradient-to-r from-pink-500 to-purple-600 border-0 rounded-2xl font-bold shadow-md shadow-pink-200"
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'שמור שירות'}
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {services.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-4xl mb-3">✂️</div>
              <p className="font-black text-gray-400 mb-2">אין שירותים עדיין</p>
              <p className="text-sm text-gray-300">הוסיפי שירות ראשון כדי שלקוחות יוכלו להזמין</p>
            </div>
          ) : (
            <div className="space-y-4">
              {services.map((service, i) => (
                <motion.div
                  key={service.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center justify-between hover:border-pink-200 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <h3 className="font-black text-gray-800">{service.name}</h3>
                    {service.description && <p className="text-sm text-gray-400 mt-0.5">{service.description}</p>}
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {service.durationMinutes} {"דק'"}</span>
                      <span className="font-black text-pink-600 text-sm">{service.currency === 'ILS' ? '₪' : '$'}{service.price}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(service.id)}
                    disabled={deletingId === service.id}
                    className="mr-4 w-9 h-9 flex items-center justify-center rounded-full hover:bg-red-50 text-gray-300 hover:text-red-400 transition-colors"
                  >
                    {deletingId === service.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  </button>
                </motion.div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
