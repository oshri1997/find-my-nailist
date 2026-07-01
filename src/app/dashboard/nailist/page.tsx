'use client'

import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { TrendingUp, Clock, CheckCircle2, Circle, ChevronLeft, Eye, EyeOff, Star, Scissors, Users, Wallet, Calendar, Inbox, MessageSquare, FileText, Zap } from 'lucide-react'
import { useAuth } from '@/components/auth/auth-provider'

function CountUp({ to, prefix = '', decimals = 0, duration = 1500 }: {
  to: number
  prefix?: string
  decimals?: number
  duration?: number
}) {
  const spanRef = useRef<HTMLSpanElement>(null)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    const el = spanRef.current
    if (!el) return
    if (rafRef.current) cancelAnimationFrame(rafRef.current)

    if (to === 0) {
      el.textContent = prefix + (decimals > 0 ? (0).toFixed(decimals) : '0')
      return
    }

    let startTime: number | null = null
    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp
      const progress = Math.min((timestamp - startTime) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      const val = eased * to
      const formatted = decimals > 0 ? val.toFixed(decimals) : Math.round(val).toLocaleString()
      el.textContent = prefix + formatted
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(step)
      }
    }
    rafRef.current = requestAnimationFrame(step)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [to, duration, decimals, prefix])

  const initial = decimals > 0 ? (0).toFixed(decimals) : '0'
  return <span ref={spanRef}>{prefix}{initial}</span>
}

type AppStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW'

interface Appointment {
  id: string
  clientProfileId: string
  serviceName: string
  startTime: string
  endTime: string
  status: AppStatus
  price: number
  currency: string
}

interface Review {
  id: string
  rating: number
  comment?: string
  clientDisplayName?: string
  createdAt: string
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
  NO_SHOW: 'bg-muted text-muted-foreground border-border',
}

function formatAppointmentTime(iso: string) {
  const d = new Date(iso)
  const day = d.toLocaleDateString('he-IL', { weekday: 'short', day: 'numeric', month: 'short' })
  const time = d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })
  return { day, time }
}

const quickActions = [
  { label: 'הגדרת שעות עבודה', icon: Clock, href: '/dashboard/nailist/hours' },
  { label: 'הוספת שירות חדש', icon: Scissors, href: '/dashboard/nailist/services' },
  { label: 'צפייה בפרופיל ציבורי', icon: Eye, href: '/search' },
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
  avgRating?: number
  reviewCount?: number
}

function formatReviewerName(displayName?: string) {
  if (!displayName) return 'לקוחה'
  const parts = displayName.trim().split(/\s+/)
  if (parts.length < 2) return parts[0]
  return `${parts[0]} ${parts[1][0]}.`
}

