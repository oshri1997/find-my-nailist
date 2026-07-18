'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Star, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ReviewModalProps {
  appointmentId: string
  nailistProfileId: string
  clientProfileId: string
  businessName: string
  serviceName: string
  onClose: () => void
  onSuccess?: () => void
}

type Step = 'rating' | 'comment' | 'done'

// The API sometimes returns an English error string (or a zod issues array,
// not even a string) — never surface that raw to the Hebrew UI.
const KNOWN_ERROR_TRANSLATIONS: Record<string, string> = {
  Unauthorized: 'יש להתחבר מחדש כדי לשלוח ביקורת',
  Forbidden: 'אין הרשאה לבצע פעולה זו',
  'Invalid or incomplete appointment': 'לא ניתן לשלוח ביקורת עבור תור זה',
  'Review already submitted for this appointment': 'כבר שלחת ביקורת לתור הזה',
}

export function translateReviewError(error: unknown): string {
  if (typeof error !== 'string') return 'שגיאה בשליחת הביקורת'
  return KNOWN_ERROR_TRANSLATIONS[error] ?? error
}

export default function ReviewModal({
  appointmentId,
  nailistProfileId,
  clientProfileId,
  businessName,
  serviceName,
  onClose,
  onSuccess,
}: ReviewModalProps) {
  const [step, setStep] = useState<Step>('rating')
  const [rating, setRating] = useState(0)
  const [hovered, setHovered] = useState(0)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const displayRating = hovered || rating

  async function submit(skipComment = false) {
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointmentId,
          nailistProfileId,
          clientProfileId,
          rating,
          comment: skipComment ? undefined : comment || undefined,
        }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        setError(translateReviewError((json as { error?: unknown }).error))
        return
      }
      setStep('done')
      onSuccess?.()
    } catch {
      setError('שגיאת רשת, נסי שוב')
    } finally {
      setSubmitting(false)
    }
  }

  const stepTitles: Record<Step, string> = {
    rating: 'כמה כוכבים?',
    comment: 'ספרי לנו עוד',
    done: 'הביקורת נשלחה!',
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        className="relative bg-card rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
        dir="rtl"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-500 to-amber-500 px-6 py-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/80 text-sm">{businessName}</p>
              <h2 className="text-white font-bold text-lg">{stepTitles[step]}</h2>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white transition-colors cursor-pointer"
              aria-label="סגור"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {step === 'rating' && (
            <motion.div
              key="rating"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="p-6 space-y-6"
            >
              <p className="text-center text-muted-foreground text-sm">
                <span className="font-semibold text-foreground">{serviceName}</span>
              </p>

              <div
                className="flex justify-center gap-3"
                onMouseLeave={() => setHovered(0)}
              >
                {[1, 2, 3, 4, 5].map((n) => (
                  <motion.button
                    key={n}
                    whileHover={{ scale: 1.2 }}
                    whileTap={{ scale: 0.9 }}
                    animate={{ scale: rating === n ? [1, 1.3, 1] : 1 }}
                    transition={{ duration: 0.25 }}
                    onMouseEnter={() => setHovered(n)}
                    onClick={() => setRating(n)}
                    className="cursor-pointer focus:outline-none"
                    aria-label={`${n} כוכבים`}
                  >
                    <Star
                      className="h-10 w-10 transition-colors duration-150"
                      fill={n <= displayRating ? '#f59e0b' : 'none'}
                      stroke={n <= displayRating ? '#f59e0b' : '#d1d5db'}
                    />
                  </motion.button>
                ))}
              </div>

              {error && <p className="text-center text-destructive text-sm">{error}</p>}

              <Button
                className="w-full bg-primary hover:bg-primary/90 text-white rounded-xl font-bold cursor-pointer"
                disabled={rating === 0}
                onClick={() => setStep('comment')}
              >
                המשך
              </Button>
            </motion.div>
          )}

          {step === 'comment' && (
            <motion.div
              key="comment"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="p-6 space-y-4"
            >
              <div className="flex justify-center gap-1 mb-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <Star
                    key={n}
                    className="h-5 w-5"
                    fill={n <= rating ? '#f59e0b' : 'none'}
                    stroke={n <= rating ? '#f59e0b' : '#d1d5db'}
                  />
                ))}
              </div>

              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="שתפי את החוויה שלך (לא חובה)..."
                rows={4}
                className="w-full border border-border rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 bg-muted text-foreground placeholder:text-muted-foreground/60"
              />

              {error && <p className="text-destructive text-sm text-center">{error}</p>}

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1 rounded-xl font-semibold cursor-pointer"
                  disabled={submitting}
                  onClick={() => submit(true)}
                >
                  דלגי
                </Button>
                <Button
                  className="flex-1 bg-primary hover:bg-primary/90 text-white rounded-xl font-bold cursor-pointer"
                  disabled={submitting}
                  onClick={() => submit(false)}
                >
                  {submitting ? 'שולח...' : 'שלחי'}
                </Button>
              </div>
            </motion.div>
          )}

          {step === 'done' && (
            <motion.div
              key="done"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-8 flex flex-col items-center gap-4 text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              >
                <CheckCircle2 className="h-16 w-16 text-green-500" />
              </motion.div>
              <h3 className="text-xl font-bold text-foreground">הביקורת נשלחה!</h3>
              <p className="text-muted-foreground text-sm">
                הביקורת שלך עוזרת ל<strong>{businessName}</strong> לצמוח
              </p>
              <Button
                className="mt-2 bg-primary hover:bg-primary/90 text-white rounded-xl font-bold px-8 cursor-pointer"
                onClick={onClose}
              >
                סגור
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}
