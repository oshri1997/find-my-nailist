'use client'

import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Calendar, Users, Star, TrendingUp, Clock, CheckCircle2, Circle } from 'lucide-react'
import { useAuth } from '@/components/auth/auth-provider'

const stats = [
  { label: 'תורים', value: '0', icon: '📅', change: '+0 החודש', gradient: 'from-pink-500 to-rose-500', bg: 'from-pink-50 to-rose-50', border: 'border-pink-100' },
  { label: 'לקוחות', value: '0', icon: '👥', change: '+0 החודש', gradient: 'from-purple-500 to-violet-500', bg: 'from-purple-50 to-violet-50', border: 'border-purple-100' },
  { label: 'הכנסות', value: '₪0', icon: '💰', change: '+₪0 החודש', gradient: 'from-violet-500 to-blue-500', bg: 'from-violet-50 to-blue-50', border: 'border-violet-100' },
  { label: 'דירוג ממוצע', value: '—', icon: '⭐', change: 'אין ביקורות עדיין', gradient: 'from-amber-500 to-orange-500', bg: 'from-amber-50 to-orange-50', border: 'border-amber-100' },
]

const profileChecklist = [
  { label: 'פרטי עסק', done: false },
  { label: 'הוסיפי שירותים ומחירים', done: false },
  { label: 'העלי תמונות לפורטפוליו', done: false },
  { label: 'הגדירי שעות עבודה', done: false },
  { label: 'הוסיפי קישורי רשתות חברתיות', done: false },
]

const quickActions = [
  { label: 'הגדרת שעות עבודה', icon: '⏰', href: '/dashboard/nailist/settings' },
  { label: 'הוספת שירות חדש', icon: '✂️', href: '/dashboard/nailist/services' },
  { label: 'צפייה בפרופיל ציבורי', icon: '👁️', href: '/search' },
]

export default function NailistDashboard() {
  const { user } = useAuth()
  const firstName = user?.displayName?.split(' ')[0] ?? user?.email?.split('@')[0] ?? 'נייליסטית'

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-6 md:mb-8"
      >
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-2xl md:text-3xl font-black text-gray-800">שלום, {firstName}! 👋</h1>
        </div>
        <p className="text-gray-400 font-medium">הנה סקירה של העסק שלך</p>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5 mb-6 md:mb-8">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: i * 0.08 }}
            className={`rounded-3xl border-2 ${stat.border} bg-gradient-to-br ${stat.bg} p-6`}
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-2xl">{stat.icon}</span>
              <TrendingUp className="h-4 w-4 text-gray-300" />
            </div>
            <div className="text-3xl font-black text-gray-800 mb-1">{stat.value}</div>
            <div className="text-sm font-bold text-gray-500">{stat.label}</div>
            <div className="text-xs text-gray-400 mt-1 font-medium">{stat.change}</div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-5">
        {/* Upcoming appointments */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm"
        >
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-lg font-black text-gray-800">תורים קרובים</h3>
              <p className="text-sm text-gray-400 font-medium">ההזמנות הבאות שלך</p>
            </div>
            <span className="text-2xl">📅</span>
          </div>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center text-3xl mb-4">
              📭
            </div>
            <p className="text-sm font-bold text-gray-400 mb-4">אין תורים קרובים</p>
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl border-gray-200 font-bold hover:border-pink-300 hover:text-pink-600"
            >
              <Clock className="h-4 w-4 ml-2" />
              הגדרי זמינות
            </Button>
          </div>
        </motion.div>

        {/* Recent reviews */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm"
        >
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-lg font-black text-gray-800">ביקורות אחרונות</h3>
              <p className="text-sm text-gray-400 font-medium">מה הלקוחות אומרות</p>
            </div>
            <span className="text-2xl">⭐</span>
          </div>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center text-3xl mb-4">
              💭
            </div>
            <p className="text-sm font-bold text-gray-400 mb-1">אין ביקורות עדיין</p>
            <p className="text-xs text-gray-300 font-medium">השלימי תורים כדי לקבל ביקורות</p>
          </div>
        </motion.div>

        {/* Profile completion */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm"
        >
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-lg font-black text-gray-800">השלמת פרופיל</h3>
              <p className="text-sm text-gray-400 font-medium">משכי יותר לקוחות</p>
            </div>
            <span className="text-2xl">📝</span>
          </div>
          <div className="mb-4">
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: '5%' }}
                transition={{ duration: 1, delay: 0.6 }}
                className="h-full bg-gradient-to-r from-pink-500 to-purple-600 rounded-full"
              />
            </div>
            <p className="text-xs text-gray-400 font-medium mt-1">0% הושלם</p>
          </div>
          <div className="space-y-3">
            {profileChecklist.map((item, i) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + i * 0.05 }}
                className="flex items-center gap-3 text-sm"
              >
                {item.done ? (
                  <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                ) : (
                  <Circle className="w-5 h-5 text-gray-200 shrink-0" />
                )}
                <span className={item.done ? 'text-gray-400 line-through' : 'text-gray-600 font-medium'}>{item.label}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Quick actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm"
        >
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-lg font-black text-gray-800">פעולות מהירות</h3>
              <p className="text-sm text-gray-400 font-medium">קיצורי דרך שימושיים</p>
            </div>
            <span className="text-2xl">⚡</span>
          </div>
          <div className="space-y-3">
            {quickActions.map((action, i) => (
              <motion.a
                key={action.label}
                href={action.href}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.55 + i * 0.07 }}
                whileHover={{ x: -4 }}
                className="flex items-center gap-3 w-full px-4 py-3 rounded-2xl border border-gray-100 text-sm font-bold text-gray-600 hover:border-pink-200 hover:text-pink-600 hover:bg-pink-50/50 transition-all"
              >
                <span className="text-lg">{action.icon}</span>
                {action.label}
              </motion.a>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  )
}
