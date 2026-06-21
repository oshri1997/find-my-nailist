'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronRight, Loader2, CheckCircle2, Clock, Scissors, Calendar, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { generateSlots, isSlotUnavailable, buildDateStrip, toDateStr, type BookedSlot } from '@/lib/booking-utils'

interface Service {
  id: string
  name: string
  durationMinutes: number
  price: number
  currency: string
  description?: string
}

interface Props {
  nailistProfileId: string
  businessName: string
  services: Service[]
  onClose: () => void
}

interface Availability {
  workingDay: boolean
  startTime?: string
  endTime?: string
  bookedSlots: BookedSlot[]
}

type Step = 'service' | 'datetime' | 'confirm' | 'done'

const HE_DAYS_SHORT = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳']
const HE_MONTHS = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר']

export default function BookingModal({ nailistProfileId, businessName, services, onClose }: Props) {
  const [step, setStep] = useState<Step>('service')
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedTime, setSelectedTime] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [availability, setAvailability] = useState<Availability | null>(null)
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [dateSummary, setDateSummary] = useState<Record<string, { workingDay: boolean; fullyBooked: boolean }> | null>(null)

  const stripRef = useRef<HTMLDivElement>(null)
  const dateStrip = buildDateStrip(21)

  useEffect(() => {
    if (!selectedService) return
    const from = toDateStr(new Date())
    fetch(
      `/api/nailists/${nailistProfileId}/availability/batch?from=${from}&days=21&durationMinutes=${selectedService.durationMinutes}`
    )
      .then((r) => r.json())
      .then(({ data }) => setDateSummary(data ?? null))
      .catch(() => setDateSummary(null))
  }, [selectedService, nailistProfileId])

  useEffect(() => {
    if (!selectedDate) return
    const dateStr = toDateStr(selectedDate)
    let cancelled = false
    fetch(`/api/nailists/${nailistProfileId}/availability?date=${dateStr}`)
      .then((r) => r.json())
      .then(({ data }) => { if (!cancelled) setAvailability(data ?? null) })
      .catch(() => { if (!cancelled) setAvailability(null) })
      .finally(() => { if (!cancelled) setLoadingSlots(false) })
    return () => { cancelled = true }
  }, [selectedDate, nailistProfileId])

  async function handleConfirm() {
    if (!selectedService || !selectedDate || !selectedTime) return
    setLoading(true)
    setError('')
    try {
      const meRes = await fetch('/api/me/client-profile')
      if (!meRes.ok) {
        setError('יש להתחבר לחשבון כדי להזמין תור')
        return
      }
      const { data: clientProfile } = await meRes.json()
      const dateStr = toDateStr(selectedDate)
      const startTime = new Date(`${dateStr}T${selectedTime}:00`)
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nailistProfileId,
          clientProfileId: clientProfile.id,
          serviceId: selectedService.id,
          startTime: startTime.toISOString(),
          notes: notes || undefined,
        }),
      })
      if (res.status === 409) { setError('השעה הזו כבר תפוסה, אנא בחרי שעה אחרת'); return }
      if (!res.ok) { const body = await res.json(); setError(body.error ?? 'שגיאה בהזמנה'); return }
      setStep('done')
    } catch {
      setError('שגיאה בהזמנה, נסי שוב')
    } finally {
      setLoading(false)
    }
  }

  const dateStr = selectedDate ? toDateStr(selectedDate) : ''
  const slots =
    availability?.workingDay && availability.startTime && availability.endTime
      ? generateSlots(availability.startTime, availability.endTime)
      : []

  const stepIndex = ['service', 'datetime', 'confirm'].indexOf(step)

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full max-w-md overflow-hidden max-h-[92vh] flex flex-col"
        dir="rtl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100 shrink-0">
          {step !== 'done' && step !== 'service' && (
            <button
              onClick={() => {
                if (step === 'datetime') setStep('service')
                else if (step === 'confirm') setStep('datetime')
              }}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
            >
              <ChevronRight className="h-5 w-5 text-gray-400" />
            </button>
          )}
          {(step === 'done' || step === 'service') && <div className="w-8" />}
          <div className="text-center">
            <h2 className="text-base font-black text-gray-800">
              {step === 'service' && 'בחרי שירות'}
              {step === 'datetime' && 'בחרי תאריך ושעה'}
              {step === 'confirm' && 'אישור הזמנה'}
              {step === 'done' && 'הזמנה בוצעה!'}
            </h2>
            <p className="text-xs text-gray-400 font-medium">{businessName}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors">
            <X className="h-4 w-4 text-gray-400" />
          </button>
        </div>

        {/* Progress bar */}
        {step !== 'done' && (
          <div className="flex gap-1.5 px-6 py-3 shrink-0">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={`flex-1 h-1 rounded-full transition-all duration-300 ${
                  stepIndex >= i ? 'bg-gradient-to-r from-pink-500 to-purple-600' : 'bg-gray-100'
                }`}
              />
            ))}
          </div>
        )}

        {/* Content (scrollable) */}
        <div className="overflow-y-auto flex-1">
          <AnimatePresence mode="wait">
            {/* ── STEP 1: SERVICE ── */}
            {step === 'service' && (
              <motion.div key="service" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} className="px-6 pb-6 pt-2">
                <div className="space-y-2.5">
                  {services.map((s) => {
                    const selected = selectedService?.id === s.id
                    const symbol = s.currency === 'ILS' ? '₪' : '$'
                    return (
                      <button
                        key={s.id}
                        onClick={() => { setSelectedService(s); setDateSummary(null) }}
                        className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 text-right transition-all ${
                          selected
                            ? 'border-pink-400 bg-gradient-to-r from-pink-50 to-purple-50 shadow-sm'
                            : 'border-gray-100 hover:border-pink-200 bg-white'
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all ${
                          selected ? 'bg-gradient-to-br from-pink-500 to-purple-600' : 'bg-gray-100'
                        }`}>
                          <Scissors className={`h-5 w-5 ${selected ? 'text-white' : 'text-gray-400'}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-black text-gray-800 text-sm">{s.name}</p>
                          {s.description && <p className="text-xs text-gray-400 mt-0.5 truncate">{s.description}</p>}
                          <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                            <Clock className="h-3 w-3" /> {s.durationMinutes} דק׳
                          </p>
                        </div>
                        <div className={`font-black text-lg shrink-0 ${selected ? 'text-pink-600' : 'text-gray-600'}`}>
                          {symbol}{s.price}
                        </div>
                      </button>
                    )
                  })}
                </div>
                <Button
                  onClick={() => selectedService && setStep('datetime')}
                  disabled={!selectedService}
                  className="w-full mt-5 bg-gradient-to-r from-pink-500 to-purple-600 border-0 rounded-2xl h-12 font-black shadow-md shadow-pink-200 disabled:opacity-50"
                >
                  המשך לבחירת תאריך
                </Button>
              </motion.div>
            )}

            {/* ── STEP 2: DATE & TIME ── */}
            {step === 'datetime' && (
              <motion.div key="datetime" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} className="pb-6">
                {/* Service summary pill */}
                {selectedService && (
                  <div className="mx-6 mb-4 mt-2 flex items-center gap-2 bg-pink-50 border border-pink-100 rounded-xl px-3 py-2">
                    <Scissors className="h-3.5 w-3.5 text-pink-500 shrink-0" />
                    <span className="text-xs font-bold text-pink-700 flex-1">{selectedService.name}</span>
                    <span className="text-xs font-black text-pink-600">₪{selectedService.price}</span>
                  </div>
                )}

                {/* Date strip */}
                <div className="mb-1 px-6">
                  <p className="text-xs font-black text-gray-500 flex items-center gap-1.5 mb-2">
                    <Calendar className="h-3.5 w-3.5" /> בחרי תאריך
                  </p>
                </div>
                <div ref={stripRef} className="flex gap-2 overflow-x-auto pb-2 px-6 snap-x snap-mandatory scrollbar-hide" style={{ scrollbarWidth: 'none' }}>
                  {dateStrip.map((d) => {
                    const isSelected = selectedDate && toDateStr(selectedDate) === toDateStr(d)
                    const isToday = toDateStr(d) === toDateStr(new Date())
                    const dayIdx = d.getDay()
                    const isWeekend = dayIdx === 5 || dayIdx === 6
                    const summary = dateSummary?.[toDateStr(d)]
                    const isNonWorking = summary !== undefined && !summary.workingDay
                    const isFullyBooked = summary?.workingDay && summary.fullyBooked
                    return (
                      <button
                        key={toDateStr(d)}
                        disabled={isNonWorking}
                        onClick={() => {
                          setSelectedDate(d)
                          setSelectedTime('')
                          setLoadingSlots(true)
                          setAvailability(null)
                        }}
                        className={`shrink-0 w-14 flex flex-col items-center py-2.5 rounded-2xl border-2 transition-all snap-start ${
                          isSelected
                            ? 'border-pink-500 bg-gradient-to-b from-pink-500 to-purple-600 text-white shadow-md shadow-pink-200'
                            : isNonWorking
                            ? 'border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed opacity-50'
                            : isWeekend
                            ? 'border-amber-100 bg-amber-50 text-amber-800 hover:border-amber-300'
                            : 'border-gray-100 bg-white text-gray-700 hover:border-pink-200'
                        }`}
                      >
                        <span className={`text-[10px] font-bold mb-0.5 ${isSelected ? 'text-white/80' : isNonWorking ? 'text-gray-300' : isWeekend ? 'text-amber-500' : 'text-gray-400'}`}>
                          {HE_DAYS_SHORT[dayIdx]}
                        </span>
                        <span className={`text-lg font-black leading-none ${isSelected ? 'text-white' : ''}`}>
                          {d.getDate()}
                        </span>
                        <span className={`text-[10px] font-medium mt-0.5 ${isSelected ? 'text-white/70' : 'text-gray-400'}`}>
                          {HE_MONTHS[d.getMonth()].slice(0, 3)}
                        </span>
                        {isNonWorking && !isSelected && (
                          <span className="text-[8px] text-gray-300 mt-0.5 leading-none">✕</span>
                        )}
                        {isFullyBooked && !isNonWorking && !isSelected && (
                          <div className="w-1.5 h-1.5 rounded-full bg-red-400 mt-0.5" />
                        )}
                        {isToday && !isNonWorking && !isFullyBooked && (
                          <div className={`w-1 h-1 rounded-full mt-1 ${isSelected ? 'bg-white/60' : 'bg-pink-400'}`} />
                        )}
                      </button>
                    )
                  })}
                </div>

                {/* Time slots */}
                {selectedDate && (
                  <div className="mt-4 px-6">
                    <p className="text-xs font-black text-gray-500 flex items-center gap-1.5 mb-2">
                      <Clock className="h-3.5 w-3.5" /> בחרי שעה
                    </p>
                    {loadingSlots ? (
                      <div className="flex items-center gap-2 text-gray-400 text-sm py-5 justify-center">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="font-medium">טוענת שעות פנויות...</span>
                      </div>
                    ) : !availability?.workingDay ? (
                      <div className="text-sm text-gray-500 bg-gray-50 rounded-2xl p-5 text-center">
                        <div className="text-2xl mb-2">😴</div>
                        <p className="font-bold">יום זה אינו יום עבודה</p>
                        <p className="text-xs text-gray-400 mt-1">אנא בחרי תאריך אחר</p>
                      </div>
                    ) : slots.length === 0 ? (
                      <div className="text-sm text-gray-500 bg-gray-50 rounded-2xl p-5 text-center font-medium">
                        אין שעות פנויות ביום זה
                      </div>
                    ) : (
                      <div className="grid grid-cols-4 gap-2">
                        {slots.map((t) => {
                          const unavailable = isSlotUnavailable(
                            t,
                            dateStr,
                            selectedService?.durationMinutes ?? 60,
                            availability.endTime!,
                            availability.bookedSlots
                          )
                          const isSelected = selectedTime === t
                          return (
                            <button
                              key={t}
                              disabled={unavailable}
                              onClick={() => !unavailable && setSelectedTime(t)}
                              className={`py-2.5 rounded-xl text-sm font-bold transition-all ${
                                isSelected
                                  ? 'bg-gradient-to-br from-pink-500 to-purple-600 text-white shadow-sm shadow-pink-200'
                                  : unavailable
                                  ? 'bg-gray-100 text-gray-300 cursor-not-allowed line-through text-xs'
                                  : 'bg-gray-50 text-gray-600 hover:bg-pink-50 hover:text-pink-600 border border-gray-100 hover:border-pink-200'
                              }`}
                            >
                              {t}
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Notes */}
                <div className="px-6 mt-4">
                  <p className="text-xs font-black text-gray-500 flex items-center gap-1.5 mb-2">
                    <MessageSquare className="h-3.5 w-3.5" /> הערות (אופציונלי)
                  </p>
                  <textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="צבע נלו, עיצוב מסוים, מידע רלוונטי..."
                    rows={2}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-700 placeholder:text-gray-300 focus:outline-none focus:border-pink-300 focus:bg-white transition-colors resize-none"
                  />
                </div>

                <div className="px-6 mt-4">
                  <Button
                    onClick={() => selectedDate && selectedTime && setStep('confirm')}
                    disabled={!selectedDate || !selectedTime}
                    className="w-full bg-gradient-to-r from-pink-500 to-purple-600 border-0 rounded-2xl h-12 font-black shadow-md shadow-pink-200 disabled:opacity-50"
                  >
                    המשך לאישור
                  </Button>
                </div>
              </motion.div>
            )}

            {/* ── STEP 3: CONFIRM ── */}
            {step === 'confirm' && selectedService && selectedDate && (
              <motion.div key="confirm" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} className="px-6 pb-6 pt-2">
                <div className="bg-gradient-to-br from-pink-50 to-purple-50 rounded-2xl p-5 space-y-3.5 mb-4 border border-pink-100">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-white border border-pink-100 flex items-center justify-center shrink-0">
                      <Scissors className="h-4 w-4 text-pink-500" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-gray-400 font-medium">שירות</p>
                      <p className="font-black text-gray-800 text-sm">{selectedService.name}</p>
                    </div>
                    <p className="font-black text-pink-600">{selectedService.currency === 'ILS' ? '₪' : '$'}{selectedService.price}</p>
                  </div>

                  <div className="h-px bg-pink-100" />

                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-white border border-pink-100 flex items-center justify-center shrink-0">
                      <Calendar className="h-4 w-4 text-pink-500" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 font-medium">תאריך</p>
                      <p className="font-black text-gray-800 text-sm">
                        {selectedDate.toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-white border border-pink-100 flex items-center justify-center shrink-0">
                      <Clock className="h-4 w-4 text-pink-500" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 font-medium">שעה ומשך</p>
                      <p className="font-black text-gray-800 text-sm">
                        {selectedTime} · {selectedService.durationMinutes} דק׳
                      </p>
                    </div>
                  </div>

                  {notes && (
                    <>
                      <div className="h-px bg-pink-100" />
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-xl bg-white border border-pink-100 flex items-center justify-center shrink-0 mt-0.5">
                          <MessageSquare className="h-4 w-4 text-pink-500" />
                        </div>
                        <div>
                          <p className="text-xs text-gray-400 font-medium">הערות</p>
                          <p className="font-medium text-gray-700 text-sm">{notes}</p>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {error && (
                  <div className="text-sm text-red-500 font-semibold mb-3 bg-red-50 rounded-xl px-4 py-3 text-center">
                    {error}
                  </div>
                )}

                <Button
                  onClick={handleConfirm}
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-pink-500 to-purple-600 border-0 rounded-2xl h-12 font-black shadow-md shadow-pink-200"
                >
                  {loading ? <><Loader2 className="h-4 w-4 animate-spin ml-2" /> מזמינה...</> : 'אישור וקביעת תור 💅'}
                </Button>
              </motion.div>
            )}

            {/* ── STEP 4: DONE ── */}
            {step === 'done' && (
              <motion.div key="done" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="px-6 pb-8 pt-4 text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.1 }}
                  className="w-20 h-20 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-5 shadow-xl shadow-pink-200"
                >
                  <CheckCircle2 className="h-10 w-10 text-white" />
                </motion.div>
                <h3 className="text-2xl font-black text-gray-800 mb-2">התור נקבע! 🎉</h3>
                <p className="text-sm text-gray-400 font-medium mb-1">
                  {selectedDate?.toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' })}
                </p>
                <p className="text-sm text-pink-500 font-black mb-6">{selectedTime} · {selectedService?.name}</p>
                <p className="text-xs text-gray-400 mb-6">אישור ישלח למייל שלך בקרוב</p>
                <Button onClick={onClose} className="w-full bg-gradient-to-r from-pink-500 to-purple-600 border-0 rounded-2xl h-12 font-black">
                  סגור
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  )
}
