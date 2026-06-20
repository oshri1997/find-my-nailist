'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { TrendingUp, Clock, CheckCircle2, Circle, ChevronLeft, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '@/components/auth/auth-provider'

type AppStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW'

interface Appointment {
  id: string
  serviceName: string
  startTime: string
  endTime: string
  status: AppStatus
  price: number
  currency: string
}

const STATUS_LABELS: Record<AppStatus, string> = {
  PENDING: 'ממתין',
  CONFIRMED: 'מאושר',
  CANCELLED: 'בוטל',
  COMPLETED: 'הושלם',
  NO_SHOW: 'לא הגיע',
}

const STATUS_COLORS: Record<AppStatus, string> = {
  PENDING: 'bg-amber-50 text-amber-600 border-amber-200',
  CONFIRMED: 'bg-green-50 text-green-600 border-green-200',
  CANCELLED: 'bg-red-50 text-red-500 border-red-200',
  COMPLETED: 'bg-blue-50 text-blue-600 border-blue-200',
  NO_SHOW: 'bg-gray-50 text-gray-400 border-gray-200',
}

function formatAppointmentTime(iso: string) {
  const d = new Date(iso)
  const day = d.toLocaleDateString('he-IL', { weekday: 'short', day: 'numeric', month: 'short' })
  const time = d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })
  return { day, time }
}

const stats = [
  { label: 'תורים', value: '0', icon: '📅', change: '+0 החודש', bg: 'from-pink-50 to-rose-50', border: 'border-pink-100' },
  { label: 'לקוחות', value: '0', icon: '👥', change: '+0 החודש', bg: 'from-purple-50 to-violet-50', border: 'border-purple-100' },
  { label: 'הכנסות', value: '₪0', icon: '💰', change: '+₪0 החודש', bg: 'from-violet-50 to-blue-50', border: 'border-violet-100' },
  { label: 'דירוג ממוצע', value: '—', icon: '⭐', change: 'אין ביקורות עדיין', bg: 'from-amber-50 to-orange-50', border: 'border-amber-100' },
]

const quickActions = [
  { label: 'הגדרת שעות עבודה', icon: '⏰', href: '/dashboard/nailist/hours' },
  { label: 'הוספת שירות חדש', icon: '✂️', href: '/dashboard/nailist/services' },
  { label: 'צפייה בפרופיל ציבורי', icon: '👁️', href: '/search' },
]

interface NailistProfile {
  id?: string
  businessName?: string
  city?: string
  address?: string
  bio?: string
  instagramUrl?: string
  tiktokUrl?: string
  isActive?: boolean
}

