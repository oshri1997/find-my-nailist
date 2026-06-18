'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Loader2, CheckCircle2, XCircle, Star } from 'lucide-react'

interface Appointment {
  id: string
  serviceName: string
  clientDisplayName?: string
  startTime: string
  endTime: string
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW'
  price: number
  currency: string
  notes?: string
}

const STATUS_LABELS: Record<Appointment['status'], string> = {
  PENDING: 'ממתין',
  CONFIRMED: 'מאושר',
  CANCELLED: 'בוטל',
  COMPLETED: 'הושלם',
  NO_SHOW: 'לא הגיע',
}

const STATUS_COLORS: Record<Appointment['status'], string> = {
  PENDING: 'bg-amber-50 text-amber-600 border-amber-200',
  CONFIRMED: 'bg-green-50 text-green-600 border-green-200',
  CANCELLED: 'bg-red-50 text-red-500 border-red-200',
  COMPLETED: 'bg-blue-50 text-blue-600 border-blue-200',
  NO_SHOW: 'bg-gray-50 text-gray-400 border-gray-200',
}

export default function NailistAppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const res = await fetch('/api/appointments?role=nailist')
        if (!res.ok) return
        const { data } = await res.json()
        setAppointments(data ?? [])
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [])

  async function updateStatus(id: string, status: Appointment['status']) {
    setUpdating(id)
    try {
      await fetch(`/api/appointments/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      setAppointments((prev) => prev.map((a) => a.id === id ? { ...a, status } : a))
    } finally {
      setUpdating(null)
    }
  }

  const upcoming = appointments.filter((a) => ['PENDING', 'CONFIRMED'].includes(a.status))
  const past = appointments.filter((a) => !['PENDING', 'CONFIRMED'].includes(a.status))

  return (
    <div className="p-4 md:p-8" dir="rtl">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-gray-800">התורים שלי</h1>
        <p className="text-gray-400 font-medium text-sm">ניהול הזמנות</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-pink-400" />
        </div>
      ) : (
        <div className="space-y-8">
          {upcoming.length > 0 && (
            <section>
              <h2 className="font-black text-gray-700 mb-4">קרובים</h2>
              <div className="space-y-4">
                {upcoming.map((apt, i) => (
                  <AppointmentCard key={apt.id} apt={apt} i={i} updating={updating} onUpdate={updateStatus} />
                ))}
              </div>
            </section>
          )}

          {past.length > 0 && (
            <section>
              <h2 className="font-black text-gray-700 mb-4">היסטוריה</h2>
              <div className="space-y-4">
                {past.map((apt, i) => (
                  <AppointmentCard key={apt.id} apt={apt} i={i} updating={updating} onUpdate={updateStatus} />
                ))}
              </div>
            </section>
          )}

          {appointments.length === 0 && (
            <div className="text-center py-16">
              <div className="text-4xl mb-3">📭</div>
              <p className="font-black text-gray-400">אין תורים עדיין</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function AppointmentCard({
  apt, i, updating, onUpdate,
}: {
  apt: Appointment
  i: number
  updating: string | null
  onUpdate: (id: string, status: Appointment['status']) => void
}) {
  const symbol = apt.currency === 'ILS' ? '₪' : '$'
  const start = new Date(apt.startTime)
  const dateStr = start.toLocaleDateString('he-IL', { weekday: 'short', day: 'numeric', month: 'short' })
  const timeStr = start.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })
  const isUpdating = updating === apt.id

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: i * 0.05 }}
      className="bg-white rounded-2xl border border-gray-100 p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h3 className="font-black text-gray-800">{apt.serviceName}</h3>
            <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${STATUS_COLORS[apt.status]}`}>
              {STATUS_LABELS[apt.status]}
            </span>
          </div>
          <p className="text-sm text-gray-500 font-medium">{apt.clientDisplayName ?? 'לקוחה'}</p>
          <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
            <span>{dateStr} {timeStr}</span>
            <span className="font-black text-pink-600">{symbol}{apt.price}</span>
          </div>
          {apt.notes && <p className="text-xs text-gray-400 mt-1 italic">{apt.notes}</p>}
        </div>

        {(apt.status === 'PENDING' || apt.status === 'CONFIRMED') && (
          <div className="flex flex-col gap-2 shrink-0">
            {apt.status === 'PENDING' && (
              <Button
                size="sm"
                onClick={() => onUpdate(apt.id, 'CONFIRMED')}
                disabled={isUpdating}
                className="bg-green-500 hover:bg-green-600 border-0 rounded-xl font-bold gap-1 text-xs"
              >
                {isUpdating ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                אשר
              </Button>
            )}
            {apt.status === 'CONFIRMED' && (
              <Button
                size="sm"
                onClick={() => onUpdate(apt.id, 'COMPLETED')}
                disabled={isUpdating}
                className="bg-blue-500 hover:bg-blue-600 border-0 rounded-xl font-bold gap-1 text-xs"
              >
                {isUpdating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Star className="h-3 w-3" />}
                הושלם
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => onUpdate(apt.id, 'CANCELLED')}
              disabled={isUpdating}
              className="border-red-200 text-red-400 hover:bg-red-50 rounded-xl font-bold gap-1 text-xs"
            >
              <XCircle className="h-3 w-3" />
              בטל
            </Button>
          </div>
        )}
      </div>
    </motion.div>
  )
}
