'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2, CalendarDays, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import ReviewModal from '@/components/reviews/ReviewModal'

interface Appointment {
  id: string
  nailistProfileId: string
  clientProfileId: string
  nailistBusinessName: string
  serviceName: string
  startTime: string
  endTime: string
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW'
  price: number
  currency: string
  hasReview?: boolean
  clientDisplayName?: string
}

const STATUS_LABELS: Record<Appointment['status'], string> = {
  PENDING: 'ממתין לאישור',
  CONFIRMED: 'מאושר',
  CANCELLED: 'בוטל',
  COMPLETED: 'הושלם',
  NO_SHOW: 'לא הגעתי',
}

const STATUS_COLORS: Record<Appointment['status'], string> = {
  PENDING: 'bg-amber-50 text-amber-600 border-amber-200',
  CONFIRMED: 'bg-green-50 text-green-600 border-green-200',
  CANCELLED: 'bg-red-50 text-red-500 border-red-200',
  COMPLETED: 'bg-blue-50 text-blue-600 border-blue-200',
  NO_SHOW: 'bg-gray-50 text-gray-400 border-gray-200',
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('he-IL', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  })
}

interface ReviewModalState {
  appointmentId: string
  nailistProfileId: string
  clientProfileId: string
  businessName: string
  serviceName: string
}

function MyAppointmentsInner() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refetchKey, setRefetchKey] = useState(0)
  const [reviewModal, setReviewModal] = useState<ReviewModalState | null>(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch('/api/appointments?role=client')
        if (res.status === 401) {
          const redirectUrl = window.location.pathname + window.location.search
          router.replace(`/login?redirect=${encodeURIComponent(redirectUrl)}`)
          return
        }
        if (!res.ok) {
          setError('שגיאה בטעינת התורים. נסי שוב.')
          return
        }
        const { data } = await res.json()
        const list: Appointment[] = data ?? []
        setAppointments(list)

        // Auto-open modal if ?review=<id> is in URL
        const reviewId = searchParams.get('review')
        if (reviewId) {
          const apt = list.find((a) => a.id === reviewId)
          if (apt && apt.status === 'COMPLETED' && !apt.hasReview) {
            setReviewModal({
              appointmentId: apt.id,
              nailistProfileId: apt.nailistProfileId,
              clientProfileId: apt.clientProfileId,
              businessName: apt.nailistBusinessName,
              serviceName: apt.serviceName,
            })
          }
        }
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [searchParams, refetchKey, router])

  function openReview(apt: Appointment) {
    setReviewModal({
      appointmentId: apt.id,
      nailistProfileId: apt.nailistProfileId,
      clientProfileId: apt.clientProfileId,
      businessName: apt.nailistBusinessName,
      serviceName: apt.serviceName,
    })
  }

  function handleReviewSuccess(appointmentId: string) {
    setAppointments((prev) =>
      prev.map((a) => a.id === appointmentId ? { ...a, hasReview: true } : a)
    )
    // Remove ?review param from URL if present
    if (searchParams.get('review')) {
      router.replace('/my-appointments')
    }
  }

  const symbol = (currency: string) => currency === 'ILS' ? '₪' : '$'

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50/30 via-white to-purple-50/20" dir="rtl">
      <div className="container mx-auto max-w-2xl px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-black text-gray-800 flex items-center gap-2">
            <CalendarDays className="h-6 w-6 text-primary" />
            ההזמנות שלי
          </h1>
          <p className="text-muted-foreground text-sm mt-1">היסטוריית התורים שלך</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-20 space-y-4"
          >
            <div className="text-5xl">😔</div>
            <h2 className="text-xl font-bold text-foreground">{error}</h2>
            <Button
              onClick={() => setRefetchKey((k) => k + 1)}
              className="mt-4 bg-primary hover:bg-primary/90 text-white rounded-xl font-bold cursor-pointer"
            >
              נסי שוב
            </Button>
          </motion.div>
        ) : appointments.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-20 space-y-4"
          >
            <div className="text-5xl">💅</div>
            <h2 className="text-xl font-bold text-foreground">עדיין אין תורים</h2>
            <p className="text-muted-foreground text-sm">בואי נזמין תור אצל נייליסטית!</p>
            <Link href="/search">
              <Button className="mt-4 bg-primary hover:bg-primary/90 text-white rounded-xl font-bold gap-2 cursor-pointer">
                <Search className="h-4 w-4" />
                חפשי נייליסטית
              </Button>
            </Link>
          </motion.div>
        ) : (
          <div className="space-y-3">
            {appointments.map((apt, i) => (
              <motion.div
                key={apt.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="bg-white rounded-2xl border border-border shadow-sm p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-foreground truncate">{apt.nailistBusinessName}</p>
                    <p className="text-sm text-muted-foreground truncate">{apt.serviceName}</p>
                    <p className="text-xs text-muted-foreground mt-1">{formatDateTime(apt.startTime)}</p>
                    <p className="text-xs font-semibold text-foreground/70 mt-0.5">
                      {symbol(apt.currency)}{apt.price}
                    </p>
                  </div>

                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${STATUS_COLORS[apt.status]}`}>
                      {STATUS_LABELS[apt.status]}
                    </span>

                    {apt.status === 'COMPLETED' && !apt.hasReview && (
                      <button
                        onClick={() => openReview(apt)}
                        className="text-xs font-bold px-3 py-1.5 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 text-white cursor-pointer hover:opacity-90 transition-opacity whitespace-nowrap"
                      >
                        כתבי ביקורת 💅
                      </button>
                    )}

                    {apt.status === 'COMPLETED' && apt.hasReview && (
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-green-50 text-green-600 border border-green-200 whitespace-nowrap">
                        ✓ ביקורת נשלחה
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {reviewModal && (
          <ReviewModal
            {...reviewModal}
            onClose={() => setReviewModal(null)}
            onSuccess={() => handleReviewSuccess(reviewModal.appointmentId)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

export default function MyAppointmentsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <MyAppointmentsInner />
    </Suspense>
  )
}
