'use client'

import { useState, useEffect } from 'react'
import { Search, Filter, AlertTriangle } from 'lucide-react'

interface Counted {
  value: string
  count: number
}

interface SearchAnalytics {
  sampledEvents: number
  topQueries: Counted[]
  topFilters: Counted[]
  zeroResultQueries: Counted[]
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

  return (
    <div className="p-4 md:p-8 space-y-6 md:space-y-8">
      <div>
        <h1 className="text-2xl font-black text-foreground">אנלטיקה</h1>
        <p className="text-muted-foreground text-sm mt-1">
          מה לקוחות מחפשות — מבוסס על {data.sampledEvents.toLocaleString()} חיפושים אחרונים
        </p>
      </div>

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
            <div className="p-2 rounded-xl bg-amber-100 text-amber-700">
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
