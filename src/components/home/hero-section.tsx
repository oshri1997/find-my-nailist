'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Search, ArrowLeft, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'

const floatingCards = [
  { name: 'סופיה מ.', service: 'ג\'ל + נייל ארט', rating: 5, top: '12%', right: '-2%', delay: 0 },
  { name: 'נועה כ.', service: 'מניקור קלאסי', rating: 5, top: '60%', right: '-4%', delay: 0.5 },
  { name: 'מיה ר.', service: 'טיפול מלא', rating: 5, top: '35%', left: '-2%', delay: 1 },
]

const emojis = ['💅', '✨', '💗', '🌸', '💜', '⭐']

export function HeroSection() {
  return (
    <section className="relative min-h-[92vh] flex items-center overflow-hidden bg-mesh">
      {/* Animated blobs */}
      <motion.div
        animate={{ scale: [1, 1.15, 1], rotate: [0, 10, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full opacity-20"
        style={{ background: 'radial-gradient(circle, hsl(326,100%,70%) 0%, hsl(271,91%,75%) 100%)' }}
      />
      <motion.div
        animate={{ scale: [1, 1.2, 1], rotate: [0, -15, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
        className="absolute bottom-[-15%] left-[-8%] w-[450px] h-[450px] rounded-full opacity-15"
        style={{ background: 'radial-gradient(circle, hsl(250,95%,75%) 0%, hsl(326,100%,70%) 100%)' }}
      />

      {/* Floating emoji decorations */}
      {emojis.map((emoji, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: [0.4, 0.8, 0.4], y: [0, -20, 0] }}
          transition={{ duration: 4 + i, repeat: Infinity, delay: i * 0.7 }}
          className="absolute text-2xl select-none pointer-events-none hidden md:block"
          style={{
            top: `${15 + i * 12}%`,
            left: `${3 + (i % 2) * 88}%`,
          }}
        >
          {emoji}
        </motion.div>
      ))}

      <div className="container mx-auto max-w-7xl px-6 py-24 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Text side */}
          <div className="text-right">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-2 bg-white/80 backdrop-blur border border-pink-100 rounded-full px-4 py-2 text-sm font-semibold text-pink-600 shadow-sm mb-8"
            >
              <span className="w-2 h-2 rounded-full bg-pink-500 animate-pulse" />
              פלטפורמת הנייל #1 בישראל
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1 }}
              className="text-5xl md:text-7xl font-black leading-[1.1] tracking-tight mb-6"
            >
              מצאי את{' '}
              <span className="gradient-text">הנייליסטית</span>
              <br />
              המושלמת עבורך
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="text-xl text-gray-500 max-w-xl mb-10 leading-relaxed"
            >
              גלי מאות מומחיות ציפורניים בקרבתך, עיצוב ג&apos;ל, נייל ארט ומניקור מקצועי.
              הזמיני תור בקליק אחד — בלי שיחות, בלי המתנה.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-4"
            >
              <Link href="/search">
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 border-0 shadow-xl shadow-pink-200 font-bold text-lg rounded-2xl px-8 h-14 gap-3 group"
                >
                  <Search className="h-5 w-5" />
                  חפשי קרוב אלייך
                  <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Link href="/register?role=nailist">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-2 border-gray-200 hover:border-pink-300 font-bold text-lg rounded-2xl px-8 h-14 hover:bg-pink-50 transition-all"
                >
                  אני נייליסטית →
                </Button>
              </Link>
            </motion.div>

            {/* Social proof */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.5 }}
              className="flex items-center gap-4 mt-10"
            >
              <div className="flex -space-x-3 space-x-reverse">
                {['#F9A8D4', '#C4B5FD', '#93C5FD', '#6EE7B7'].map((color, i) => (
                  <div
                    key={i}
                    className="w-10 h-10 rounded-full border-2 border-white shadow-sm"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
              <div>
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                  ))}
                  <span className="font-bold text-gray-800 mr-1">4.9</span>
                </div>
                <p className="text-sm text-gray-500">+2,000 לקוחות מרוצות</p>
              </div>
            </motion.div>
          </div>

          {/* Visual side */}
          <div className="relative hidden lg:block">
            {/* Central phone mockup */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="relative mx-auto w-72"
            >
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                className="w-72 h-[560px] rounded-[40px] shadow-2xl shadow-purple-200 overflow-hidden border-4 border-white"
                style={{ background: 'linear-gradient(160deg, #fdf2f8 0%, #f3e8ff 40%, #ede9fe 100%)' }}
              >
                {/* App UI mockup */}
                <div className="p-6 pt-12">
                  <div className="text-center mb-6">
                    <div className="text-4xl mb-2">💅</div>
                    <h3 className="font-black text-lg text-gray-800">מצאי נייליסטית</h3>
                    <p className="text-xs text-gray-400">גלי את המושלמת עבורך</p>
                  </div>

                  {/* Search bar */}
                  <div className="bg-white rounded-2xl p-3 shadow-sm mb-4 flex items-center gap-2">
                    <Search className="w-4 h-4 text-gray-300" />
                    <span className="text-sm text-gray-300">חפשי לפי מיקום...</span>
                  </div>

                  {/* Mini cards */}
                  {[
                    { name: 'גל כהן', service: 'נייל ארט', price: '₪120', stars: 5, color: '#FDF2F8' },
                    { name: 'רונית לוי', service: 'ג\'ל + עיצוב', price: '₪150', stars: 5, color: '#F3E8FF' },
                    { name: 'שירה מזרחי', service: 'מניקור קלאסי', price: '₪90', stars: 5, color: '#EDE9FE' },
                  ].map((card, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.6 + i * 0.15 }}
                      className="rounded-2xl p-3 mb-2 flex items-center gap-3"
                      style={{ backgroundColor: card.color }}
                    >
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center text-lg">
                        💅
                      </div>
                      <div className="flex-1 text-right">
                        <p className="font-bold text-sm text-gray-800">{card.name}</p>
                        <p className="text-xs text-gray-400">{card.service}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-black text-sm text-pink-600">{card.price}</p>
                        <div className="flex">
                          {[...Array(card.stars)].map((_, j) => (
                            <Star key={j} className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>

              {/* Floating badge */}
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
                className="absolute -bottom-4 -right-8 glass rounded-2xl px-4 py-3 shadow-lg"
              >
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-green-100 flex items-center justify-center text-lg">✅</div>
                  <div>
                    <p className="font-black text-xs text-gray-800">תור אושר!</p>
                    <p className="text-xs text-gray-400">יום שלישי, 14:00</p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
                className="absolute -top-4 -left-8 glass rounded-2xl px-4 py-3 shadow-lg"
              >
                <div className="flex items-center gap-2">
                  <div className="text-2xl">⭐</div>
                  <div>
                    <p className="font-black text-xs text-gray-800">חוות דעת חדשה</p>
                    <p className="text-xs text-pink-500">״מקסימה! ממליצה בחום״</p>
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
