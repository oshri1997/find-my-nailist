'use client'

import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import Link from 'next/link'
import { Navbar } from '@/components/layout/navbar'
import { Footer } from '@/components/layout/footer'
import { Button } from '@/components/ui/button'
import { MapPin, Star, Calendar, Camera, Clock, CreditCard, ChevronDown } from 'lucide-react'
import { useState } from 'react'

/* ── DATA ── */

const clientSteps = [
  {
    step: '01',
    emoji: '📍',
    title: 'גלי נייליסטיות קרובות',
    desc: 'הפעילי מיקום וגלי מאות מומחיות ציפורניים באזורך — ממוינות לפי מרחק ודירוג.',
    color: 'from-pink-500 to-rose-500',
    bg: 'from-pink-50 to-rose-50 dark:from-pink-950/40 dark:to-rose-950/40',
    border: 'border-pink-100 dark:border-pink-900/50',
    icon: MapPin,
  },
  {
    step: '02',
    emoji: '✨',
    title: 'עיצובים וביקורות אמיתיות',
    desc: 'עיינו בפורטפוליו, קראו ביקורות של לקוחות אמיתיות והשוו מחירים — הכל במקום אחד.',
    color: 'from-purple-500 to-violet-500',
    bg: 'from-purple-50 to-violet-50 dark:from-purple-950/40 dark:to-violet-950/40',
    border: 'border-purple-100 dark:border-purple-900/50',
    icon: Star,
  },
  {
    step: '03',
    emoji: '🗓️',
    title: 'הזמיני תור בקליק',
    desc: 'בחרי שירות, תאריך ושעה — בלי שיחות טלפון ובלי המתנה. אישור מיידי למייל.',
    color: 'from-violet-500 to-blue-500',
    bg: 'from-violet-50 to-blue-50 dark:from-violet-950/40 dark:to-blue-950/40',
    border: 'border-violet-100 dark:border-violet-900/50',
    icon: Calendar,
  },
]

const nailistSteps = [
  {
    step: '01',
    emoji: '📝',
    title: 'פתחי פרופיל חינמי',
    desc: 'הרשמה תוך דקות — שם העסק, כתובת, שעות עבודה ותיאור קצר.',
    color: 'from-amber-500 to-orange-500',
    bg: 'from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/40',
    border: 'border-amber-100 dark:border-amber-900/50',
    icon: Star,
  },
  {
    step: '02',
    emoji: '🎨',
    title: 'העלי תמונות לפורטפוליו',
    desc: 'הציגי את העבודות שלך ובחרי תמונת רקע שמושכת לקוחות חדשות.',
    color: 'from-pink-500 to-rose-500',
    bg: 'from-pink-50 to-rose-50 dark:from-pink-950/40 dark:to-rose-950/40',
    border: 'border-pink-100 dark:border-pink-900/50',
    icon: Camera,
  },
  {
    step: '03',
    emoji: '✂️',
    title: 'הגדירי שירותים ומחירים',
    desc: 'הוסיפי את השירותים שאת מציעה, זמן ביצוע ומחיר — שקיפות מלאה ללקוחות.',
    color: 'from-purple-500 to-violet-500',
    bg: 'from-purple-50 to-violet-50 dark:from-purple-950/40 dark:to-violet-950/40',
    border: 'border-purple-100 dark:border-purple-900/50',
    icon: CreditCard,
  },
  {
    step: '04',
    emoji: '🚀',
    title: 'פרסמי ותתחילי לקבל תורים',
    desc: 'הפעילי את הפרופיל והתחילי להופיע בחיפוש. לקוחות מהאזור יוכלו למצוא אותך.',
    color: 'from-green-500 to-emerald-500',
    bg: 'from-green-50 to-emerald-50 dark:from-green-950/40 dark:to-emerald-950/40',
    border: 'border-green-100 dark:border-green-900/50',
    icon: Clock,
  },
]

const features = [
  { emoji: '🆓', title: 'חינמי לגמרי', desc: 'הרשמה ופרסום פרופיל ללא עלות' },
  { emoji: '📱', title: 'מותאם לנייד', desc: 'חוויה מושלמת בכל מכשיר' },
  { emoji: '🔒', title: 'מאובטח', desc: 'הנתונים שלך מוצפנים ומאובטחים' },
  { emoji: '⚡', title: 'הזמנה מהירה', desc: 'פחות מ-60 שניות מחיפוש לתור' },
  { emoji: '💬', title: 'WhatsApp', desc: 'תקשורת ישירה עם הנייליסטית' },
  { emoji: '⭐', title: 'ביקורות אמיתיות', desc: 'רק לקוחות שהשלימו תור יכולות להגיב' },
]

