'use client'

import { motion } from 'framer-motion'
import { useInView } from 'framer-motion'
import { useRef } from 'react'

const features = [
  { emoji: '🔍', title: 'חיפוש חכם', desc: 'סינון לפי מיקום, סוג שירות, מחיר וזמינות בזמן אמת.' },
  { emoji: '⭐', title: 'ביקורות אמיתיות', desc: 'רק לקוחות שהגיעו לתור יכולות לכתוב ביקורת — שקיפות מלאה.' },
  { emoji: '📱', title: 'הזמנה מהטלפון', desc: 'ממשק מותאם לנייד — הזמיני תור מכל מקום, בכל זמן.' },
  { emoji: '🔒', title: 'בטוח ואמין', desc: 'כל הנייליסטיות עוברות אימות. הנתונים שלך מוגנים.' },
  { emoji: '💬', title: 'תקשורת ישירה', desc: 'שלחי הודעות ישירות לנייליסטית לפני ואחרי התור.' },
  { emoji: '🎨', title: 'גלריית עיצובים', desc: 'ראי תמונות של עיצובים אמיתיים לפני שתחליטי.' },
]

export function FeaturesSection() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <section ref={ref} className="py-24 relative overflow-hidden">
      <div
        className="absolute inset-0"
        style={{ background: 'linear-gradient(160deg, hsl(271,91%,98%) 0%, hsl(0,0%,100%) 50%, hsl(326,100%,98%) 100%)' }}
      />

      <div className="container mx-auto max-w-7xl px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 bg-pink-50 text-pink-600 rounded-full px-4 py-2 text-sm font-bold mb-5">
            💗 הכי טוב בשוק
          </div>
          <h2 className="text-4xl md:text-5xl font-black mb-4">
            כל מה שצריך{' '}
            <span className="gradient-text">במקום אחד</span>
          </h2>
          <p className="text-xl text-gray-400 max-w-lg mx-auto">
            חוויה חלקה ומוצלחת — מהחיפוש ועד שיוצאים עם ציפורניים מושלמות
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
              className="glass rounded-3xl p-7 group cursor-default hover:shadow-xl hover:shadow-pink-100/50 transition-shadow"
            >
              <motion.div
                whileHover={{ rotate: 15, scale: 1.2 }}
                transition={{ type: 'spring', stiffness: 300 }}
                className="text-4xl mb-4 inline-block"
              >
                {f.emoji}
              </motion.div>
              <h3 className="text-lg font-black text-gray-800 mb-2">{f.title}</h3>
              <p className="text-gray-500 leading-relaxed text-sm">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
