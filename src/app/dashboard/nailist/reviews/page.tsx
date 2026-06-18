'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Loader2, Star } from 'lucide-react'

interface Review {
  id: string
  rating: number
  comment?: string
  clientDisplayName?: string
  createdAt: string
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
        <h1 className="text-2xl font-black text-gray-800">ביקורות</h1>
        <p className="text-gray-400 font-medium text-sm">מה הלקוחות אומרות עלייך</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-pink-400" />
        </div>
      ) : (
        <>
          {reviews.length > 0 && (
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-3xl border border-amber-100 p-6 mb-6 flex items-center gap-4">
              <div className="text-5xl font-black text-amber-600">{avgRating.toFixed(1)}</div>
              <div>
                <div className="flex gap-0.5 mb-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`h-5 w-5 ${i < Math.round(avgRating) ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`}
                    />
                  ))}
                </div>
                <p className="text-sm font-bold text-gray-500">{reviews.length} ביקורות</p>
              </div>
            </div>
          )}

          {reviews.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-4xl mb-3">💬</div>
              <p className="font-black text-gray-400 mb-2">אין ביקורות עדיין</p>
              <p className="text-sm text-gray-300">לקוחות יכולות לכתוב ביקורת לאחר השלמת תור</p>
            </div>
          ) : (
            <div className="space-y-4">
              {reviews.map((review, i) => (
                <motion.div
                  key={review.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.07 }}
                  className="bg-white rounded-2xl border border-gray-100 p-5"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="font-bold text-gray-700">{review.clientDisplayName ?? 'לקוחה'}</div>
                    <div className="flex gap-0.5">
                      {Array.from({ length: 5 }).map((_, j) => (
                        <Star
                          key={j}
                          className={`h-4 w-4 ${j < review.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`}
                        />
                      ))}
                    </div>
                  </div>
                  {review.comment && <p className="text-sm text-gray-600 leading-relaxed">{review.comment}</p>}
                  <p className="text-xs text-gray-300 mt-2">
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