const faqs = [
  {
    q: 'כמה עולה להצטרף כנייליסטית?',
    a: 'ההצטרפות חינמית לחלוטין. אין דמי מנוי ואין עמלות על תורים.',
  },
  {
    q: 'האם צריך להיות מאושרת כדי להופיע בחיפוש?',
    a: 'לא. ברגע שאת פותחת פרופיל ומפעילה אותו, את מופיעה מיד בתוצאות החיפוש.',
  },
  {
    q: 'איך לקוחות יודעות שהתור אושר?',
    a: 'לאחר קביעת תור נשלח אישור במייל ללקוחה ולנייליסטית עם כל פרטי ההזמנה.',
  },
  {
    q: 'האם ניתן לקבוע תור ללא חשבון?',
    a: 'כדי לקבוע תור יש להתחבר — זה מבטיח שהנייליסטית יודעת מי מגיעה. ההרשמה חינמית ומהירה.',
  },
  {
    q: 'אפשר ליצור קשר ישיר עם הנייליסטית?',
    a: 'כן! אם הנייליסטית הוסיפה מספר WhatsApp, ניתן לשלוח לה הודעה ישירה מהפרופיל.',
  },
]

/* ── FAQ ITEM ── */

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border border-border rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-5 text-right hover:bg-muted transition-colors"
      >
        <span className="font-bold text-foreground text-sm">{q}</span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0 mr-3" />
        </motion.span>
      </button>
      <motion.div
        initial={false}
        animate={{ height: open ? 'auto' : 0, opacity: open ? 1 : 0 }}
        transition={{ duration: 0.25 }}
        className="overflow-hidden"
      >
        <p className="px-5 pb-5 text-sm text-muted-foreground leading-relaxed">{a}</p>
      </motion.div>
    </div>
  )
}

/* ── SECTION WRAPPER ── */