export default function NailistDashboard() {
  const { user } = useAuth()
  const firstName = user?.displayName?.split(' ')[0] ?? user?.email?.split('@')[0] ?? 'נייליסטית'
  const [profile, setProfile] = useState<NailistProfile | null>(null)
  const [hasPhotos, setHasPhotos] = useState(false)
  const [hasServices, setHasServices] = useState(false)
  const [hasHours, setHasHours] = useState(false)
  const [upcomingAppointments, setUpcomingAppointments] = useState<Appointment[]>([])
  const [activating, setActivating] = useState(false)

  useEffect(() => {
    fetch('/api/me/nailist-profile')
      .then(r => r.ok ? r.json() : null)
      .then(async (json) => {
        if (!json?.data) return
        setProfile(json.data)
        const profileId = json.data.id

        // Fetch everything in parallel
        const [portfolioRes, servicesRes, hoursRes, appointmentsRes] = await Promise.all([
          fetch(`/api/portfolio?profileId=${profileId}`),
          fetch(`/api/services?nailistProfileId=${profileId}`),
          fetch('/api/working-hours'),
          fetch('/api/appointments?role=nailist'),
        ])

        if (portfolioRes.ok) {
          const { data } = await portfolioRes.json()
          setHasPhotos((data ?? []).length > 0)
        }
        if (servicesRes.ok) {
          const { data } = await servicesRes.json()
          setHasServices((data ?? []).length > 0)
        }
        if (hoursRes.ok) {
          const { data } = await hoursRes.json()
          const active = (data ?? []).filter((h: { isActive: boolean }) => h.isActive)
          setHasHours(active.length > 0)
        }
        if (appointmentsRes.ok) {
          const { data } = await appointmentsRes.json()
          const now = new Date()
          const upcoming = (data ?? [] as Appointment[])
            .filter((a: Appointment) => ['PENDING', 'CONFIRMED'].includes(a.status) && new Date(a.startTime) >= now)
            .sort((a: Appointment, b: Appointment) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
            .slice(0, 4)
          setUpcomingAppointments(upcoming)
        }
      })
      .catch(() => {})
  }, [])

  async function activateProfile() {
    if (!profile?.id) return
    setActivating(true)
    try {
      const res = await fetch(`/api/nailists/${profile.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: true }),
      })
      if (res.ok) setProfile(prev => prev ? { ...prev, isActive: true } : prev)
    } finally {
      setActivating(false)
    }
  }

  const checklist = [
    { label: 'פרטי עסק (שם + כתובת)', done: !!(profile?.businessName && (profile?.city || profile?.address)) },
    { label: 'הוסיפי שירותים ומחירים', done: hasServices },
    { label: 'העלי תמונות לפורטפוליו', done: hasPhotos },
    { label: 'הגדירי שעות עבודה', done: hasHours },
    { label: 'הוסיפי קישורי רשתות חברתיות', done: !!(profile?.instagramUrl || profile?.tiktokUrl) },
  ]
  const doneCount = checklist.filter(c => c.done).length
  const completionPct = Math.round((doneCount / checklist.length) * 100)

  return (
    <div className="p-4 md:p-8">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-black text-gray-800">שלום, {firstName}! 👋</h1>
        <p className="text-gray-400 font-medium">הנה סקירה של העסק שלך</p>
      </motion.div>

      {/* Hidden profile banner */}
      {profile && !profile.isActive && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 bg-amber-50 border-2 border-amber-200 rounded-2xl p-4 flex items-center gap-4"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
            <EyeOff className="h-5 w-5 text-amber-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-black text-amber-800 text-sm">הפרופיל שלך מוסתר מלקוחות</p>
            <p className="text-xs text-amber-600 font-medium mt-0.5">לקוחות לא יכולות למצוא אותך בחיפוש כרגע</p>
          </div>
          <button
            onClick={activateProfile}
            disabled={activating}
            className="shrink-0 flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-black rounded-xl px-4 py-2 transition-colors disabled:opacity-60"
          >
            <Eye className="h-4 w-4" />
            {activating ? 'מפרסמת...' : 'פרסמי עכשיו'}
          </button>
        </motion.div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5 mb-6 md:mb-8">
        {stats.map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: i * 0.08 }}
            className={`rounded-3xl border-2 ${stat.border} bg-gradient-to-br ${stat.bg} p-6`}>
            <div className="flex items-center justify-between mb-4">
              <span className="text-2xl">{stat.icon}</span>
              <TrendingUp className="h-4 w-4 text-gray-300" />
            </div>
            <div className="text-3xl font-black text-gray-800 mb-1">{stat.value}</div>
            <div className="text-sm font-bold text-gray-500">{stat.label}</div>
            <div className="text-xs text-gray-400 mt-1 font-medium">{stat.change}</div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-5">
        {/* Upcoming appointments */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
          className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-lg font-black text-gray-800">תורים קרובים</h3>
              <p className="text-sm text-gray-400 font-medium">ההזמנות הבאות שלך</p>
            </div>
            <span className="text-2xl">📅</span>
          </div>

          {upcomingAppointments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center text-3xl mb-4">📭</div>
              <p className="text-sm font-bold text-gray-400 mb-4">אין תורים קרובים</p>
              <Link href="/dashboard/nailist/hours"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:border-pink-300 hover:text-pink-600 transition-colors">
                <Clock className="h-4 w-4" />
                הגדרי זמינות
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingAppointments.map((apt, i) => {
                const { day, time } = formatAppointmentTime(apt.startTime)
                const symbol = apt.currency === 'ILS' ? '₪' : '$'
                return (
                  <motion.div
                    key={apt.id}
                    initial={{ opacity: 0, x: 16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + i * 0.06 }}
                    className="flex items-center gap-3 p-3 rounded-2xl border border-gray-100 hover:border-pink-100 hover:bg-pink-50/30 transition-all"
                  >
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-100 to-purple-100 flex items-center justify-center text-lg shrink-0">
                      💅
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-black text-gray-800 truncate">{apt.serviceName}</span>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${STATUS_COLORS[apt.status]}`}>
                          {STATUS_LABELS[apt.status]}
                        </span>
                      </div>
                      <div className="text-xs text-gray-400 font-medium mt-0.5">
                        {day} • {time} • {symbol}{apt.price}
                      </div>
                    </div>
                  </motion.div>
                )
              })}
              <Link
                href="/dashboard/nailist/appointments"
                className="flex items-center justify-center gap-1 text-sm font-bold text-pink-500 hover:text-pink-700 pt-1 transition-colors"
              >
                כל התורים
                <ChevronLeft className="h-4 w-4" />
              </Link>
            </div>
          )}
        </motion.div>

        {/* Recent reviews */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-lg font-black text-gray-800">ביקורות אחרונות</h3>
              <p className="text-sm text-gray-400 font-medium">מה הלקוחות אומרות</p>
            </div>
            <span className="text-2xl">⭐</span>
          </div>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center text-3xl mb-4">💭</div>
            <p className="text-sm font-bold text-gray-400 mb-1">אין ביקורות עדיין</p>
            <p className="text-xs text-gray-300 font-medium">השלימי תורים כדי לקבל ביקורות</p>
          </div>
        </motion.div>

        {/* Profile completion */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
          className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-lg font-black text-gray-800">השלמת פרופיל</h3>
              <p className="text-sm text-gray-400 font-medium">משכי יותר לקוחות</p>
            </div>
            <span className="text-2xl">📝</span>
          </div>
          <div className="mb-4">
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <motion.div initial={{ width: 0 }} animate={{ width: `${completionPct}%` }} transition={{ duration: 1, delay: 0.6 }}
                className="h-full bg-gradient-to-r from-pink-500 to-purple-600 rounded-full" />
            </div>
            <p className="text-xs text-gray-400 font-medium mt-1">{completionPct}% הושלם</p>
          </div>
          <div className="space-y-3">
            {checklist.map((item, i) => (
              <motion.div key={item.label} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 + i * 0.05 }}
                className="flex items-center gap-3 text-sm">
                {item.done ? <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" /> : <Circle className="w-5 h-5 text-gray-200 shrink-0" />}
                <span className={item.done ? 'text-gray-400 line-through' : 'text-gray-600 font-medium'}>{item.label}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Quick actions */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
          className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-lg font-black text-gray-800">פעולות מהירות</h3>
              <p className="text-sm text-gray-400 font-medium">קיצורי דרך שימושיים</p>
            </div>
            <span className="text-2xl">⚡</span>
          </div>
          <div className="space-y-3">
            {quickActions.map((action, i) => (
              <motion.a key={action.label} href={action.href} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.55 + i * 0.07 }} whileHover={{ x: -4 }}
                className="flex items-center gap-3 w-full px-4 py-3 rounded-2xl border border-gray-100 text-sm font-bold text-gray-600 hover:border-pink-200 hover:text-pink-600 hover:bg-pink-50/50 transition-all">
                <span className="text-lg">{action.icon}</span>
                {action.label}
              </motion.a>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  )
}
