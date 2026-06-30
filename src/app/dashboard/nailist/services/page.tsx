'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2, Plus, Trash2, Clock, X, Scissors, Pencil, CheckCircle2 } from 'lucide-react'

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
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<ServiceForm>(DEFAULT_FORM)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [nameError, setNameError] = useState(false)
  const [success, setSuccess] = useState('')

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

  function openCreateForm() {
    setEditingId(null)
    setForm(DEFAULT_FORM)
    setError('')
    setNameError(false)
    setSuccess('')
    setShowForm(true)
  }

  function openEditForm(service: Service) {
    setEditingId(service.id)
    setForm({
      name: service.name,
      description: service.description ?? '',
      durationMinutes: service.durationMinutes,
      price: service.price,
      currency: service.currency,
    })
    setError('')
    setNameError(false)
    setSuccess('')
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditingId(null)
    setForm(DEFAULT_FORM)
    setError('')
    setNameError(false)
  }

  async function handleCreate() {
    if (!profileId) return
    if (!form.name.trim()) { setNameError(true); return }
    setSaving(true)
    setError('')
    setNameError(false)
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
      closeForm()
      setSuccess('השירות נשמר בהצלחה!')
      setTimeout(() => setSuccess(''), 3000)
    } finally {
      setSaving(false)
    }
  }

  async function handleUpdate() {
    if (!editingId) return
    if (!form.name.trim()) { setNameError(true); return }
    setSaving(true)
    setError('')
    setNameError(false)
    try {
      const res = await fetch(`/api/services/${editingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const body = await res.json()
        setError(typeof body.error === 'string' ? body.error : 'שגיאה בעדכון')
        return
      }
      setServices((prev) => prev.map((s) => s.id === editingId ? { ...s, ...form } : s))
      closeForm()
      setSuccess('השירות עודכן בהצלחה!')
      setTimeout(() => setSuccess(''), 3000)
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
          <h1 className="text-2xl font-black text-foreground">השירותים שלי</h1>
          <p className="text-muted-foreground font-medium text-sm">ניהול מחירון</p>
        </div>
        <Button
          onClick={openCreateForm}
          className="bg-gradient-to-r from-pink-500 to-purple-600 border-0 rounded-2xl font-bold shadow-md shadow-primary/40 gap-2"
        >
          <Plus className="h-4 w-4" />
          שירות חדש
        </Button>
      </div>

      {/* Success toast */}
      <AnimatePresence>
        {success && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-400 rounded-2xl px-4 py-3 mb-5 font-semibold text-sm"
          >
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            {success}
          </motion.div>
        )}
      </AnimatePresence>

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
                className="bg-gradient-to-br from-pink-50 to-purple-50 dark:from-pink-950/30 dark:to-purple-950/30 rounded-3xl border border-pink-100 dark:border-pink-900/50 p-6 mb-6"
              >
                <div className="flex items-center justify-between mb-5">
                  <h2 className="font-black text-foreground">{editingId ? 'עריכת שירות' : 'שירות חדש'}</h2>
                  <button onClick={closeForm} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-white/60 transition-colors">
                    <X className="h-4 w-4 text-muted-foreground" />
                  </button>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-bold text-muted-foreground block mb-1.5">שם השירות *</label>
                    <Input
                      value={form.name}
                      onChange={(e) => { setForm({ ...form, name: e.target.value }); if (nameError) setNameError(false) }}
                      placeholder="לדוגמה: מניקור ג'ל"
                      className={`rounded-xl border-border bg-card h-11 ${nameError ? 'border-red-400 focus:border-red-400' : ''}`}
                    />
                    {nameError && (
                      <p className="text-xs text-red-500 font-medium mt-1">שם השירות הוא שדה חובה</p>
                    )}
                  </div>
                  <div>
                    <label className="text-sm font-bold text-muted-foreground block mb-1.5">תיאור (אופציונלי)</label>
                    <Input
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      placeholder="תיאור קצר..."
                      className="rounded-xl border-border bg-card h-11"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-bold text-muted-foreground block mb-1.5">משך (דקות)</label>
                      <Input
                        type="number"
                        min={15}
                        step={15}
                        value={form.durationMinutes}
                        onChange={(e) => setForm({ ...form, durationMinutes: Number(e.target.value) })}
                        className="rounded-xl border-border bg-card h-11"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-bold text-muted-foreground block mb-1.5">מחיר (₪)</label>
                      <Input
                        type="number"
                        min={0}
                        value={form.price}
                        onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                        className="rounded-xl border-border bg-card h-11"
                      />
                    </div>
                  </div>
                  {error && <p className="text-sm text-red-500 font-medium">{error}</p>}
                  <Button
                    onClick={editingId ? handleUpdate : handleCreate}
                    disabled={saving || form.price < 0}
                    className="w-full bg-gradient-to-r from-pink-500 to-purple-600 border-0 rounded-2xl font-bold shadow-md shadow-primary/40"
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : editingId ? 'עדכן שירות' : 'שמור שירות'}
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {services.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-3">
                <Scissors className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="font-black text-muted-foreground mb-2">אין שירותים עדיין</p>
              <p className="text-sm text-muted-foreground/50">הוסיפי שירות ראשון כדי שלקוחות יוכלו להזמין</p>
            </div>
          ) : (
            <div className="space-y-4">
              {services.map((service, i) => (
                <motion.div
                  key={service.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-card rounded-2xl border border-border p-5 flex items-center justify-between hover:border-pink-200 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <h3 className="font-black text-foreground">{service.name}</h3>
                    {service.description && <p className="text-sm text-muted-foreground mt-0.5">{service.description}</p>}
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {service.durationMinutes} {"דק'"}</span>
                      <span className="font-black text-pink-600 text-sm">{service.currency === 'ILS' ? '₪' : '$'}{service.price}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 mr-4">
                    <button
                      onClick={() => openEditForm(service)}
                      className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-blue-50 dark:hover:bg-blue-950/30 text-muted-foreground/50 hover:text-blue-500 transition-colors"
                      title="עריכה"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(service.id)}
                      disabled={deletingId === service.id}
                      className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-red-50 dark:hover:bg-red-950/30 text-muted-foreground/50 hover:text-red-400 transition-colors"
                      title="מחיקה"
                    >
                      {deletingId === service.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
