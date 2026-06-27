import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6">
      <h1 className="gradient-text font-black text-[9rem] leading-none select-none">404</h1>
      <p className="text-muted-foreground text-base">הדף לא נמצא</p>
      <Link
        href="/"
        className="px-8 py-3 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors"
      >
        חזרה לדף הבית
      </Link>
    </div>
  )
}