export default function NailistDashboard() {
  const { user } = useAuth()
  const firstName = user?.displayName?.split(' ')[0] ?? user?.email?.split('@')[0] ?? 'נייליסטית'
  const [profile, setProfile] = useState<NailistProfile | null>(null)
  const [hasPhotos, setHasPhotos] = useState(false)
  const [hasServices, setHasServices] = useState(false)
  const [hasHours, setHasHours] = useState(false)
  const [allAppointments, setAllAppointments] = useState<Appointment[]>([])
  const [upcomingAppointments, setUpcomingAppointments] = useState<Appointment[]>([])
  const [recentReviews, setRecentReviews] = useState<Review[]>([])
  const [activating, setActivating] = useState(false)

  useEffect(() => {
    fetch('/api/me/nailist-profile')
      .then(r => r.ok ? r.json() : null)
      .then(async (json) => {
        if (!json?.data) return
        setProfile(json.data)
        const profileId = json.data.id

        const [portfolioRes, servicesRes, hoursRes, appointmentsRes, nailistRes] = await Promise.all([
          fetch(`/api/portfolio?profileId=${profileId}`),
          fetch(`/api/services?nailistProfileId=${profileId}`),
          fetch('/api/working-hours'),
          fetch('/api/appointments?role=nailist'),
          fetch(`/api/nailists/${profileId}`),
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
          const all: Appointment[] = data ?? []
          setAllAppointments(all)
          const now = new Date()
          const upcoming = all
            .filter(a => ['PENDING', 'CONFIRMED'].includes(a.status) && new Date(a.startTime) >= now)
            .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
            .slice(0, 4)
          setUpcomingAppointments(upcoming)
        }
        if (nailistRes.ok) {
          const { data: nailistData } = await nailistRes.json()
          setRecentReviews((nailistData.reviews ?? []).slice(0, 3))
          setProfile(prev => prev ? {
            ...prev,
            avgRating: nailistData.avgRating ?? prev.avgRating,
            reviewCount: nailistData.reviewCount ?? prev.reviewCount,
          } : prev)
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

  // Compute stats from live data
  const now = new Date()
  const active = allAppointments.filter(a => a.status !== 'CANCELLED' && a.status !== 'NO_SHOW')
  const thisMonthActive = active.filter(a => {
    const d = new Date(a.startTime)
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
  })
  const totalAppointments = active.length
  const thisMonthAppointments = thisMonthActive.length
  const uniqueClients = new Set(active.map(a => a.clientProfileId)).size
  const thisMonthClients = new Set(thisMonthActive.map(a => a.clientProfileId)).size
  const totalRevenue = allAppointments
    .filter(a => a.status === 'COMPLETED')
    .reduce((sum, a) => sum + (a.price ?? 0), 0)
  const thisMonthRevenue = thisMonthActive
    .filter(a => a.status === 'COMPLETED')
    .reduce((sum, a) => sum + (a.price ?? 0), 0)

  const computedStats = [
    {
      label: 'תורים',
      node: <CountUp to={totalAppointments} />,
      icon: <Calendar className="h-5 w-5 text-pink-500" />,
      change: `+${thisMonthAppointments} החודש`,
      bg: 'from-pink-50 to-rose-50 dark:from-pink-950/50 dark:to-rose-950/50',
      border: 'border-pink-100 dark:border-pink-900/50',
    },
    {
      label: 'לקוחות',
      node: <CountUp to={uniqueClients} />,
      icon: <Users className="h-5 w-5 text-purple-500" />,
      change: `+${thisMonthClients} החודש`,
      bg: 'from-purple-50 to-violet-50 dark:from-purple-950/50 dark:to-violet-950/50',
      border: 'border-purple-100 dark:border-purple-900/50',
    },
    {
      label: 'הכנסות',
      node: <CountUp to={totalRevenue} prefix="₪" />,
      icon: <Wallet className="h-5 w-5 text-violet-500" />,
      change: `+₪${thisMonthRevenue} החודש`,
      bg: 'from-violet-50 to-blue-50 dark:from-violet-950/50 dark:to-blue-950/50',
      border: 'border-violet-100 dark:border-violet-900/50',
    },
    {
      label: 'דירוג ממוצע',
      node: profile?.avgRating
        ? <CountUp to={profile.avgRating} decimals={1} />
        : <span>—</span>,
      icon: <Star className="h-5 w-5 text-amber-400" />,
      change: profile?.reviewCount ? `${profile.reviewCount} ביקורות` : 'אין ביקורות עדיין',
      bg: 'from-amber-50 to-orange-50 dark:from-amber-950/50 dark:to-orange-950/50',
      border: 'border-amber-100 dark:border-amber-900/50',
    },
  ]

  return (
    <div className="p-4 md:p-8">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-black text-foreground">שלום, {firstName}</h1>
        <p className="text-muted-foreground font-medium">הנה סקירה של העסק שלך</p>
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
        {computedStats.map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: i * 0.08 }}
            className={`rounded-3xl border-2 ${stat.border} bg-gradient-to-br ${stat.bg} p-6`}>
            <div className="flex items-center justify-between mb-4">
              {stat.icon}
              <TrendingUp className="h-4 w-4 text-muted-foreground/40" />
            </div>
            <div className="text-3xl font-black text-foreground mb-1">{stat.node}</div>
            <div className="text-sm font-bold text-muted-foreground">{stat.label}</div>
            <div className="text-xs text-muted-foreground/70 mt-1 font-medium">{stat.change}</div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-5">
        {/* Upcoming appointments */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
          className="bg-card rounded-3xl border border-border p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-lg font-black text-foreground">תורים קרובים</h3>
              <p className="text-sm text-muted-foreground font-medium">ההזמנות הבאות שלך</p>
            </div>
            <Calendar className="h-5 w-5 text-pink-400" />
          </div>

          {upcomingAppointments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                <Inbox className="h-7 w-7 text-muted-foreground" />
              </div>
              <p className="text-sm font-bold text-muted-foreground mb-4">אין תורים קרובים</p>
              <Link href="/dashboard/nailist/hours"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-border text-sm font-bold text-muted-foreground hover:border-pink-300 hover:text-pink-600 transition-colors">
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
                    className="flex items-center gap-3 p-3 rounded-2xl border border-border hover:border-pink-100 hover:bg-pink-50/20 dark:hover:bg-pink-950/20 transition-all"
                  >
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-100 to-purple-100 flex items-center justify-center shrink-0">
                      <Scissors className="h-4 w-4 text-pink-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-black text-foreground truncate">{apt.serviceName}</span>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${STATUS_COLORS[apt.status]}`}>
                          {STATUS_LABELS[apt.status]}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground font-medium mt-0.5">
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
          className="bg-card rounded-3xl border border-border p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-lg font-black text-foreground">ביקורות אחרונות</h3>
              <p className="text-sm text-muted-foreground font-medium">מה הלקוחות אומרות</p>
            </div>
            <Star className="h-5 w-5 text-amber-400 fill-amber-400" />
          </div>

          {recentReviews.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                <MessageSquare className="h-7 w-7 text-muted-foreground" />
              </div>
              <p className="text-sm font-bold text-muted-foreground mb-1">אין ביקורות עדיין</p>
              <p className="text-xs text-muted-foreground/60 font-medium">השלימי תורים כדי לקבל ביקורות</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentReviews.map((review, i) => (
                <motion.div
                  key={review.id}
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + i * 0.06 }}
                  className="p-3 rounded-2xl border border-border"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-bold text-foreground">{formatReviewerName(review.clientDisplayName)}</span>
                    <div className="flex gap-0.5">
                      {Array.from({ length: 5 }).map((_, j) => (
                        <Star key={j} className={`h-3.5 w-3.5 ${j < review.rating ? 'fill-amber-400 text-amber-400' : 'text-border'}`} />
                      ))}
                    </div>
                  </div>
                  {review.comment && (
                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{review.comment}</p>
                  )}
                </motion.div>
              ))}
              <Link
                href="/dashboard/nailist/reviews"
                className="flex items-center justify-center gap-1 text-sm font-bold text-pink-500 hover:text-pink-700 pt-1 transition-colors"
              >
                כל הביקורות
                <ChevronLeft className="h-4 w-4" />
              </Link>
            </div>
          )}
        </motion.div>

        {/* Profile completion */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
          className="bg-card rounded-3xl border border-border p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-lg font-black text-foreground">השלמת פרופיל</h3>
              <p className="text-sm text-muted-foreground font-medium">משכי יותר לקוחות</p>
            </div>
            <FileText className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="mb-4">
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <motion.div initial={{ width: 0 }} animate={{ width: `${completionPct}%` }} transition={{ duration: 1, delay: 0.6 }}
                className="h-full bg-gradient-to-r from-pink-500 to-purple-600 rounded-full" />
            </div>
            <p className="text-xs text-muted-foreground font-medium mt-1">{completionPct}% הושלם</p>
          </div>
          <div className="space-y-3">
            {checklist.map((item, i) => (
              <motion.div key={item.label} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 + i * 0.05 }}
                className="flex items-center gap-3 text-sm">
                {item.done ? <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" /> : <Circle className="w-5 h-5 text-muted-foreground/40 shrink-0" />}
                <span className={item.done ? 'text-muted-foreground line-through' : 'text-foreground/80 font-medium'}>{item.label}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Quick actions */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
          className="bg-card rounded-3xl border border-border p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-lg font-black text-foreground">פעולות מהירות</h3>
              <p className="text-sm text-muted-foreground font-medium">קיצורי דרך שימושיים</p>
            </div>
            <Zap className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="space-y-3">
            {quickActions.map((action, i) => {
              const href = action.href === '/search' && profile?.id ? `/nailists/${profile.id}` : action.href
              return (
                <motion.a key={action.label} href={href} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.55 + i * 0.07 }} whileHover={{ x: -4 }}
                  className="flex items-center gap-3 w-full px-4 py-3 rounded-2xl border border-border text-sm font-bold text-muted-foreground hover:border-pink-200 hover:text-pink-600 hover:bg-pink-50/30 dark:hover:bg-pink-950/20 transition-all">
                  <action.icon className="h-4 w-4 shrink-0" />
                  {action.label}
                </motion.a>
              )
            })}
          </div>
        </motion.div>
      </div>
    </div>
  )
}
