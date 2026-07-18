'use client'

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import { Search, Star, Smartphone, Shield, MessageCircle, Image } from 'lucide-react'
import { TiltCard } from '@/components/ui/tilt-card'

const features = [
  { Icon: Search, title: 'חיפוש חכם', desc: 'סינון לפי מיקום, סוג שירות, מחיר וזמינות בזמן אמת.' },
  { Icon: Star, title: 'ביקורות אמיתיות', desc: 'רק לקוחות שהגיעו לתור יכולות לכתוב ביקורת — שקיפות מלאה.' },
  { Icon: Smartphone, title: 'הזמנה מהטלפון', desc: 'ממשק מותאם לנייד — הזמיני תור מכל מקום, בכל זמן.' },
  { Icon: Shield, title: 'בטוח ואמין', desc: 'כל הנייליסטיות עוברות אימות. הנתונים שלך מוגנים.' },
  { Icon: MessageCircle, title: 'תקשורת ישירה', desc: 'שלחי הודעות ישירות לנייליסטית לפני ואחרי התור.' },
  { Icon: Image, title: 'גלריית עיצובים', desc: 'ראי תמונות של עיצובים אמיתיים לפני שתחליטי.' },
]

export function FeaturesSection() {
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
          <div className="inline-flex items-center gap-2 bg-orange-50 text-primary border border-orange-100 rounded-full px-4 py-2 text-sm font-semibold mb-5">
            הכי טוב בשוק
          </div>
          <h2 className="text-4xl md:text-5xl font-black mb-4 text-foreground">
            כל מה שצריך{' '}
            <span className="gradient-text">במקום אחד</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-lg mx-auto">
            חוויה חלקה ומוצלחת — מהחיפוש ועד שיוצאים עם ציפורניים מושלמות
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.4, delay: i * 0.06 }}
              whileHover={{ y: -3, transition: { duration: 0.2 } }}
              className="h-full"
            >
              <TiltCard
                maxTiltDeg={5}
                className="bg-card rounded-2xl p-7 cursor-default border border-border hover:border-orange-200 hover:shadow-[0_8px_30px_rgba(194,84,45,0.10)] transition-all duration-300 group h-full"
              >
                <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center mb-5 group-hover:bg-primary group-hover:shadow-[0_4px_12px_rgba(194,84,45,0.3)] transition-all duration-300">
                  <f.Icon className="w-5 h-5 text-primary group-hover:text-white transition-colors duration-300" />
                </div>
                <h3 className="text-base font-black text-foreground mb-2">{f.title}</h3>
                <p className="text-muted-foreground leading-relaxed text-sm">{f.desc}</p>
              </TiltCard>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