function Section({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-60px' })
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6 }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

/* ── PAGE ── */

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background overflow-x-hidden">
      <Navbar />

      {/* Hero */}
      <section className="relative py-20 md:py-28 overflow-hidden bg-background">
        <div className="absolute inset-0 bg-mesh opacity-40" />
        <motion.div
          animate={{ scale: [1, 1.15, 1], rotate: [0, 30, 0] }}
          transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
          className="absolute top-[-15%] right-[-10%] w-[500px] h-[500px] rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, hsl(326,100%,75%) 0%, transparent 70%)' }}
        />
        <motion.div
          animate={{ scale: [1.1, 1, 1.1], rotate: [20, 0, 20] }}
          transition={{ duration: 14, repeat: Infinity, ease: 'linear' }}
          className="absolute bottom-[-15%] left-[-10%] w-[400px] h-[400px] rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, hsl(271,91%,75%) 0%, transparent 70%)' }}
        />

        <div className="container mx-auto max-w-4xl px-6 text-center relative z-10">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="inline-flex items-center gap-2 bg-pink-50 text-pink-600 rounded-full px-5 py-2 text-sm font-bold mb-6 border border-pink-100">
              ✨ פשוט כמו 1, 2, 3
            </div>
            <h1 className="text-4xl md:text-6xl font-black text-foreground mb-5 leading-tight">
              איך <span className="gradient-text">נייליסטיות</span>
              <br />עובד?
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-xl mx-auto leading-relaxed">
              הפלטפורמה שמחברת לקוחות ונייליסטיות — בקלות, במהירות, וללא עמלות.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.6 }}
            className="flex flex-wrap items-center justify-center gap-3 mt-8"
          >
            <Link href="/search">
              <Button className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 border-0 rounded-2xl h-12 px-7 font-black shadow-lg shadow-pink-200">
                חפשי נייליסטית 💅
              </Button>
            </Link>
            <Link href="/login?tab=register">
              <Button variant="outline" className="rounded-2xl h-12 px-7 font-bold border-border hover:border-pink-300 hover:text-pink-600">
                הצטרפי כנייליסטית
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* For clients */}
      <section className="py-20 bg-background">
        <div className="container mx-auto max-w-6xl px-6">
          <Section className="text-center mb-14">
            <div className="inline-flex items-center gap-2 bg-pink-50 text-pink-600 rounded-full px-4 py-2 text-sm font-bold mb-4 border border-pink-100">
              🛍️ ללקוחות
            </div>
            <h2 className="text-3xl md:text-4xl font-black text-foreground">
              מחיפוש לתור — <span className="gradient-text">פחות מדקה</span>
            </h2>
          </Section>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
            <div className="hidden md:block absolute top-16 right-[calc(33%+2rem)] left-[calc(33%+2rem)] h-0.5 bg-gradient-to-l from-violet-200 via-purple-200 to-pink-200" />
            {clientSteps.map((step, i) => (
              <motion.div
                key={step.step}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.5, delay: i * 0.12 }}
                whileHover={{ y: -6, transition: { duration: 0.2 } }}
                className={`relative rounded-3xl border-2 ${step.border} bg-gradient-to-br ${step.bg} p-8`}
              >
                <div className="absolute top-5 left-5 text-5xl font-black opacity-10 text-gray-900 select-none">{step.step}</div>
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${step.color} flex items-center justify-center mb-5 shadow-lg text-2xl`}>
                  {step.emoji}
                </div>
                <h3 className="text-lg font-black text-foreground mb-2">{step.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{step.desc}</p>
              </motion.div>
            ))}
          </div>

          <Section className="mt-10 text-center">
            <Link href="/search">
              <Button className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 border-0 rounded-2xl h-11 px-8 font-bold shadow-md shadow-pink-200">
                חפשי נייליסטית עכשיו →
              </Button>
            </Link>
          </Section>
        </div>
      </section>

      {/* Divider */}
      <div className="h-px bg-gradient-to-r from-transparent via-pink-200 to-transparent mx-auto max-w-4xl" />

      {/* For nailists */}
      <section className="py-20 bg-background">
        <div className="container mx-auto max-w-6xl px-6">
          <Section className="text-center mb-14">
            <div className="inline-flex items-center gap-2 bg-purple-50 text-purple-600 rounded-full px-4 py-2 text-sm font-bold mb-4 border border-purple-100">
              💅 לנייליסטיות
            </div>
            <h2 className="text-3xl md:text-4xl font-black text-foreground">
              פתחי את העסק שלך — <span className="gradient-text">חינם לחלוטין</span>
            </h2>
          </Section>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {nailistSteps.map((step, i) => (
              <motion.div
                key={step.step}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                whileHover={{ y: -6, transition: { duration: 0.2 } }}
                className={`relative rounded-3xl border-2 ${step.border} bg-gradient-to-br ${step.bg} p-7`}
              >
                <div className="absolute top-4 left-4 text-4xl font-black opacity-10 text-gray-900 select-none">{step.step}</div>
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${step.color} flex items-center justify-center mb-4 shadow-md text-xl`}>
                  {step.emoji}
                </div>
                <h3 className="text-base font-black text-foreground mb-1.5">{step.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{step.desc}</p>
              </motion.div>
            ))}
          </div>

          <Section className="mt-10 text-center">
            <Link href="/login?tab=register">
              <Button className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 border-0 rounded-2xl h-11 px-8 font-bold shadow-md shadow-purple-200">
                הצטרפי כנייליסטית חינם →
              </Button>
            </Link>
          </Section>
        </div>
      </section>

      {/* Features grid */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto max-w-5xl px-6">
          <Section className="text-center mb-12">
            <h2 className="text-3xl font-black text-foreground mb-3">
              למה <span className="gradient-text">נייליסטיות?</span>
            </h2>
            <p className="text-muted-foreground font-medium">היתרונות שמבדילים אותנו</p>
          </Section>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.4, delay: i * 0.07 }}
                className="bg-card rounded-2xl border border-border p-5 shadow-sm hover:shadow-md hover:border-pink-100 transition-all"
              >
                <div className="text-2xl mb-2">{f.emoji}</div>
                <div className="font-black text-foreground text-sm mb-1">{f.title}</div>
                <div className="text-xs text-muted-foreground font-medium">{f.desc}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 bg-background">
        <div className="container mx-auto max-w-2xl px-6">
          <Section className="text-center mb-12">
            <h2 className="text-3xl font-black text-foreground mb-3">
              שאלות <span className="gradient-text">נפוצות</span>
            </h2>
            <p className="text-muted-foreground font-medium">כל מה שרציתם לדעת</p>
          </Section>

          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.4, delay: i * 0.07 }}
              >
                <FaqItem q={faq.q} a={faq.a} />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gradient-to-br from-pink-500 via-purple-600 to-violet-600 relative overflow-hidden">
        <motion.div
          animate={{ scale: [1, 1.2, 1], rotate: [0, 60, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
          className="absolute top-[-30%] right-[-10%] w-[400px] h-[400px] rounded-full opacity-20 bg-white"
        />
        <Section className="container mx-auto max-w-2xl px-6 text-center relative z-10">
          <div className="text-5xl mb-5">💅</div>
          <h2 className="text-3xl md:text-4xl font-black text-white mb-4">
            מוכנה להתחיל?
          </h2>
          <p className="text-white/75 mb-8 text-lg font-medium">
            הצטרפי לאלפי נייליסטיות ולקוחות ברחבי ישראל
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link href="/search">
              <Button className="bg-white text-pink-600 hover:bg-pink-50 border-0 rounded-2xl h-12 px-8 font-black shadow-lg">
                חפשי נייליסטית 🔍
              </Button>
            </Link>
            <Link href="/login?tab=register">
              <Button className="bg-white/20 hover:bg-white/30 text-white border border-white/30 rounded-2xl h-12 px-8 font-bold backdrop-blur">
                הצטרפי חינם
              </Button>
            </Link>
          </div>
        </Section>
      </section>

      <Footer />
    </div>
  )
}
