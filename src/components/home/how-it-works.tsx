'use client'

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import { MapPin, Star, Calendar } from 'lucide-react'
import { TiltCard } from '@/components/ui/tilt-card'

const steps = [
  {
    Icon: MapPin,
    step: '01',
    title: 'גלי נייליסטיות בקרבתך',
    desc: 'השתמשי במיקום שלך כדי לגלות מאות מומחיות ציפורניים באזורך.',
    iconBg: 'bg-orange-500',
    cardBg: 'bg-orange-50 dark:bg-orange-950/40',
    border: 'border-orange-100 dark:border-orange-900/50',
    stepColor: 'text-orange-400',
  },
  {
    Icon: Star,
    step: '02',
    title: 'עיצוב ופורטפוליו',
    desc: 'עיצובים before & after, ביקורות אמיתיות ומחירים שקופים.',
    iconBg: 'bg-emerald-500',
    cardBg: 'bg-emerald-50 dark:bg-emerald-950/40',
    border: 'border-emerald-100 dark:border-emerald-900/50',
    stepColor: 'text-emerald-400',
  },
  {
    Icon: Calendar,
    step: '03',
    title: 'הזמיני תור בקליק',
    desc: 'בחרי שירות, תאריך ושעה — בלי שיחות, בלי המתנה.',
    iconBg: 'bg-amber-500',
    cardBg: 'bg-amber-50 dark:bg-amber-950/40',
    border: 'border-amber-100 dark:border-amber-900/50',
    stepColor: 'text-amber-400',
  },
]

export function HowItWorksSection() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <section ref={ref} className="py-24 bg-background">
      <div className="container mx-auto max-w-7xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.4 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-full px-4 py-2 text-sm font-semibold mb-5">
            פשוט כמו 1, 2, 3
          </div>
          <h2 className="text-4xl md:text-5xl font-black mb-4 text-foreground">
            איך זה <span className="gradient-text">עובד?</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-lg mx-auto">
            מ״חיפוש״ ל״תור מאושר״ — פחות מ-60 שניות
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
          {steps.map((step, i) => (
            <motion.div
              key={step.step}
              initial={{ opacity: 0, y: 24 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
              className="h-full"
            >
              <TiltCard
                maxTiltDeg={5}
                className={`relative rounded-2xl border ${step.border} ${step.cardBg} p-8 cursor-default h-full`}
              >
                <div className={`w-12 h-12 rounded-xl ${step.iconBg} flex items-center justify-center mb-6 shadow-[0_4px_12px_rgba(0,0,0,0.14)]`}>
                  <step.Icon className="w-6 h-6 text-white" />
                </div>
                <div className={`text-xs font-black ${step.stepColor} mb-2 tracking-widest`}>{step.step}</div>
                <h3 className="text-lg font-black text-foreground mb-3">{step.title}</h3>
                <p className="text-muted-foreground leading-relaxed text-sm">{step.desc}</p>
              </TiltCard>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
