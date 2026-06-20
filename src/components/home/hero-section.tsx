'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Search, ArrowLeft, Star, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'

const mockCards = [
  { name: 'גל כהן', service: "ג'ל + נייל ארט", price: '₪120', stars: 5 },
  { name: 'רונית לוי', service: 'מניקור קלאסי', price: '₪90', stars: 5 },
  { name: 'שירה מזרחי', service: 'טיפול מלא', price: '₪150', stars: 5 },
]

export function HeroSection() {
  return (
    <section className="relative min-h-[90vh] flex items-center overflow-hidden bg-white">
      {/* Subtle decorative circles */}
      <div className="absolute top-0 right-0 w-[700px] h-[700px] rounded-full opacity-[0.06] bg-primary -translate-y-1/2 translate-x-1/3 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] rounded-full opacity-[0.04] bg-accent translate-y-1/3 -translate-x-1/4 pointer-events-none" />

      <div className="container mx-auto max-w-7xl px-6 py-24 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

          {/* Text side */}
          <div className="text-right">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="inline-flex items-center gap-2 bg-pink-50 border border-pink-100 rounded-full px-4 py-2 text-sm font-semibold text-primary mb-8"
            >
              <Sparkles className="h-3.5 w-3.5" />
              פלטפורמת הנייל #1 בישראל
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.08 }}
              className="text-5xl md:text-6xl lg:text-7xl font-black leading-[1.1] tracking-tight mb-6 text-foreground"
            >
              מצאי את{' '}
              <span className="gradient-text">הנייליסטית</span>
              <br />
              המושלמת עבורך
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.16 }}
              className="text-lg text-muted-foreground max-w-xl mb-10 leading-relaxed"
            >
              גלי מאות מומחיות ציפורניים בקרבתך — עיצוב ג&apos;ל, נייל ארט ומניקור מקצועי.
              הזמיני תור בקליק אחד, בלי שיחות, בלי המתנה.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.24 }}
              className="flex flex-col sm:flex-row gap-4"
            >
              <Link href="/search">
                <Button
                  size="lg"
                  className="bg-primary hover:bg-primary/90 text-white border-0 shadow-[0_4px_20px_rgba(236,72,153,0.35)] font-bold text-base rounded-xl px-8 h-12 gap-3 group cursor-pointer"
                >
                  <Search className="h-5 w-5" />
                  חפשי קרוב אלייך
                  <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Link href="/login?tab=register">
                <Button
                  size="lg"
                  variant="outline"
                  className="border border-border hover:border-primary/40 hover:bg-pink-50/50 font-semibold text-base rounded-xl px-8 h-12 text-foreground transition-all cursor-pointer"
                >
                  אני נייליסטית →
                </Button>
              </Link>
            </motion.div>

            {/* Social proof */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="flex items-center gap-4 mt-10"
            >
              <div className="flex -space-x-3 space-x-reverse">
                {['#F9A8D4', '#C4B5FD', '#93C5FD', '#6EE7B7'].map((color, i) => (
                  <div
                    key={i}
                    className="w-9 h-9 rounded-full border-2 border-white shadow-sm"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
              <div>
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                  ))}
                  <span className="font-bold text-foreground mr-1">4.9</span>
                </div>
                <p className="text-sm text-muted-foreground">+2,000 לקוחות מרוצות</p>
              </div>
            </motion.div>
          </div>

          {/* Visual side — phone mockup */}
          <div className="relative hidden lg:flex justify-center">
            <motion.div
              initial={{ opacity: 0, y: 32, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.7, delay: 0.15 }}
              className="relative"
            >
              {/* Phone frame */}
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
                className="w-72 h-[560px] rounded-[40px] overflow-hidden border border-border bg-background shadow-[0_24px_80px_rgba(236,72,153,0.18),0_8px_24px_rgba(0,0,0,0.08)]"
              >
                {/* Status bar */}
                <div className="h-10 bg-background flex items-center px-6 justify-between">
                  <span className="text-xs font-semibold text-foreground/50">9:41</span>
                  <div className="flex gap-1 items-center">
                    <div className="w-4 h-2 bg-foreground/15 rounded-sm" />
                    <div className="w-1.5 h-2 bg-primary rounded-sm" />
                  </div>
                </div>

                {/* App content */}
                <div className="p-5 pt-2">
                  <div className="text-center mb-5">
                    <div className="w-10 h-10 rounded-xl bg-primary mx-auto mb-2 flex items-center justify-center shadow-[0_4px_12px_rgba(236,72,153,0.3)]">
                      <Sparkles className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="font-black text-base text-foreground">ניליסטיות</h3>
                    <p className="text-xs text-muted-foreground">גלי את המושלמת עבורך</p>
                  </div>

                  {/* Search bar */}
                  <div className="bg-white rounded-xl p-3 shadow-[0_2px_10px_rgba(0,0,0,0.06)] mb-4 flex items-center gap-2 border border-border">
                    <Search className="w-4 h-4 text-muted-foreground/50" />
                    <span className="text-xs text-muted-foreground/60">חפשי לפי מיקום...</span>
                  </div>

                  {/* Mini nailist cards */}
                  {mockCards.map((card, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.5 + i * 0.15 }}
                      className="bg-white rounded-xl p-3 mb-2 flex items-center gap-3 border border-border shadow-[0_1px_6px_rgba(0,0,0,0.04)]"
                    >
                      <div className="w-9 h-9 rounded-xl bg-pink-50 flex items-center justify-center shrink-0">
                        <Sparkles className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 text-right min-w-0">
                        <p className="font-bold text-xs text-foreground truncate">{card.name}</p>
                        <p className="text-[10px] text-muted-foreground">{card.service}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-black text-xs text-primary">{card.price}</p>
                        <div className="flex justify-end">
                          {[...Array(card.stars)].map((_, j) => (
                            <Star key={j} className="w-2 h-2 fill-amber-400 text-amber-400" />
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>

              {/* Appointment confirmed badge */}
              <motion.div
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
                className="absolute -bottom-6 -right-10 bg-white rounded-2xl px-4 py-3 shadow-[0_8px_32px_rgba(0,0,0,0.10)] border border-border"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center">
                    <div className="w-3 h-3 rounded-full bg-emerald-500" />
                  </div>
                  <div>
                    <p className="font-bold text-xs text-foreground">תור אושר!</p>
                    <p className="text-[10px] text-muted-foreground">יום שלישי, 14:00</p>
                  </div>
                </div>
              </motion.div>

              {/* New review badge */}
              <motion.div
                animate={{ y: [0, -5, 0] }}
                transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
                className="absolute -top-6 -left-10 bg-white rounded-2xl px-4 py-3 shadow-[0_8px_32px_rgba(0,0,0,0.10)] border border-border"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center">
                    <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                  </div>
                  <div>
                    <p className="font-bold text-xs text-foreground">חוות דעת חדשה</p>
                    <p className="text-[10px] text-primary">״מקסימה! ממליצה בחום״</p>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  )
}
