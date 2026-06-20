'use client'

import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Sparkles, LogOut, LayoutDashboard } from 'lucide-react'
import { motion } from 'framer-motion'
import { useAuth } from '@/components/auth/auth-provider'

export function Navbar() {
  const { user, loading, signOut } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  async function handleSignOut() {
    await signOut()
    router.push('/')
  }

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="sticky top-0 z-50 w-full bg-white/95 backdrop-blur-sm border-b border-border shadow-[0_1px_12px_rgba(236,72,153,0.06)]"
    >
      <div className="container mx-auto max-w-7xl px-6">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 font-black text-xl">
            <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center shadow-[0_2px_8px_rgba(236,72,153,0.35)]">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <span className="gradient-text">nailistiot</span>
          </Link>

          <div className="hidden md:flex items-center gap-8 text-sm font-semibold">
            {[
              { href: '/search', label: 'חיפוש' },
              { href: '/how-it-works', label: 'איך זה עובד' },
            ].map(({ href, label }) => {
              const active = pathname === href || pathname.startsWith(href + '/')
              return (
                <Link
                  key={href}
                  href={href}
                  className={`relative py-1 transition-colors duration-200 ${active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  {label}
                  {active && (
                    <motion.span
                      layoutId="nav-underline"
                      className="absolute inset-x-0 -bottom-[6px] h-0.5 rounded-full bg-primary"
                    />
                  )}
                </Link>
              )
            })}
          </div>

          <div className="flex items-center gap-3">
            {loading ? (
              <div className="h-9 w-24 rounded-xl bg-muted animate-pulse" />
            ) : user ? (
              <>
                <div className="hidden sm:flex items-center gap-2.5 text-sm font-semibold">
                  {user.photoURL ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={user.photoURL}
                      alt={user.displayName ?? ''}
                      className="w-8 h-8 rounded-full object-cover ring-2 ring-pink-100"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-xs font-black">
                      {(user.displayName ?? user.email ?? '?')[0].toUpperCase()}
                    </div>
                  )}
                  <span className="max-w-[120px] truncate text-foreground/80">
                    {user.displayName?.split(' ')[0] ?? user.email?.split('@')[0]}
                  </span>
                </div>
                <Link href="/dashboard/nailist">
                  <Button size="sm" variant="ghost" className="font-semibold text-muted-foreground hover:text-foreground gap-2 cursor-pointer">
                    <LayoutDashboard className="h-4 w-4" />
                    <span className="hidden sm:inline">דשבורד</span>
                  </Button>
                </Link>
                <Button
                  size="sm" variant="ghost" onClick={handleSignOut}
                  className="font-semibold text-muted-foreground hover:text-destructive gap-2 cursor-pointer"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline">התנתקי</span>
                </Button>
              </>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost" size="sm" className="font-semibold text-muted-foreground hover:text-foreground cursor-pointer">
                    התחברות
                  </Button>
                </Link>
                <Link href="/login?tab=register">
                  <Button
                    size="sm"
                    className="bg-primary hover:bg-primary/90 text-white border-0 shadow-[0_2px_12px_rgba(236,72,153,0.30)] font-bold rounded-xl px-5 cursor-pointer"
                  >
                    הצטרפי עכשיו
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </motion.nav>
  )
}
