'use client'

import { useState, useEffect } from 'react'
import { Search, Loader2, Star, MapPin, ToggleLeft, ToggleRight, ExternalLink } from 'lucide-react'
import Link from 'next/link'

interface AdminNailist {
  id: string
  userId: string
  businessName: string
  city: string
  isActive: boolean
  isVerified: boolean
  avgRating: number
  reviewCount: number
  createdAt: string | null
}

export default function AdminNailistsPage() {
  const [nailists, setNailists] = useState<AdminNailist[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [toggling, setToggling] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/nailists')
      .then(r => r.json())
      .then(j => { setNailists(j.data ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  async function toggleActive(n: AdminNailist) {
    setToggling(n.id)
    const res = await fetch(`/api/admin/nailists/${n.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !n.isActive }),
    })
    if (res.ok) {
      setNailists(prev => prev.map(x => x.id === n.id ? { ...x, isActive: !x.isActive } : x))
    }
    setToggling(null)
  }

  const filtered = nailists.filter(n => {
    const s = search.toLowerCase()
    return !s || n.businessName.toLowerCase().includes(s) || n.city.toLowerCase().includes(s)
  })

  return (
    <div className="p-4 md:p-8 space-y-5 md:space-y-6">
      <div>
        <h1 className="text-2xl font-black text-foreground">ניהול נייליסטיות</h1>
        <p className="text-muted-foreground text-sm mt-1">{nailists.length} נייליסטיות סה״כ · {nailists.filter(n => n.isActive).length} פעילות</p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="חיפוש לפי שם עסק / עיר..."
          className="w-full pr-10 pl-4 py-2.5 bg-card border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
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
                  <th className="text-right px-5 py-3 font-semibold text-muted-foreground">שם עסק</th>
                  <th className="text-right px-5 py-3 font-semibold text-muted-foreground">עיר</th>
                  <th className="text-right px-5 py-3 font-semibold text-muted-foreground">דירוג</th>
                  <th className="text-right px-5 py-3 font-semibold text-muted-foreground">הצטרפה</th>
                  <th className="text-right px-5 py-3 font-semibold text-muted-foreground">סטטוס</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map(n => (
                  <tr key={n.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground">{n.businessName}</span>
                        {n.isVerified && <span className="text-xs text-primary">✓</span>}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {n.city || '—'}
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1 text-amber-500">
                        <Star className="w-3.5 h-3.5 fill-amber-400" />
                        <span className="font-medium text-foreground">{n.avgRating || '—'}</span>
                        <span className="text-muted-foreground text-xs">({n.reviewCount})</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">
                      {n.createdAt ? new Date(n.createdAt).toLocaleDateString('he-IL') : '—'}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold border ${n.isActive ? 'bg-green-50 text-green-600 border-green-200' : 'bg-red-50 text-red-500 border-red-200'}`}>
                        {n.isActive ? 'פעילה' : 'לא פעילה'}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleActive(n)}
                          disabled={toggling === n.id}
                          title={n.isActive ? 'השבת' : 'הפעל'}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors disabled:opacity-40"
                        >
                          {toggling === n.id
                            ? <Loader2 className="w-4 h-4 animate-spin" />
                            : n.isActive
                              ? <ToggleRight className="w-5 h-5 text-green-500" />
                              : <ToggleLeft className="w-5 h-5" />
                          }
                        </button>
                        <Link
                          href={`/nailists/${n.id}`}
                          target="_blank"
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Link>
                      </div>
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
