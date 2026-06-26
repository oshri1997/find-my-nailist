'use client'

import { useState, useEffect } from 'react'
import { Users, Scissors, Calendar, Star, TrendingUp, CheckCircle2, Clock, XCircle, UserPlus } from 'lucide-react'

interface Stats {
  totalUsers: number
  totalNailists: number
  totalClients: number
  activeNailists: number
  totalAppointments: number
  appointmentsByStatus: Record<string, number>
  totalReviews: number
  avgRating: number
  newUsersThisWeek: number
  totalRevenue: number
}

const STATUS_HE: Record<string, string> = {
  PENDING: 'ממתין',
  CONFIRMED: 'מאושר',
  COMPLETED: 'הושלם',
  CANCELLED: 'בוטל',
  NO_SHOW: 'לא הגיע',
}

const STATUS_COLOR: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-700',
  CONFIRMED: 'bg-green-100 text-green-700',
  COMPLETED: 'bg-blue-100 text-blue-700',
  CANCELLED: 'bg-red-100 text-red-600',
  NO_SHOW: 'bg-gray-100 text-gray-600',
}

function StatCard({ label, value, icon: Icon, sub, color = 'text-primary' }: {
  label: string
  value: number | string
  icon: React.ElementType
  sub?: string
  color?: string
}) {
  return (
    <div className="bg-card border border-border rounded-2xl p-5">
      <div className="flex items-start justify-between mb-3">
        <span className="text-sm text-muted-foreground font-medium">{label}</span>
        <div className={`p-2 rounded-xl bg-primary/10 ${color}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <p className="text-3xl font-black text-foreground">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  )
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/stats')
      .then(r => r.json())
      .then(j => { setStats(j.data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-48" />
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-28 bg-muted rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!stats) return <div className="p-4 md:p-8 text-muted-foreground">שגיאה בטעינת הנתונים</div>

  return (
    <div className="p-4 md:p-8 space-y-6 md:space-y-8">
      <div>
        <h1 className="text-2xl font-black text-foreground">דשבורד</h1>
        <p className="text-muted-foreground text-sm mt-1">סקירה כללית של המערכת</p>
      </div>

      {/* Main stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        <StatCard label="סה״כ משתמשים" value={stats.totalUsers.toLocaleString()} icon={Users} />
        <StatCard label="לקוחות" value={stats.totalClients.toLocaleString()} icon={UserPlus} />
        <StatCard label="נייליסטיות" value={stats.totalNailists.toLocaleString()} icon={Scissors} />
        <StatCard label="נייליסטיות פעילות" value={stats.activeNailists.toLocaleString()} icon={CheckCircle2} sub={`מתוך ${stats.totalNailists}`} />
        <StatCard label="סה״כ הזמנות" value={stats.totalAppointments.toLocaleString()} icon={Calendar} />
        <StatCard label="ביקורות" value={stats.totalReviews.toLocaleString()} icon={Star} sub={`דירוג ממוצע: ★ ${stats.avgRating}`} />
        <StatCard label="הצטרפו השבוע" value={stats.newUsersThisWeek} icon={TrendingUp} />
        <StatCard label="הכנסות (הושלמו)" value={`₪${stats.totalRevenue.toLocaleString()}`} icon={TrendingUp} />
      </div>

      {/* Appointments breakdown */}
      <div className="bg-card border border-border rounded-2xl p-4 md:p-6">
        <h2 className="font-black text-foreground mb-4">הזמנות לפי סטטוס</h2>
        <div className="flex flex-wrap gap-3">
          {Object.entries(stats.appointmentsByStatus).map(([status, count]) => (
            <div key={status} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold ${STATUS_COLOR[status] ?? 'bg-muted text-muted-foreground'}`}>
              <span>{STATUS_HE[status] ?? status}</span>
              <span className="font-black text-base">{count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Quick nav */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {[
          { href: '/admin/users', label: 'ניהול משתמשים', desc: `${stats.totalUsers} משתמשים`, icon: Users },
          { href: '/admin/nailists', label: 'ניהול נייליסטיות', desc: `${stats.activeNailists} פעילות`, icon: Scissors },
          { href: '/admin/appointments', label: 'הזמנות', desc: `${stats.appointmentsByStatus.PENDING ?? 0} ממתינות`, icon: Clock },
          { href: '/admin/reviews', label: 'ביקורות', desc: `${stats.totalReviews} ביקורות`, icon: Star },
        ].map(({ href, label, desc, icon: Icon }) => (
          <a key={href} href={href} className="bg-card border border-border rounded-2xl p-5 hover:border-primary/40 hover:shadow-lg transition-all group">
            <Icon className="w-6 h-6 text-primary mb-3" />
            <p className="font-bold text-foreground text-sm group-hover:text-primary transition-colors">{label}</p>
            <p className="text-xs text-muted-foreground mt-1">{desc}</p>
          </a>
        ))}
      </div>
    </div>
  )
}
