'use client'

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'
import { Link2, Clock, AlertCircle, CheckCircle2, CalendarCheck } from 'lucide-react'

function Content() {
  const params = useSearchParams()
  const error = params.get('error')
  const already = params.get('already')
  const status = params.get('status')
  const emailError = params.get('emailError')

  if (error === 'invalid') {
    return (
      <div className="text-center">
        <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
          <Link2 className="h-7 w-7 text-muted-foreground" />
        </div>
        <h1 className="text-2xl font-black text-foreground mb-2">קישור לא תקין</h1>
        <p className="text-muted-foreground font-medium">הקישור אינו תקין. ייתכן שהתור כבר אושר או בוטל.</p>
      </div>
    )
  }

  if (error === 'expired') {
    return (
      <div className="text-center">
        <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
          <Clock className="h-7 w-7 text-muted-foreground" />
        </div>
        <h1 className="text-2xl font-black text-foreground mb-2">הקישור פג תוקף</h1>
        <p className="text-muted-foreground font-medium">הקישור לאישור פג תוקף (תקף 7 ימים). אנא בקשי מהלקוחה לקבוע תור חדש.</p>
      </div>
    )
  }

  if (error === 'server') {
    return (
      <div className="text-center">
        <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="h-7 w-7 text-muted-foreground" />
        </div>
        <h1 className="text-2xl font-black text-foreground mb-2">שגיאה</h1>
        <p className="text-muted-foreground font-medium">אירעה שגיאה. אנא נסי שוב מאוחר יותר.</p>
      </div>
    )
  }

  if (already && status === 'CANCELLED') {
    return (
      <div className="text-center">
        <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="h-7 w-7 text-muted-foreground" />
        </div>
        <h1 className="text-2xl font-black text-foreground mb-2">התור בוטל</h1>
        <p className="text-muted-foreground font-medium">התור הזה כבר בוטל ולא ניתן לאשר אותו.</p>
      </div>
    )
  }

  if (already) {
    return (
      <div className="text-center">
        <div className="w-16 h-16 rounded-2xl bg-green-100 flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="h-7 w-7 text-green-600" />
        </div>
        <h1 className="text-2xl font-black text-foreground mb-2">התור כבר אושר</h1>
        <p className="text-muted-foreground font-medium">התור הזה אושר כבר בעבר.</p>
      </div>
    )
  }

  return (
    <div className="text-center">
      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-primary/30">
        <CalendarCheck className="h-10 w-10 text-white" />
      </div>
      <h1 className="text-3xl font-black text-foreground mb-3">התור אושר!</h1>
      {emailError ? (
        <p className="text-amber-600 font-semibold text-sm bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-2">
          התור אושר אך שליחת מייל ללקוחה נכשלה — בדקי את לוגי Railway
        </p>
      ) : (
        <p className="text-muted-foreground font-medium text-lg mb-2">הלקוחה קיבלה אישור במייל.</p>
      )}
      <p className="text-muted-foreground font-medium">תודה שאישרת — הכול מסודר!</p>
    </div>
  )
}

export default function ConfirmedPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="bg-card rounded-3xl shadow-xl p-10 max-w-md w-full">
        <Suspense>
          <Content />
        </Suspense>
        <div className="mt-8 text-center">
          <Link
            href="/dashboard/nailist/appointments"
            className="inline-block bg-gradient-to-r from-orange-500 to-amber-600 text-white font-black rounded-xl px-6 py-3 text-sm hover:opacity-90 transition"
          >
            לוח התורים שלי
          </Link>
        </div>
      </div>
    </div>
  )
}
