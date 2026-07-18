'use client'

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import { Heart, Scissors, Star, MapPin } from 'lucide-react'

const stats = [
  { value: '2,000+', label: 'לקוחות מרוצות', Icon: Heart },
  { value: '500+', label: 'נייליסטיות מאומתות', Icon: Scissors },
  { value: '98%', label: 'שביעות רצון', Icon: Star },
  { value: '50+', label: 'ערים ברחבי הארץ', Icon: MapPin },
]

export function StatsSection() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section ref={ref} className="py-16 bg-card border-y border-border/60">
      <div className="container mx-auto max-w-7xl px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              className="text-center"
            >
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-orange-50 mb-4">
                <stat.Icon className="w-5 h-5 text-primary" />
              </div>
              <div className="text-3xl md:text-4xl font-black gradient-text mb-1">{stat.value}</div>
              <div className="text-sm text-muted-foreground font-medium">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
