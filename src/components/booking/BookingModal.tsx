'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronRight, ChevronLeft, Loader2, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

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

type Step = 'service' | 'datetime' | 'confirm' | 'done'

function pad(n: number) {
  return String(n).padStart(2, '0')
}

function timeSlots(): string[] {
  const slots: string[] = []
  for (let h = 8; h < 20; h++) {
    slots.push(`${pad(h)}:00`)
    slots.push(`${pad(h)}:30`)
  }
  return slots
}

export default function BookingModal({ nailistProfileId, businessName, services, onClose }: Props) {
  const [step, setStep] = useState<Step>('service')
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTime, setSelectedTime] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [appointmentId, setAppointmentId] = useState('')

  async function handleConfirm() {
    if (!selectedService || !selectedDate || !selectedTime) return
    setLoading(true)
    setError('')
    try {
      // Get current user's client profile
      const meRes = await fetch('/api/me/client-profile')
      if (!meRes.ok) {
        setError('יש להתחבר לחשבון כדי להזמין תור')
        return
      }
      const { data: clientProfile } = await meRes.json()

      const startTime = new Date(`${selectedDate}T${selectedTime}:00`)
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

      if (res.status === 409) {
        setError('השעה הזו כבר תפוסה, אנא בחרי שעה אחרת')
        return
      }
      if (!res.ok) {
        const body = await res.json()
        setError(body.error ?? 'שגיאה בהזמנה')
        return
      }
      const { data } = await res.json()
      setAppointmentId(data.id)
      setStep('done')
    } catch {
      setError('שגיאה בהזמנה, נסי שוב')
    } finally {
      setLoading(false)
    }
  }

  const symbol = selectedService?.currency === 'ILS' ? '₪' : '$'
  const minDate = new Date().toISOString().split('T')[0]

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
        dir="rtl"
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-black text-gray-800">הזמנת תור</h2>
            <p className="text-sm text-gray-400 font-medium">{businessName}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors">
            <X className="h-4 w-4 text-gray-400" />
          </button>
        </div>

        {step !== 'done' && (
          <div className="flex gap-1 px-6 pt-4">
            {(['service', 'datetime', 'confirm'] as Step[]).map((s, i) => (
              <div
                key={s}
                className={`flex-1 h-1 rounded-full transition-colors ${
                  ['service', 'datetime', 'confirm'].indexOf(step) >= i
                    ? 'bg-gradient-to-r from-pink-500 to-purple-600'
                    : 'bg-gray-100'
                }`}
              />
            ))}
          </div>
        )}

        <div className="p-6">
          <AnimatePresence mode="wait">
            {step === 'service' && (
              <motion.div key="service" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <p className="font-bold text-gray-700 mb-4">בחרי שירות</p>
                <div className="space-y-3">
                  {services.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setSelectedService(s)}
                      className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 text-right transition-all ${
                        selectedService?.id === s.id
                          ? 'border-pink-400 bg-pink-50'
                          : 'border-gray-100 hover:border-pink-200'
                      }`}
                    >
                      <div>
                        <div className="font-bold text-gray-800">{s.name}</div>
                        {s.description && <div className="text-xs text-gray-400 mt-0.5">{s.description}</div>}
                        <div className="text-xs text-gray-400 mt-1">{s.durationMinutes} {"דק'"}</div>
                      </div>
                      <div className="font-black text-pink-600 shrink-0 mr-4">
                        {s.currency === 'ILS' ? '₪' : '$'}{s.price}
                      </div>
                    </button>
                  ))}
                </div>
                <Button
                  onClick={() => selectedService && setStep('datetime')}
                  disabled={!selectedService}
                  className="w-full mt-5 bg-gradient-to-r from-pink-500 to-purple-600 border-0 rounded-2xl font-bold shadow-md shadow-pink-200"
                >
                  המשך
                  <ChevronLeft className="h-4 w-4 mr-2" />
                </Button>
              </motion.div>
            )}

            {step === 'datetime' && (
              <motion.div key="datetime" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <p className="font-bold text-gray-700 mb-4">בחרי תאריך ושעה</p>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="booking-date" className="text-sm font-bold text-gray-600 block mb-1.5">תאריך</label>
                    <Input
                      id="booking-date"
                      type="date"
                      value={selectedDate}
                      min={minDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="rounded-xl border-gray-200 h-11"
                    />
                  </div>
                  {selectedDate && (
                    <div>
                      <label className="text-sm font-bold text-gray-600 block mb-1.5">שעה</label>
                      <div className="grid grid-cols-4 gap-2 max-h-44 overflow-y-auto">
                        {timeSlots().map((t) => (
                          <button
                            key={t}
                            onClick={() => setSelectedTime(t)}
                            className={`py-2 rounded-xl text-sm font-bold transition-all ${
                              selectedTime === t
                                ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-sm'
                                : 'bg-gray-50 text-gray-600 hover:bg-pink-50 hover:text-pink-600'
                            }`}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <div>
                    <label className="text-sm font-bold text-gray-600 block mb-1.5">הערות (אופציונלי)</label>
                    <Input
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="הערות לנייליסטית..."
                      className="rounded-xl border-gray-200 h-11"
                    />
                  </div>
                </div>
                <div className="flex gap-2 mt-5">
                  <Button variant="outline" onClick={() => setStep('service')} className="rounded-2xl border-gray-200">
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button
                    onClick={() => selectedDate && selectedTime && setStep('confirm')}
                    disabled={!selectedDate || !selectedTime}
                    className="flex-1 bg-gradient-to-r from-pink-500 to-purple-600 border-0 rounded-2xl font-bold shadow-md shadow-pink-200"
                  >
                    המשך
                    <ChevronLeft className="h-4 w-4 mr-2" />
                  </Button>
                </div>
              </motion.div>
            )}

            {step === 'confirm' && selectedService && (
              <motion.div key="confirm" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <p className="font-bold text-gray-700 mb-4">אישור הזמנה</p>
                <div className="bg-gradient-to-br from-pink-50 to-purple-50 rounded-2xl p-5 space-y-3 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">שירות</span>
                    <span className="font-bold text-gray-800">{selectedService.name}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">תאריך</span>
                    <span className="font-bold text-gray-800">
                      {new Date(selectedDate).toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">שעה</span>
                    <span className="font-bold text-gray-800">{selectedTime}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">משך</span>
                    <span className="font-bold text-gray-800">{selectedService.durationMinutes} {"דק'"}</span>
                  </div>
                  <div className="border-t border-pink-100 pt-3 flex justify-between">
                    <span className="font-bold text-gray-700">מחיר</span>
                    <span className="font-black text-pink-600 text-lg">{symbol}{selectedService.price}</span>
                  </div>
                </div>
                {error && <p className="text-sm text-red-500 font-medium mb-3 text-center">{error}</p>}
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setStep('datetime')} disabled={loading} className="rounded-2xl border-gray-200">
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button
                    onClick={handleConfirm}
                    disabled={loading}
                    className="flex-1 bg-gradient-to-r from-pink-500 to-purple-600 border-0 rounded-2xl font-bold shadow-md shadow-pink-200"
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'אישור הזמנה'}
                  </Button>
                </div>
              </motion.div>
            )}

            {step === 'done' && (
              <motion.div key="done" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-4">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
                  className="w-16 h-16 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4"
                >
                  <CheckCircle2 className="h-8 w-8 text-white" />
                </motion.div>
                <h3 className="text-xl font-black text-gray-800 mb-2">התור נקבע!</h3>
                <p className="text-sm text-gray-400 font-medium mb-6">ישלח אישור למייל שלך בקרוב</p>
                <Button onClick={onClose} className="w-full bg-gradient-to-r from-pink-500 to-purple-600 border-0 rounded-2xl font-bold">
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
