'use client'

import { useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'

interface AdminAppointment {
  id: string
  nailistName: string
  clientName: string
  serviceName: string
  status: string
  startTime: string | null
  price: number
  currency: string
}

const STATUS_HE: Record<string, string> = {
  PENDING: 'ממתין',
  CONFIRMED: 'מאושר',
  COMPLETED: 'הושלם',
  CANCELLED: 'בוטל',
  NO_SHOW: 'לא הגיע',
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-amber-50 text-amber-600 border-amber-200',
  CONFIRMED: 'bg-green-50 text-green-600 border-green-200',
  COMPLETED: 'bg-blue-50 text-blue-600 border-blue-200',
  CANCELLED: 'bg-red-50 text-red-500 border-red-200',
  NO_SHOW: 'bg-gray-50 text-gray-500 border-gray-200',
}

const ALL_STATUSES = ['', 'PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW']

export default function AdminAppointmentsPage() {
  const [appointments, setAppointments] = useState<AdminAppointment[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')

  useEffect(() => {
    async function load() {
      setLoading(true)
      const q = statusFilter ? `?status=${statusFilter}` : ''
      try {
        const r = await fetch(`/api/admin/appointments${q}`)
        const j = await r.json()
        setAppointments(j.data ?? [])
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [statusFilter])

  const filtered = statusFilter
    ? appointments.filter(a => a.status === statusFilter)
    : appointments

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-black text-foreground">הזמנות</h1>
        <p className="text-muted-foreground text-sm mt-1">100 הזמנות אחרונות</p>
      </div>

      {/* Status filter */}
      <div className="flex flex-wrap gap-2">
        {ALL_STATUSES.map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-colors ${
              statusFilter === s
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-card text-muted-foreground border-border hover:border-primary/40'
            }`}
          >
            {s === '' ? 'הכל' : STATUS_HE[s] ?? s}
          </button>
        ))}
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-right px-5 py-3 font-semibold text-muted-foreground">תאריך ושעה</th>
                  <th className="text-right px-5 py-3 font-semibold text-muted-foreground">נייליסטית</th>
                  <th className="text-right px-5 py-3 font-semibold text-muted-foreground">לקוחה</th>
                  <th className="text-right px-5 py-3 font-semibold text-muted-foreground">שירות</th>
                  <th className="text-right px-5 py-3 font-semibold text-muted-foreground">מחיר</th>
                  <th className="text-right px-5 py-3 font-semibold text-muted-foreground">סטטוס</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map(a => (
                  <tr key={a.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-5 py-3 text-muted-foreground whitespace-nowrap">
                      {a.startTime ? new Date(a.startTime).toLocaleString('he-IL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
                    </td>
                    <td className="px-5 py-3 font-medium text-foreground">{a.nailistName || '—'}</td>
                    <td className="px-5 py-3 text-muted-foreground">{a.clientName || '—'}</td>
                    <td className="px-5 py-3 text-muted-foreground">{a.serviceName}</td>
                    <td className="px-5 py-3 text-foreground font-medium">
                      {a.price ? `₪${a.price}` : '—'}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold border ${STATUS_COLORS[a.status] ?? 'bg-muted text-muted-foreground border-border'}`}>
                        {STATUS_HE[a.status] ?? a.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-muted-foreground">אין תוצאות</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
