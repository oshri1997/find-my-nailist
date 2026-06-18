'use client'

import { motion } from 'framer-motion'
import { useInView } from 'framer-motion'
import { useRef } from 'react'
import { MapPin, Star, Calendar } from 'lucide-react'

const steps = [
  {
    icon: MapPin,
    emoji: '📍',
    step: '01',
    title: 'גלי נייליסטיות בקרבתך',
    desc: 'השתמשי במיקום שלך כדי לגלות מאות מומחיות ציפורניים באזורך.',
    color: 'from-pink-500 to-rose-500',
    bg: 'from-pink-50 to-rose-50',
    border: 'border-pink-100',
  },
  {
    icon: Star,
    emoji: '✨',
    step: '02',
    title: 'עיצוב ופורטפוליו',
    desc: 'עיצובים ׳before & after׳, ביקורות אמיתיות ומחירים שקופים.',
    color: 'from-purple-500 to-violet-500',
    bg: 'from-purple-50 to-violet-50',
    border: 'border-purple-100',
  },
  {
    icon: Calendar,
    emoji: '🗓️',
    step: '03',
    title: 'הזמיני תור בקליק',
    desc: 'בחרי שירות, תאריך ושעה — בלי שיחות, בלי המתנה.',
    color: 'from-violet-500 to-blue-500',
    bg: 'from-violet-50 to-blue-50',
    border: 'border-violet-100',
  },
]

export function HowItWorksSection() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <section ref={ref} className="py-24 bg-white overflow-hidden">
      <div className="container mx-auto max-w-7xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 bg-purple-50 text-purple-600 rounded-full px-4 py-2 text-sm font-bold mb-5">
            ✨ פשוט כמו 1, 2, 3
          </div>
          <h2 className="text-4xl md:text-5xl font-black mb-4">
            איך זה <span className="gradient-text">עובד?</span>
          </h2>
          <p className="text-xl text-gray-400 max-w-lg mx-auto">
            מ״חיפוש״ ל״תור מאושר״ — פחות מ-60 שניות
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {/* Connector line */}
          <div className="hidden md:block absolute top-16 right-[calc(33%+2rem)] left-[calc(33%+2rem)] h-0.5 bg-gradient-to-l from-purple-200 via-pink-200 to-rose-200" />

          {steps.map((step, i) => (
            <motion.div
              key={step.step}
              initial={{ opacity: 0, y: 40 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: i * 0.15 }}
              whileHover={{ y: -6, transition: { duration: 0.2 } }}
              className={`relative rounded-3xl border-2 ${step.border} bg-gradient-to-br ${step.bg} p-8 cursor-default`}
            >
              <div className="absolute top-6 left-6 text-5xl font-black opacity-10 text-gray-900">{step.step}</div>

              <motion.div
                whileHover={{ rotate: 10, scale: 1.1 }}
                className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${step.color} flex items-center justify-center mb-6 shadow-lg text-2xl`}
              >
                {step.emoji}
              </motion.div>

              <h3 className="text-xl font-black text-gray-800 mb-3">{step.title}</h3>
              <p className="text-gray-500 leading-relaxed">{step.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
