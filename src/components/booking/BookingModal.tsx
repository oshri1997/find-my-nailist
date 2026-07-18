'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronRight, ChevronLeft, Loader2, CheckCircle2, Clock, Scissors, Calendar, MessageSquare, CalendarOff, Copy, Check, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { generateSlots, isSlotUnavailable, buildMonthCalendarFor, toDateStr, type BookedSlot } from '@/lib/booking-utils'
import { toBitUrl, formatBitPhoneDisplay } from '@/lib/bit'
import { getRecommendedSlots } from '@/lib/slot-recommendation'

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
  initialServiceId?: string
  // Only the phone number is needed here — the deposit *amount* comes back
  // from POST /api/appointments (server-computed at booking time), and
  // whether to show the public "נדרשת מקדמה" disclosure is decided entirely
  // in NailistProfileClient, before this modal ever opens.
  bitPhone?: string
}

interface DepositResult {
  appointmentId: string
  amount: number
  currency: string
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

// The API sometimes returns an English error string (or a zod issues array,
// not even a string) — never surface that raw to the Hebrew UI.
const KNOWN_ERROR_TRANSLATIONS: Record<string, string> = {
  'Service not found': 'השירות המבוקש לא נמצא או שהוסר',
  Forbidden: 'אין הרשאה לבצע פעולה זו',
  Unauthorized: 'יש להתחבר מחדש כדי להזמין תור',
  'Time slot not available': 'השעה הזו כבר תפוסה, אנא בחרי שעה אחרת',
}

export function translateBookingError(error: unknown): string {
  if (typeof error !== 'string') return 'שגיאה בהזמנה, נסי שוב'
  return KNOWN_ERROR_TRANSLATIONS[error] ?? error
}

export default function BookingModal({ nailistProfileId, businessName, services, onClose, initialServiceId, bitPhone }: Props) {
  const [step, setStep] = useState<Step>('service')
  const [depositResult, setDepositResult] = useState<DepositResult | null>(null)
  const [markingPaid, setMarkingPaid] = useState(false)
  const [paidMarked, setPaidMarked] = useState(false)
  const [copiedPhone, setCopiedPhone] = useState(false)
  const [copiedAmount, setCopiedAmount] = useState(false)
  const [selectedService, setSelectedService] = useState<Service | null>(
    initialServiceId ? (services.find(s => s.id === initialServiceId) ?? null) : null
  )
  const [serviceError, setServiceError] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedTime, setSelectedTime] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [availability, setAvailability] = useState<Availability | null>(null)
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [dateSummary, setDateSummary] = useState<Record<string, { workingDay: boolean; fullyBooked: boolean }> | null>(null)

  const now = new Date()
  now.setHours(0, 0, 0, 0)

  const [viewYear, setViewYear] = useState(now.getFullYear())
  const [viewMonth, setViewMonth] = useState(now.getMonth())

  const maxViewDate = new Date(now.getFullYear(), now.getMonth() + 6, 1)
  const isAtMin = viewYear === now.getFullYear() && viewMonth === now.getMonth()
  const isAtMax = viewYear === maxViewDate.getFullYear() && viewMonth === maxViewDate.getMonth()

