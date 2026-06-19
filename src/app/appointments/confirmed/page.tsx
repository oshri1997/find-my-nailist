'use client'

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'

function Content() {
  const params = useSearchParams()
  const error = params.get('error')
  const already = params.get('already')

  if (error === 'invalid') {
    return (
      <div className="text-center">
        <div className="text-6xl mb-4">🔗</div>
        <h1 className="text-2xl font-black text-gray-800 mb-2">קישור לא תקין</h1>
        <p className="text-gray-500 font-medium">הקישור אינו תקין. ייתכן שהתור כבר אושר או בוטל.</p>
      </div>
    )
  }

  if (error === 'expired') {
    return (
      <div className="text-center">
        <div className="text-6xl mb-4">⏰</div>
        <h1 className="text-2xl font-black text-gray-800 mb-2">הקישור פג תוקף</h1>
        <p className="text-gray-500 font-medium">הקישור לאישור פג תוקף (תקף 7 ימים). אנא בקשי מהלקוחה לקבוע תור חדש.</p>
      </div>
    )
  }

  if (error === 'server') {
    return (
      <div className="text-center">
        <div className="text-6xl mb-4">😕</div>
        <h1 className="text-2xl font-black text-gray-800 mb-2">שגיאה</h1>
        <p className="text-gray-500 font-medium">אירעה שגיאה. אנא נסי שוב מאוחר יותר.</p>
      </div>
    )
  }

  if (already) {
    return (
      <div className="text-center">
        <div className="text-6xl mb-4">✅</div>
        <h1 className="text-2xl font-black text-gray-800 mb-2">התור כבר אושר</h1>
        <p className="text-gray-500 font-medium">התור הזה אושר כבר בעבר.</p>
      </div>
    )
  }

  return (
    <div className="text-center">
      <div className="text-7xl mb-6 animate-bounce">💅</div>
      <h1 className="text-3xl font-black text-gray-800 mb-3">התור אושר!</h1>
      <p className="text-gray-500 font-medium text-lg mb-2">הלקוחה קיבלה אישור במייל.</p>
      <p className="text-gray-400 font-medium">תודה שאישרת — הכול מסודר! 🌸</p>
    </div>
  )
}

export default function ConfirmedPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-3xl shadow-xl p-10 max-w-md w-full">
        <Suspense>
          <Content />
        </Suspense>
        <div className="mt-8 text-center">
          <Link
            href="/dashboard/nailist/appointments"
            className="inline-block bg-gradient-to-r from-pink-500 to-purple-600 text-white font-black rounded-xl px-6 py-3 text-sm hover:opacity-90 transition"
          >
            לוח התורים שלי
          </Link>
        </div>
      </div>
    </div>
  )
}
