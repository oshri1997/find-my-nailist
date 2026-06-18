'use client'

import { motion } from 'framer-motion'
import { useInView } from 'framer-motion'
import { useRef } from 'react'

const stats = [
  { value: '2,000+', label: 'לקוחות מרוצות', emoji: '💗' },
  { value: '500+', label: 'נייליסטיות מאומתות', emoji: '💅' },
  { value: '98%', label: 'שביעות רצון', emoji: '⭐' },
  { value: '50+', label: 'ערים ברחבי הארץ', emoji: '📍' },
]

export function StatsSection() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section ref={ref} className="py-16 relative overflow-hidden">
      <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, hsl(326,100%,97%) 0%, hsl(271,91%,97%) 100%)' }} />
      <div className="container mx-auto max-w-7xl px-6 relative z-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="text-center"
            >
              <div className="text-4xl mb-2">{stat.emoji}</div>
              <div className="text-3xl md:text-4xl font-black gradient-text mb-1">{stat.value}</div>
              <div className="text-sm text-gray-500 font-medium">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
