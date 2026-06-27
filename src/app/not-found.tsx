import Link from 'next/link'
import { Navbar } from '@/components/layout/navbar'
import { Footer } from '@/components/layout/footer'

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden">
      <Navbar />

      <main className="flex-1 flex items-center justify-center relative py-20">
        {/* Mesh background */}
        <div className="bg-mesh absolute inset-0 pointer-events-none" />

        {/* Decorative blobs */}
        <div className="absolute top-1/4 right-1/4 w-72 h-72 rounded-full bg-pink-200/30 dark:bg-pink-900/20 blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 left-1/4 w-56 h-56 rounded-full bg-purple-200/30 dark:bg-purple-900/20 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-lg mx-auto">
          {/* Floating nail emoji */}
          <div className="float mb-6 text-7xl select-none">💅</div>

          {/* 404 heading */}
          <h1 className="gradient-text font-black text-[8rem] leading-none mb-2 select-none">
            404
          </h1>

          {/* Sub-heading */}
          <h2 className="text-2xl font-bold text-foreground mb-3">
            אופס! הדף הזה לא קיים
          </h2>

          <p className="text-muted-foreground text-base leading-relaxed mb-10">
            נראה שהקישור שבחרת לא קיים, הוסר, או שהוקלדה כתובת שגויה.
            <br />
            בואי נחזיר אותך למקום הנכון ✨
          </p>

          {/* CTA buttons */}
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 px-8 py-3 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm shadow-[0_2px_16px_rgba(236,72,153,0.35)] hover:bg-primary/90 hover:shadow-[0_4px_24px_rgba(236,72,153,0.45)] transition-all duration-200"
            >
              חזרה לדף הבית
            </Link>
            <Link
              href="/search"
              className="inline-flex items-center justify-center gap-2 px-8 py-3 rounded-2xl border border-border bg-card text-foreground font-semibold text-sm hover:border-primary/40 hover:text-primary transition-all duration-200"
            >
              חיפוש נייליסטיות
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
