'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Loader2, Trash2, Star } from 'lucide-react'

interface AdminReview {
  id: string
  nailistProfileId: string
  nailistBusinessName: string
  clientDisplayName: string
  rating: number
  comment: string
  createdAt: string | null
}

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<AdminReview[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<AdminReview | null>(null)

  useEffect(() => {
    fetch('/api/admin/reviews')
      .then(r => r.json())
      .then(j => { setReviews(j.data ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  async function handleDelete(review: AdminReview) {
    setDeleting(review.id)
    setConfirmDelete(null)
    const res = await fetch(`/api/admin/reviews/${review.id}`, { method: 'DELETE' })
    if (res.ok) setReviews(prev => prev.filter(r => r.id !== review.id))
    setDeleting(null)
  }

  return (
    <div className="p-4 md:p-8 space-y-5 md:space-y-6">
      <div>
        <h1 className="text-2xl font-black text-foreground">ניהול ביקורות</h1>
        <p className="text-muted-foreground text-sm mt-1">{reviews.length} ביקורות סה״כ</p>
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
                  <th className="text-right px-5 py-3 font-semibold text-muted-foreground">לקוחה</th>
                  <th className="text-right px-5 py-3 font-semibold text-muted-foreground">נייליסטית</th>
                  <th className="text-right px-5 py-3 font-semibold text-muted-foreground">דירוג</th>
                  <th className="text-right px-5 py-3 font-semibold text-muted-foreground">תגובה</th>
                  <th className="text-right px-5 py-3 font-semibold text-muted-foreground">תאריך</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {reviews.map(r => (
                  <tr key={r.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-5 py-3 font-medium text-foreground">{r.clientDisplayName || '—'}</td>
                    <td className="px-5 py-3">
                      {r.nailistBusinessName ? (
                        <Link
                          href={`/nailists/${r.nailistProfileId}`}
                          className="text-primary hover:underline font-medium"
                        >
                          {r.nailistBusinessName}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground text-xs">{r.nailistProfileId || '—'}</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} className={`w-3.5 h-3.5 ${i < r.rating ? 'fill-amber-400 text-amber-400' : 'text-muted'}`} />
                        ))}
                        <span className="text-foreground font-semibold mr-1">{r.rating}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground max-w-xs truncate">{r.comment || '—'}</td>
                    <td className="px-5 py-3 text-muted-foreground whitespace-nowrap">
                      {r.createdAt ? new Date(r.createdAt).toLocaleDateString('he-IL') : '—'}
                    </td>
                    <td className="px-5 py-3">
                      <button
                        onClick={() => setConfirmDelete(r)}
                        disabled={deleting === r.id}
                        className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-40"
                      >
                        {deleting === r.id
                          ? <Loader2 className="w-4 h-4 animate-spin" />
                          : <Trash2 className="w-4 h-4" />
                        }
                      </button>
                    </td>
                  </tr>
                ))}
                {reviews.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-muted-foreground">אין ביקורות</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-2xl p-6 max-w-sm w-full space-y-4">
            <h3 className="font-black text-foreground">מחיקת ביקורת</h3>
            <p className="text-sm text-muted-foreground">
              בטוח למחוק את הביקורת של <strong>{confirmDelete.clientDisplayName}</strong>?
              הדירוג הממוצע של הנייליסטית יתעדכן בהתאם.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => handleDelete(confirmDelete)}
                className="flex-1 bg-destructive text-destructive-foreground rounded-xl py-2.5 text-sm font-bold hover:bg-destructive/90 transition-colors"
              >
                מחק
              </button>
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 bg-muted text-foreground rounded-xl py-2.5 text-sm font-bold hover:bg-muted/70 transition-colors"
              >
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
