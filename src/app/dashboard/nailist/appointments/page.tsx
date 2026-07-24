'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Loader2, CheckCircle2, XCircle, Star, Inbox, Wallet } from 'lucide-react'
import { APPOINTMENT_STATUS_COLORS, DEPOSIT_STATUS_COLORS as SHARED_DEPOSIT_STATUS_COLORS } from '@/lib/status-styles'

type DepositStatus = 'AWAITING_PAYMENT' | 'CLIENT_MARKED_PAID' | 'NAILIST_CONFIRMED'

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
  depositRequired?: boolean
  depositAmount?: number
  depositCurrency?: string
  depositStatus?: DepositStatus
}

const STATUS_LABELS: Record<Appointment['status'], string> = {
  PENDING: 'ממתין',
  CONFIRMED: 'מאושר',
  CANCELLED: 'בוטל',
  COMPLETED: 'הושלם',
  NO_SHOW: 'לא הגיע',
}

const STATUS_COLORS = APPOINTMENT_STATUS_COLORS

// Deliberately its own state machine, separate from STATUS_LABELS/COLORS —
// deposit tracking is informational-only and must never gate the real
// appointment confirm/cancel buttons.
const DEPOSIT_STATUS_LABELS: Record<DepositStatus, string> = {
  AWAITING_PAYMENT: 'ממתינה למקדמה',
  CLIENT_MARKED_PAID: 'הלקוחה סימנה ששילמה',
  NAILIST_CONFIRMED: 'מקדמה התקבלה',
}

const DEPOSIT_STATUS_COLORS = SHARED_DEPOSIT_STATUS_COLORS

export default function NailistAppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)
  const [updatingDeposit, setUpdatingDeposit] = useState<string | null>(null)
  const [error, setError] = useState('')

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
    setError('')
    try {
      const res = await fetch(`/api/appointments/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) {
        // e.g. a stale tab: the appointment was already cancelled/completed
        // elsewhere and the server rejected this transition — don't apply
        // it locally, or the dashboard shows a status that never took effect.
        setError('לא ניתן היה לעדכן את הסטטוס — ייתכן שהתור כבר עודכן במקום אחר. רעננ/י את העמוד.')
        return
      }
      setAppointments((prev) => prev.map((a) => a.id === id ? { ...a, status } : a))
    } catch {
      setError('שגיאת רשת — לא ניתן היה לעדכן את הסטטוס')
    } finally {
      setUpdating(null)
    }
  }

  // Informational only — never blocks the real status buttons, so failures
  // here don't need the same "revert on error" care as updateStatus.
  async function confirmDeposit(id: string) {
    setUpdatingDeposit(id)
    try {
      const res = await fetch(`/api/appointments/${id}/deposit`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'CONFIRM_RECEIVED' }),
      })
      if (res.ok) {
        setAppointments((prev) => prev.map((a) => a.id === id ? { ...a, depositStatus: 'NAILIST_CONFIRMED' } : a))
      }
    } finally {
      setUpdatingDeposit(null)
    }
  }

  const upcoming = appointments.filter((a) => ['PENDING', 'CONFIRMED'].includes(a.status))
  const past = appointments.filter((a) => !['PENDING', 'CONFIRMED'].includes(a.status))

  return (
    <div className="p-4 md:p-8" dir="rtl">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-foreground">התורים שלי</h1>
        <p className="text-muted-foreground font-medium text-sm">ניהול הזמנות</p>
      </div>

      {error && (
        <div className="mb-5 flex items-center gap-2 bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/50 text-red-600 dark:text-red-400 rounded-2xl px-4 py-3 font-semibold text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-8">
          {upcoming.length > 0 && (
            <section>
              <h2 className="font-black text-foreground/80 mb-4">קרובים</h2>
              <div className="space-y-4">
                {upcoming.map((apt, i) => (
                  <AppointmentCard
                    key={apt.id} apt={apt} i={i} updating={updating} onUpdate={updateStatus}
                    updatingDeposit={updatingDeposit} onConfirmDeposit={confirmDeposit}
                  />
                ))}
              </div>
            </section>
          )}

          {past.length > 0 && (
            <section>
              <h2 className="font-black text-foreground/80 mb-4">היסטוריה</h2>
              <div className="space-y-4">
                {past.map((apt, i) => (
                  <AppointmentCard
                    key={apt.id} apt={apt} i={i} updating={updating} onUpdate={updateStatus}
                    updatingDeposit={updatingDeposit} onConfirmDeposit={confirmDeposit}
                  />
                ))}
              </div>
            </section>
          )}

          {appointments.length === 0 && (
            <div className="text-center py-16">
              <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-3">
                <Inbox className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="font-black text-muted-foreground">אין תורים עדיין</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function AppointmentCard({
  apt, i, updating, onUpdate, updatingDeposit, onConfirmDeposit,
}: {
  apt: Appointment
  i: number
  updating: string | null
  onUpdate: (id: string, status: Appointment['status']) => void
  updatingDeposit: string | null
  onConfirmDeposit: (id: string) => void
}) {
  const symbol = apt.currency === 'ILS' ? '₪' : '$'
  const start = new Date(apt.startTime)
  const dateStr = start.toLocaleDateString('he-IL', { weekday: 'short', day: 'numeric', month: 'short' })
  const timeStr = start.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })
  const isUpdating = updating === apt.id
  const isUpdatingDeposit = updatingDeposit === apt.id

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: i * 0.05 }}
      className="bg-card rounded-2xl border border-border p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h3 className="font-black text-foreground">{apt.serviceName}</h3>
            <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${STATUS_COLORS[apt.status]}`}>
              {STATUS_LABELS[apt.status]}
            </span>
            {apt.depositRequired && apt.depositStatus && (
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${DEPOSIT_STATUS_COLORS[apt.depositStatus]}`}>
                {DEPOSIT_STATUS_LABELS[apt.depositStatus]}
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground font-medium">{apt.clientDisplayName ?? 'לקוחה'}</p>
          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
            <span>{dateStr} {timeStr}</span>
            <span className="font-black text-primary">{symbol}{apt.price}</span>
          </div>
          {apt.notes && <p className="text-xs text-muted-foreground mt-1 italic">{apt.notes}</p>}
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
              className="border-red-200 dark:border-red-900/50 text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl font-bold gap-1 text-xs"
            >
              <XCircle className="h-3 w-3" />
              בטל
            </Button>
          </div>
        )}
      </div>

      {/* Deposit confirmation — deliberately its own row, separate from the
          real status actions above, so it can never look like a precondition
          for confirming/cancelling the appointment itself. */}
      {apt.depositRequired && apt.depositStatus && apt.depositStatus !== 'NAILIST_CONFIRMED' && (
        <div className="mt-3 pt-3 border-t border-border">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onConfirmDeposit(apt.id)}
            disabled={isUpdatingDeposit}
            className="border-border text-muted-foreground hover:border-green-300 hover:text-green-600 rounded-xl font-bold gap-1.5 text-xs"
          >
            {isUpdatingDeposit ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wallet className="h-3 w-3" />}
            אשרי קבלת מקדמה
          </Button>
        </div>
      )}
    </motion.div>
  )
}
