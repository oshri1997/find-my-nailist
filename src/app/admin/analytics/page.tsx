'use client'

import { useState, useEffect } from 'react'
import type { ReactNode } from 'react'
import { Search, Filter, AlertTriangle, Link as LinkIcon, MousePointerClick } from 'lucide-react'

interface Counted {
  value: string
  count: number
}

interface SearchAnalytics {
  sampledEvents: number
  topQueries: Counted[]
  topFilters: Counted[]
  zeroResultQueries: Counted[]
  visitAnalytics: {
    sampledVisits: number
    googleVisits: number
    directVisits: number
    otherVisits: number
  }
}

function CountedList({ items, emptyText }: { items: Counted[]; emptyText: string }) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground py-6 text-center">{emptyText}</p>
  }
  const max = items[0]?.count ?? 1
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item.value} className="flex items-center gap-3">
          <span className="text-sm font-semibold text-foreground w-28 md:w-40 truncate shrink-0">{item.value}</span>
          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full"
              style={{ width: `${Math.max(4, (item.count / max) * 100)}%` }}
            />
          </div>
          <span className="text-sm font-black text-foreground w-8 text-left shrink-0">{item.count}</span>
        </li>
      ))}
    </ul>
  )
}

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<SearchAnalytics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/analytics/search')
      .then((r) => r.json())
      .then((j) => { setData(j.data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-48" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-64 bg-muted rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!data) return <div className="p-4 md:p-8 text-muted-foreground">שגיאה בטעינת הנתונים</div>

  const visits = data.visitAnalytics

  return (
    <div className="p-4 md:p-8 space-y-6 md:space-y-8">
      <div>
        <h1 className="text-2xl font-black text-foreground">אנלטיקה</h1>
        <p className="text-muted-foreground text-sm mt-1">
          מה לקוחות מחפשות — מבוסס על {data.sampledEvents.toLocaleString()} חיפושים אחרונים
        </p>
      </div>

      <section aria-labelledby="visit-analytics-heading" className="space-y-3">
        <div>
          <h2 id="visit-analytics-heading" className="text-lg font-black text-foreground">כניסות לאפליקציה</h2>
          <p className="text-muted-foreground text-sm">{visits.sampledVisits.toLocaleString()} כניסות אנונימיות אחרונות לפי מקור הגעה</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <VisitCard label="מגוגל" count={visits.googleVisits} icon={<Search className="w-4 h-4" />} />
          <VisitCard label="קישור ישיר" count={visits.directVisits} icon={<LinkIcon className="w-4 h-4" />} />
          <VisitCard label="מקור אחר" count={visits.otherVisits} icon={<MousePointerClick className="w-4 h-4" />} />
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Search className="w-4 h-4" />
            </div>
            <h2 className="font-black text-foreground">חיפושים נפוצים</h2>
          </div>
          <CountedList items={data.topQueries} emptyText="אין עדיין חיפושי טקסט" />
        </div>

        <div className="bg-card border border-border rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Filter className="w-4 h-4" />
            </div>
            <h2 className="font-black text-foreground">סינון לפי טיפול</h2>
          </div>
          <CountedList items={data.topFilters} emptyText="אין עדיין נתוני סינון" />
        </div>

        <div className="bg-card border border-border rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 rounded-xl bg-foreground/10 text-foreground">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <h2 className="font-black text-foreground">חיפושים ללא תוצאות</h2>
          </div>
          <p className="text-xs text-muted-foreground mb-3">ביקוש שעדיין לא נענה — כדאי לבדוק לפני הוספת עמודי עיר+טיפול</p>
          <CountedList items={data.zeroResultQueries} emptyText="כל החיפושים החזירו תוצאות" />
        </div>
      </div>
    </div>
  )
}

function VisitCard({ label, count, icon }: { label: string; count: number; icon: ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-5">
      <div className="flex items-center gap-2 text-muted-foreground text-sm font-semibold">
        <span className="p-2 rounded-xl bg-primary/10 text-primary">{icon}</span>
        {label}
      </div>
      <p className="text-3xl font-black text-foreground mt-4">{count.toLocaleString()}</p>
    </div>
  )
}
