'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { useInView } from 'framer-motion'
import { useRef } from 'react'
import { Button } from '@/components/ui/button'
import { ArrowLeft, TrendingUp, Users, DollarSign } from 'lucide-react'

const perks = [
  { icon: TrendingUp, text: 'פרופיל חינמי לחלוטין' },
  { icon: Users, text: 'חשיפה לאלפי לקוחות' },
  { icon: DollarSign, text: 'ניהול תורים אוטומטי' },
]

export function NailistCtaSection() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <section ref={ref} className="py-24 relative overflow-hidden">
      <div className="container mx-auto max-w-5xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.95 }}
          animate={isInView ? { opacity: 1, y: 0, scale: 1 } : {}}
          transition={{ duration: 0.7 }}
          className="relative rounded-[2.5rem] overflow-hidden"
          style={{ background: 'linear-gradient(135deg, hsl(326,100%,50%) 0%, hsl(271,91%,60%) 50%, hsl(250,95%,65%) 100%)' }}
        >
          {/* Decorative blobs inside card */}
          <div className="absolute top-[-30%] left-[-10%] w-64 h-64 rounded-full bg-white/10" />
          <div className="absolute bottom-[-20%] right-[-5%] w-80 h-80 rounded-full bg-white/10" />

          <div className="relative z-10 p-12 md:p-16 text-center text-white">
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 3, repeat: Infinity }}
              className="text-6xl mb-6 inline-block"
            >
              💅
            </motion.div>

            <h2 className="text-4xl md:text-5xl font-black mb-4 leading-tight">
              את נייליסטית מוכשרת?
            </h2>
            <p className="text-xl text-white/80 max-w-xl mx-auto mb-8 leading-relaxed">
              הצטרפי לקהילת הנייליסטיות שלנו, בני פרופיל מרהיב,
              תופיעי בחיפוש ותקבלי לקוחות חדשות כל יום.
            </p>

            <div className="flex flex-wrap justify-center gap-6 mb-10">
              {perks.map((perk, i) => (
                <motion.div
                  key={perk.text}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={isInView ? { opacity: 1, scale: 1 } : {}}
                  transition={{ delay: 0.3 + i * 0.1 }}
                  className="flex items-center gap-2 bg-white/15 backdrop-blur rounded-full px-5 py-2.5 text-sm font-bold"
                >
                  <perk.icon className="w-4 h-4" />
                  {perk.text}
                </motion.div>
              ))}
            </div>

            <Link href="/register?role=nailist">
              <Button
                size="lg"
                className="bg-white text-pink-600 hover:bg-pink-50 font-black text-lg rounded-2xl px-10 h-14 shadow-2xl gap-2 group border-0"
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