  function prevMonth() {
    if (isAtMin) return
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11) }
    else setViewMonth(m => m - 1)
  }

  function nextMonth() {
    if (isAtMax) return
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0) }
    else setViewMonth(m => m + 1)
  }

  const monthDays = buildMonthCalendarFor(viewYear, viewMonth)

  useEffect(() => {
    if (!selectedService) return
    const from = toDateStr(new Date())
    fetch(
      `/api/nailists/${nailistProfileId}/availability/batch?from=${from}&days=180&durationMinutes=${selectedService.durationMinutes}`
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
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        setError(translateBookingError(body?.error))
        return
      }
      const { data } = await res.json()
      if (data?.depositRequired) {
        setDepositResult({ appointmentId: data.id, amount: data.depositAmount, currency: data.depositCurrency })
      }
      setStep('done')
    } catch {
      setError('שגיאה בהזמנה, נסי שוב')
    } finally {
      setLoading(false)
    }
  }

  async function handleMarkPaid() {
    if (!depositResult) return
    setMarkingPaid(true)
    try {
      const res = await fetch(`/api/appointments/${depositResult.appointmentId}/deposit`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'MARK_PAID' }),
      })
      if (res.ok) setPaidMarked(true)
    } finally {
      setMarkingPaid(false)
    }
  }

  async function handleCopyBitPhone() {
    if (!bitPhone) return
    await navigator.clipboard.writeText(bitPhone)
    setCopiedPhone(true)
    setTimeout(() => setCopiedPhone(false), 2000)
  }

  async function handleCopyAmount() {
    if (!depositResult) return
    await navigator.clipboard.writeText(String(depositResult.amount))
    setCopiedAmount(true)
    setTimeout(() => setCopiedAmount(false), 2000)
  }

  const dateStr = selectedDate ? toDateStr(selectedDate) : ''
  const todayStr = toDateStr(new Date())
  const slots =
    availability?.workingDay && availability.startTime && availability.endTime
      ? generateSlots(availability.startTime, availability.endTime).filter((t) => {
          if (!selectedDate || toDateStr(selectedDate) !== todayStr) return true
          const [h, m] = t.split(':').map(Number)
          const cur = new Date()
          return h > cur.getHours() || (h === cur.getHours() && m > cur.getMinutes())
        })
      : []

  // Which of today's bookable slots to nudge the client toward — the ones
  // that consolidate the nailist's schedule instead of fragmenting it. See
  // slot-recommendation.ts for why; computed only over slots that are
  // actually still bookable (unavailable ones are never "recommended").
  const minServiceDurationMinutes = services.length > 0 ? Math.min(...services.map((s) => s.durationMinutes)) : 0
  const recommendedSlots =
    availability?.workingDay && availability.startTime && availability.endTime && selectedService
      ? getRecommendedSlots({
          date: dateStr,
          shiftStartTime: availability.startTime,
          shiftEndTime: availability.endTime,
          bookedSlots: availability.bookedSlots,
          candidateSlots: slots.filter(
            (t) => !isSlotUnavailable(t, dateStr, selectedService.durationMinutes, availability.endTime!, availability.bookedSlots)
          ),
          serviceDurationMinutes: selectedService.durationMinutes,
          minServiceDurationMinutes,
        })
      : new Set<string>()

  function renderSlotButton(t: string) {
    const unavailable = isSlotUnavailable(
      t,
      dateStr,
      selectedService?.durationMinutes ?? 60,
      availability!.endTime!,
      availability!.bookedSlots
    )
    const isSelected = selectedTime === t
    const isRecommended = recommendedSlots.has(t)
    return (
      <button
        key={t}
        disabled={unavailable}
        onClick={() => !unavailable && setSelectedTime(t)}
        className={`py-2.5 rounded-xl text-sm font-bold transition-all ${
          isSelected
            ? 'bg-gradient-to-br from-primary to-primary/70 text-white shadow-sm shadow-primary/40'
            : unavailable
            ? 'bg-muted text-muted-foreground cursor-not-allowed line-through text-xs'
            : isRecommended
            ? 'bg-gradient-to-br from-primary/10 to-primary/5 dark:from-primary/40 dark:to-primary/20 text-primary dark:text-primary border-2 border-primary/40 dark:border-primary hover:border-primary'
            : 'bg-muted text-muted-foreground hover:bg-primary/10 dark:hover:bg-primary/30 hover:text-primary border border-border hover:border-primary/30'
        }`}
      >
        {t}
      </button>
    )
  }

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
        className="bg-card rounded-t-3xl sm:rounded-3xl shadow-2xl w-full max-w-md overflow-hidden max-h-[92vh] flex flex-col"
        dir="rtl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-border shrink-0">
          {step !== 'done' && step !== 'service' && (
            <button
              onClick={() => {
                if (step === 'datetime') setStep('service')
                else if (step === 'confirm') setStep('datetime')
              }}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted transition-colors"
            >
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </button>
          )}
          {(step === 'done' || step === 'service') && <div className="w-8" />}
          <div className="text-center">
            <h2 className="text-base font-black text-foreground">
              {step === 'service' && 'בחרי שירות'}
              {step === 'datetime' && 'בחרי תאריך ושעה'}
              {step === 'confirm' && 'אישור הזמנה'}
              {step === 'done' && 'הזמנה בוצעה!'}
            </h2>
            <p className="text-xs text-muted-foreground font-medium">{businessName}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted transition-colors">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        {/* Progress bar */}
        {step !== 'done' && (
          <div className="flex gap-1.5 px-6 py-3 shrink-0">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={`flex-1 h-1 rounded-full transition-all duration-300 ${
                  stepIndex >= i ? 'bg-gradient-to-r from-primary to-primary/70' : 'bg-muted'
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
                        onClick={() => { setSelectedService(s); setDateSummary(null); setServiceError(false) }}
                        className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 text-right transition-all ${
                          selected
                            ? 'border-primary bg-primary/10 shadow-sm'
                            : 'border-border hover:border-primary/30 bg-card'
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all ${
                          selected ? 'bg-gradient-to-br from-primary to-primary/70' : 'bg-muted'
                        }`}>
                          <Scissors className={`h-5 w-5 ${selected ? 'text-white' : 'text-muted-foreground'}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-black text-foreground text-sm">{s.name}</p>
                          {s.description && <p className="text-xs text-muted-foreground mt-0.5 truncate">{s.description}</p>}
                          <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                            <Clock className="h-3 w-3" /> {s.durationMinutes} דק׳
                          </p>
                        </div>
                        <div className={`font-black text-lg shrink-0 ${selected ? 'text-primary' : 'text-muted-foreground'}`}>
                          {symbol}{s.price}
                        </div>
                      </button>
                    )
                  })}
                </div>
                {serviceError && (
                  <p className="text-center text-sm text-red-500 font-semibold mt-4 mb-1">יש לבחור שירות כדי להמשיך</p>
                )}
                <Button
                  onClick={() => {
                    if (!selectedService) { setServiceError(true); return }
                    setServiceError(false)
                    setStep('datetime')
                  }}
                  className="w-full mt-4 bg-gradient-to-r from-primary to-primary/70 border-0 rounded-2xl h-12 font-black shadow-md shadow-primary/40"
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
                  <div className="mx-6 mb-4 mt-2 flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-xl px-3 py-2">
                    <Scissors className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span className="text-xs font-bold text-primary flex-1">{selectedService.name}</span>
                    <span className="text-xs font-black text-primary">₪{selectedService.price}</span>
                  </div>
                )}

                {/* Month calendar */}
                <div className="mb-1 px-6">
                  <p className="text-xs font-black text-muted-foreground flex items-center gap-1.5 mb-3">
                    <Calendar className="h-3.5 w-3.5" /> בחרי תאריך
                  </p>
                  <div className="flex items-center justify-between mb-2">
                    <button
                      onClick={prevMonth}
                      disabled={isAtMin}
                      className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-muted transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </button>
                    <p className="text-sm font-black text-foreground">
                      {HE_MONTHS[viewMonth]} {viewYear}
                    </p>
                    <button
                      onClick={nextMonth}
                      disabled={isAtMax}
                      className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-muted transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </div>
                  {/* Day-of-week headers */}
                  <div className="grid grid-cols-7 gap-1 mb-1">
                    {HE_DAYS_SHORT.map((d) => (
                      <div key={d} className="text-center text-[10px] font-bold text-muted-foreground py-0.5">{d}</div>
                    ))}
                  </div>
                  {/* Day cells */}
                  <div className="grid grid-cols-7 gap-1">
                    {monthDays.map((d, i) => {
                      if (!d) return <div key={`e-${i}`} />
                      const isPast = d < now
                      const isSelected = selectedDate !== null && toDateStr(selectedDate) === toDateStr(d)
                      const isToday = toDateStr(d) === toDateStr(now)
                      const dayIdx = d.getDay()
                      const isWeekend = dayIdx === 5 || dayIdx === 6
                      const summary = dateSummary?.[toDateStr(d)]
                      const isNonWorking = summary !== undefined && !summary.workingDay
                      const isFullyBooked = summary?.workingDay && summary.fullyBooked
                      const isDisabled = isPast || isNonWorking || (isToday && !!isFullyBooked)
                      return (
                        <button
                          key={toDateStr(d)}
                          data-testid="date-btn"
                          data-date={toDateStr(d)}
                          disabled={isDisabled}
                          onClick={() => {
                            setSelectedDate(d)
                            setSelectedTime('')
                            setLoadingSlots(true)
                            setAvailability(null)
                          }}
                          className={`flex flex-col items-center py-2 rounded-xl border-2 transition-all ${
                            isSelected
                              ? 'border-primary bg-gradient-to-b from-primary to-primary/70 text-white shadow-md shadow-primary/40'
                              : isDisabled
                              ? 'border-border bg-muted cursor-not-allowed opacity-35'
                              : isWeekend
                              ? 'border-primary/15 bg-primary/5 dark:bg-primary/10 text-foreground hover:border-primary/30'
                              : 'border-border bg-card text-foreground hover:border-primary/30'
                          }`}
                        >
                          <span className={`text-sm font-black leading-none ${isSelected ? 'text-white' : isDisabled ? 'text-muted-foreground' : ''}`}>
                            {d.getDate()}
                          </span>
                          {isNonWorking && !isSelected && !isPast && (
                            <span className="text-[7px] text-muted-foreground leading-none">✕</span>
                          )}
                          {isFullyBooked && !isNonWorking && !isSelected && !isPast && (
                            <div className="w-1 h-1 rounded-full bg-red-400 mt-0.5" />
                          )}
                          {isToday && !isNonWorking && !isFullyBooked && (
                            <div className={`w-1 h-1 rounded-full mt-0.5 ${isSelected ? 'bg-white/60' : 'bg-primary'}`} />
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Time slots */}
                {selectedDate && (
                  <div className="mt-4 px-6">
                    <p className="text-xs font-black text-muted-foreground flex items-center gap-1.5 mb-2">
                      <Clock className="h-3.5 w-3.5" /> בחרי שעה
                    </p>
                    {loadingSlots ? (
                      <div className="flex items-center gap-2 text-muted-foreground text-sm py-5 justify-center">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="font-medium">טוענת שעות פנויות...</span>
                      </div>
                    ) : !availability?.workingDay ? (
                      <div className="text-sm text-muted-foreground bg-muted rounded-2xl p-5 text-center">
                        <CalendarOff className="h-7 w-7 text-muted-foreground mx-auto mb-2" />
                        <p className="font-bold">יום זה אינו יום עבודה</p>
                        <p className="text-xs text-muted-foreground mt-1">אנא בחרי תאריך אחר</p>
                      </div>
                    ) : slots.length === 0 ? (
                      <div className="text-sm text-muted-foreground bg-muted rounded-2xl p-5 text-center font-medium">
                        אין שעות פנויות ביום זה
                      </div>
                    ) : (
                      <>
                        {recommendedSlots.size > 0 && (
                          <div className="mb-3">
                            <p className="text-xs font-black text-primary flex items-center gap-1.5 mb-2">
                              <Zap className="h-3.5 w-3.5 fill-primary text-primary" /> שעות מומלצות
                            </p>
                            <div className="grid grid-cols-4 gap-2">
                              {slots.filter((t) => recommendedSlots.has(t)).map(renderSlotButton)}
                            </div>
                          </div>
                        )}
                        {recommendedSlots.size > 0 && (
                          <p className="text-xs font-bold text-muted-foreground mb-2">אפשרויות נוספות</p>
                        )}
                        <div className="grid grid-cols-4 gap-2">
                          {slots.filter((t) => !recommendedSlots.has(t)).map(renderSlotButton)}
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Notes */}
                <div className="px-6 mt-4">
                  <p className="text-xs font-black text-muted-foreground flex items-center gap-1.5 mb-2">
                    <MessageSquare className="h-3.5 w-3.5" /> הערות (אופציונלי)
                  </p>
                  <textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="צבע נלו, עיצוב מסוים, מידע רלוונטי..."
                    rows={2}
                    className="w-full rounded-xl border border-border bg-muted px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary focus:bg-background transition-colors resize-none"
                  />
                </div>

                <div className="px-6 mt-4">
                  <Button
                    onClick={() => selectedDate && selectedTime && setStep('confirm')}
                    disabled={!selectedDate || !selectedTime}
                    className="w-full bg-gradient-to-r from-primary to-primary/70 border-0 rounded-2xl h-12 font-black shadow-md shadow-primary/40 disabled:opacity-50"
                  >
                    המשך לאישור
                  </Button>
                </div>
              </motion.div>
            )}

            {/* ── STEP 3: CONFIRM ── */}
            {step === 'confirm' && selectedService && selectedDate && (
              <motion.div key="confirm" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} className="px-6 pb-6 pt-2">
                <div className="bg-primary/10 rounded-2xl p-5 space-y-3.5 mb-4 border border-primary/20">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-card border border-primary/20 flex items-center justify-center shrink-0">
                      <Scissors className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground font-medium">שירות</p>
                      <p className="font-black text-foreground text-sm">{selectedService.name}</p>
                    </div>
                    <p className="font-black text-primary">{selectedService.currency === 'ILS' ? '₪' : '$'}{selectedService.price}</p>
                  </div>

                  <div className="h-px bg-primary/15" />

                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-card border border-primary/20 flex items-center justify-center shrink-0">
                      <Calendar className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground font-medium">תאריך</p>
                      <p className="font-black text-foreground text-sm">
                        {selectedDate.toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-card border border-primary/20 flex items-center justify-center shrink-0">
                      <Clock className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground font-medium">שעה ומשך</p>
                      <p className="font-black text-foreground text-sm">
                        {selectedTime} · {selectedService.durationMinutes} דק׳
                      </p>
                    </div>
                  </div>

                  {notes && (
                    <>
                      <div className="h-px bg-primary/15" />
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-xl bg-card border border-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                          <MessageSquare className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground font-medium">הערות</p>
                          <p className="font-medium text-muted-foreground text-sm">{notes}</p>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {error && (
                  <div className="text-sm text-red-500 font-semibold mb-3 bg-red-50 dark:bg-red-950/30 rounded-xl px-4 py-3 text-center">
                    {error}
                  </div>
                )}

                <Button
                  onClick={handleConfirm}
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-primary to-primary/70 border-0 rounded-2xl h-12 font-black shadow-md shadow-primary/40"
                >
                  {loading ? <><Loader2 className="h-4 w-4 animate-spin ml-2" /> מזמינה...</> : 'אישור וקביעת תור'}
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
                  className="w-20 h-20 bg-gradient-to-br from-primary to-primary/70 rounded-full flex items-center justify-center mx-auto mb-5 shadow-xl shadow-primary/40"
                >
                  <CheckCircle2 className="h-10 w-10 text-white" />
                </motion.div>
                <h3 className="text-2xl font-black text-foreground mb-2">התור נקבע!</h3>
                <p className="text-sm text-muted-foreground font-medium mb-1">
                  {selectedDate?.toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' })}
                </p>
                <p className="text-sm text-primary font-black mb-6">{selectedTime} · {selectedService?.name}</p>
                <p className="text-xs text-muted-foreground mb-6">אישור ישלח למייל שלך בקרוב</p>

                {depositResult && bitPhone && (
                  <div className="bg-primary/10 border border-primary/20 rounded-2xl p-5 mb-6 text-right">
                    <p className="font-black text-foreground text-sm mb-1">
                      נדרשת מקדמה של ₪{depositResult.amount} דרך Bit
                    </p>
                    <p className="text-xs text-muted-foreground mb-3">
                      לחצי לפתיחת Bit, והדביקי בתוכה את המספר והסכום שהעתקת כאן. בסיום לחצי על &quot;כבר שילמתי&quot;
                    </p>
                    <div className="flex items-center gap-2 mb-3">
                      <a
                        href={toBitUrl(bitPhone, depositResult.amount)}
                        className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-primary to-primary/70 text-white rounded-xl h-11 font-bold text-sm"
                      >
                        פתחי את Bit
                      </a>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={handleCopyBitPhone}
                        aria-label="העתקת מספר טלפון לביט"
                        className="flex items-center justify-center gap-2 bg-card border border-border rounded-xl h-11 font-bold text-sm text-foreground hover:border-primary/40 transition-colors"
                      >
                        {copiedPhone ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4 text-muted-foreground" />}
                        {formatBitPhoneDisplay(bitPhone)}
                      </button>
                      <button
                        type="button"
                        onClick={handleCopyAmount}
                        aria-label="העתקת סכום המקדמה"
                        className="flex items-center justify-center gap-2 bg-card border border-border rounded-xl h-11 font-bold text-sm text-foreground hover:border-primary/40 transition-colors"
                      >
                        {copiedAmount ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4 text-muted-foreground" />}
                        ₪{depositResult.amount}
                      </button>
                    </div>

                    {paidMarked ? (
                      <p className="mt-3 flex items-center justify-center gap-1.5 text-sm font-bold text-green-600">
                        <CheckCircle2 className="h-4 w-4" />
                        סימנת ששילמת
                      </p>
                    ) : (
                      <Button
                        onClick={handleMarkPaid}
                        disabled={markingPaid}
                        className="w-full mt-3 bg-card border border-primary/30 text-primary hover:bg-primary/10 rounded-xl h-11 font-bold text-sm"
                      >
                        {markingPaid ? <Loader2 className="h-4 w-4 animate-spin" /> : 'כבר שילמתי'}
                      </Button>
                    )}
                  </div>
                )}

                <Button onClick={onClose} className="w-full bg-gradient-to-r from-primary to-primary/70 border-0 rounded-2xl h-12 font-black">
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
