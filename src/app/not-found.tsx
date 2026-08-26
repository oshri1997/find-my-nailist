import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-6 text-center">
      <h1 className="gradient-text font-black text-[9rem] leading-none select-none">404</h1>
      <p className="text-muted-foreground text-base">הדף לא נמצא</p>
      <Link
        href="/"
        className="px-8 py-3 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors"
      >
        חזרה לדף הבית
      </Link>

      {/* Recovery links — for a person that missed the button above, and for
          an agent/crawler that landed on a dead link and needs somewhere
          machine-readable to look next. */}
      <nav aria-label="קישורים שימושיים" className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm text-muted-foreground mt-2">
        <Link href="/search" className="hover:text-primary transition-colors">חיפוש נייליסטיות</Link>
        <span aria-hidden="true">·</span>
        <Link href="/sitemap.xml" className="hover:text-primary transition-colors">מפת האתר</Link>
        <span aria-hidden="true">·</span>
        <Link href="/llms.txt" className="hover:text-primary transition-colors">llms.txt</Link>
      </nav>
    </div>
  )
}
