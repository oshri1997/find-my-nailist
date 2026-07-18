'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Loader2, Star, MessageSquare } from 'lucide-react'

interface Review {
  id: string
  rating: number
  comment?: string
  clientDisplayName?: string
  createdAt: string
}

function formatReviewerName(displayName?: string) {
  if (!displayName) return 'לקוחה'
  const parts = displayName.trim().split(/\s+/)
  if (parts.length < 2) return parts[0]
  return `${parts[0]} ${parts[1][0]}.`
}

export default function NailistReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [avgRating, setAvgRating] = useState(0)

  useEffect(() => {
    async function load() {
      const meRes = await fetch('/api/me/nailist-profile')
      if (!meRes.ok) { setLoading(false); return }
      const { data: profile } = await meRes.json()

      const res = await fetch(`/api/nailists/${profile.id}`)
      if (!res.ok) { setLoading(false); return }
      const { data } = await res.json()
      setReviews(data.reviews ?? [])
      setAvgRating(data.avgRating ?? 0)
      setLoading(false)
    }
    load()
  }, [])

  return (
    <div className="p-4 md:p-8" dir="rtl">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-foreground">ביקורות</h1>
        <p className="text-muted-foreground font-medium text-sm">מה הלקוחות אומרות עלייך</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {reviews.length > 0 && (
            <div className="bg-gradient-to-br from-primary/10 to-primary/5 dark:from-primary/30 dark:to-primary/10 rounded-3xl border border-primary/20 dark:border-primary/40 p-6 mb-6 flex items-center gap-4">
              <div className="text-5xl font-black text-foreground">{avgRating.toFixed(1)}</div>
              <div>
                <div className="flex gap-0.5 mb-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`h-5 w-5 ${i < Math.round(avgRating) ? 'fill-amber-400 text-amber-400' : 'text-border'}`}
                    />
                  ))}
                </div>
                <p className="text-sm font-bold text-muted-foreground">{reviews.length} ביקורות</p>
              </div>
            </div>
          )}

          {reviews.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-3">
              <MessageSquare className="h-6 w-6 text-muted-foreground" />
            </div>
              <p className="font-black text-muted-foreground mb-2">אין ביקורות עדיין</p>
              <p className="text-sm text-muted-foreground/50">לקוחות יכולות לכתוב ביקורת לאחר השלמת תור</p>
            </div>
          ) : (
            <div className="space-y-4">
              {reviews.map((review, i) => (
                <motion.div
                  key={review.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.07 }}
                  className="bg-card rounded-2xl border border-border p-5"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="font-bold text-foreground">{formatReviewerName(review.clientDisplayName)}</div>
                    <div className="flex gap-0.5">
                      {Array.from({ length: 5 }).map((_, j) => (
                        <Star
                          key={j}
                          className={`h-4 w-4 ${j < review.rating ? 'fill-amber-400 text-amber-400' : 'text-border'}`}
                        />
                      ))}
                    </div>
                  </div>
                  {review.comment && <p className="text-sm text-muted-foreground leading-relaxed">{review.comment}</p>}
                  <p className="text-xs text-muted-foreground/50 mt-2">
                    {new Date(review.createdAt).toLocaleDateString('he-IL')}
                  </p>
                </motion.div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
