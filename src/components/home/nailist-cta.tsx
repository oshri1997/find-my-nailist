'use client'

import Link from 'next/link'
import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Users, Zap, Sparkles } from 'lucide-react'

const perks = [
  { Icon: Sparkles, text: 'פרופיל חינמי לחלוטין' },
  { Icon: Users, text: 'חשיפה לאלפי לקוחות' },
  { Icon: Zap, text: 'ניהול תורים אוטומטי' },
]

export function NailistCtaSection() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <section ref={ref} className="py-24 bg-background">
      <div className="container mx-auto max-w-5xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-primary via-pink-500 to-accent p-12 md:p-16 text-center text-white"
        >
          {/* Dot grid overlay */}
          <div className="absolute inset-0 dot-pattern pointer-events-none" />

          <div className="relative z-10">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/20 mb-8">
              <Sparkles className="w-8 h-8 text-white" />
            </div>

            <h2 className="text-4xl md:text-5xl font-black mb-4 leading-tight">
              את נייליסטית מוכשרת?
            </h2>
            <p className="text-lg text-white/80 max-w-xl mx-auto mb-10 leading-relaxed">
              הצטרפי לקהילת הנייליסטיות שלנו, בני פרופיל מרהיב,
              תופיעי בחיפוש ותקבלי לקוחות חדשות כל יום.
            </p>

            <div className="flex flex-wrap justify-center gap-4 mb-10">
              {perks.map((perk, i) => (
                <motion.div
                  key={perk.text}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={isInView ? { opacity: 1, scale: 1 } : {}}
                  transition={{ delay: 0.2 + i * 0.08 }}
                  className="flex items-center gap-2 bg-white/15 rounded-full px-5 py-2.5 text-sm font-semibold"
                >
                  <perk.Icon className="w-4 h-4" />
                  {perk.text}
                </motion.div>
              ))}
            </div>

            <Link href="/register?role=nailist">
              <Button
                size="lg"
                className="bg-white text-primary hover:bg-white/90 font-black text-base rounded-xl px-10 h-12 shadow-[0_8px_30px_rgba(0,0,0,0.20)] gap-2 group border-0 cursor-pointer"
              >
                התחילי עכשיו — בחינם
                <ArrowLeft className="h-5 w-5 group-hover:-translate-x-1 transition-transform" />
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
