'use client'

import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { LayoutDashboard, Calendar, Scissors, Image as ImageIcon, Settings, Star, Clock, LogOut, Loader2, Menu, X, Search } from 'lucide-react'
import NextImage from 'next/image'
import { useAuth } from '@/components/auth/auth-provider'

const primaryNavLinks = [
  { href: '/dashboard/nailist', label: 'סקירה', Icon: LayoutDashboard },
  { href: '/dashboard/nailist/appointments', label: 'תורים', Icon: Calendar },
  { href: '/dashboard/nailist/services', label: 'שירותים', Icon: Scissors },
  { href: '/dashboard/nailist/settings', label: 'הגדרות', Icon: Settings },
]

const secondaryNavLinks = [
  { href: '/dashboard/nailist/hours', label: 'שעות פעילות', Icon: Clock },
  { href: '/dashboard/nailist/portfolio', label: 'פורטפוליו', Icon: ImageIcon },
  { href: '/dashboard/nailist/reviews', label: 'ביקורות', Icon: Star },
]

const allNavLinks = [...primaryNavLinks, ...secondaryNavLinks]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { user, signOut } = useAuth()
  const router = useRouter()
  const [authorized, setAuthorized] = useState<boolean | null>(null)
  const [showMoreSheet, setShowMoreSheet] = useState(false)

  useEffect(() => {
    if (!user) { router.replace('/login'); return }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000)

    fetch('/api/me/role', { signal: controller.signal })
      .then(r => r.json())
      .then(({ role }) => {
        clearTimeout(timeout)
        if (role === 'NAILIST') {
          setAuthorized(true)
        } else {
          router.replace('/search')
        }
      })
      .catch(() => {
        clearTimeout(timeout)
        router.replace('/login')
      })

    return () => { clearTimeout(timeout); controller.abort() }
  }, [user, router])

  const displayName = user?.displayName?.split(' ')[0] ?? user?.email?.split('@')[0] ?? 'נייליסטית'

  function handleSignOut() {
    router.push('/')
    signOut().catch(console.error)
  }

  const secondaryActive = secondaryNavLinks.some(l => pathname === l.href)

  if (authorized === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-pink-400" />
      </div>
    )
  }

  if (!authorized) return null

  return (
    <div className="min-h-screen bg-background">

      {/* Mobile header */}
      <header className="md:hidden sticky top-0 z-40 bg-card border-b border-border shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
        <div className="flex items-center justify-between px-4 h-14">
          <Link href="/" className="flex items-center gap-2 group">
            <NextImage src="/logo.png" alt="נייליסטיות לוגו" width={36} height={36} className="group-hover:scale-105 transition-transform" />
            <span className="font-black text-base gradient-text">נייליסטיות</span>
          </Link>

          <div className="flex items-center gap-2">
            {user?.photoURL ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.photoURL} alt={displayName} className="w-8 h-8 rounded-full object-cover ring-2 ring-primary/30" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-xs font-black">
                {displayName[0].toUpperCase()}
              </div>
            )}
            <span className="text-sm font-bold text-foreground max-w-[90px] truncate">{displayName}</span>
          </div>
        </div>
      </header>

      <div className="flex min-h-[calc(100vh-56px)] md:min-h-screen">

        {/* Desktop sidebar */}
        <motion.aside
          initial={{ x: 60, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="hidden md:flex w-60 bg-card border-l border-border flex-col shrink-0 shadow-[1px_0_12px_rgba(0,0,0,0.04)]"
        >
          {/* Logo */}
          <div className="h-18 flex items-center px-5 border-b border-border py-5">
            <Link href="/" className="flex items-center gap-2 group">
              <NextImage src="/logo.png" alt="נייליסטיות לוגו" width={36} height={36} className="group-hover:scale-105 transition-transform" />
              <span className="font-black text-base gradient-text">נייליסטיות</span>
            </Link>
          </div>

          {/* Profile */}
          <div className="px-4 py-4 border-b border-border">
            <div className="flex items-center gap-3 bg-pink-50 dark:bg-pink-950/40 rounded-xl p-3">
              {user?.photoURL ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.photoURL} alt={displayName} className="w-9 h-9 rounded-lg object-cover" />
              ) : (
                <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center text-white font-black text-base">
                  {displayName[0].toUpperCase()}
                </div>
              )}
              <div>
                <p className="font-black text-sm text-foreground max-w-[110px] truncate">{displayName}</p>
                <p className="text-xs text-muted-foreground">נייליסטית</p>
              </div>
            </div>
          </div>

          {/* Nav links */}
          <nav className="flex-1 p-3 space-y-0.5">
            {allNavLinks.map((link, i) => {
              const isActive = pathname === link.href
              return (
                <motion.div
                  key={link.href}
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05 + i * 0.04 }}
                >
                  <Link
                    href={link.href}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                      isActive
                        ? 'bg-primary text-white shadow-[0_4px_12px_rgba(236,72,153,0.30)]'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    }`}
                  >
                    <link.Icon className="h-4 w-4 shrink-0" />
                    {link.label}
                  </Link>
                </motion.div>
              )
            })}
          </nav>

          {/* Bottom actions */}
          <div className="p-3 border-t border-border space-y-0.5">
            <Link
              href="/search"
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
            >
              <Search className="h-4 w-4" />
              חיפוש נייליסטיות
            </Link>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-semibold text-muted-foreground hover:text-destructive hover:bg-red-50 dark:hover:bg-red-950/30 transition-all cursor-pointer"
            >
              <LogOut className="h-4 w-4" />
              יציאה
            </button>
          </div>
        </motion.aside>

        {/* Main content */}
        <main className="flex-1 overflow-auto pb-20 md:pb-0">
          {children}
        </main>
      </div>

      {/* Mobile bottom tab bar — 4 primary + More */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-card border-t border-border shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
        <div className="flex items-stretch h-16">
          {primaryNavLinks.map((link) => {
            const isActive = pathname === link.href
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex-1 flex flex-col items-center justify-center gap-1 text-[10px] font-bold transition-colors relative ${
                  isActive ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                <link.Icon className={`h-5 w-5 transition-transform ${isActive ? 'scale-110' : ''}`} />
                <span>{link.label}</span>
                {isActive && (
                  <motion.div
                    layoutId="bottomTab"
                    className="absolute bottom-0 w-8 h-0.5 bg-primary rounded-full"
                  />
                )}
              </Link>
            )
          })}

          {/* More button */}
          <button
            onClick={() => setShowMoreSheet(v => !v)}
            className={`flex-1 flex flex-col items-center justify-center gap-1 text-[10px] font-bold transition-colors relative cursor-pointer ${
              secondaryActive ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            <Menu className="h-5 w-5" />
            <span>עוד</span>
            {secondaryActive && (
              <motion.div
                layoutId="bottomTab"
                className="absolute bottom-0 w-8 h-0.5 bg-primary rounded-full"
              />
            )}
          </button>
        </div>
      </nav>

      {/* More sheet */}
      <AnimatePresence>
        {showMoreSheet && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="md:hidden fixed inset-0 z-40 bg-black/30"
              onClick={() => setShowMoreSheet(false)}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="md:hidden fixed bottom-16 inset-x-0 z-50 bg-card rounded-t-2xl shadow-[0_-8px_40px_rgba(0,0,0,0.14)] px-4 pt-4 pb-6"
            >
              {/* Handle bar */}
              <div className="w-10 h-1 bg-border rounded-full mx-auto mb-4" />

              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-black text-foreground">עוד אפשרויות</p>
                <button onClick={() => setShowMoreSheet(false)} className="text-muted-foreground hover:text-foreground cursor-pointer">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-4">
                {secondaryNavLinks.map((link) => {
                  const isActive = pathname === link.href
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setShowMoreSheet(false)}
                      className={`flex flex-col items-center gap-2 py-4 rounded-2xl text-xs font-bold transition-colors ${
                        isActive
                          ? 'bg-primary/10 text-primary'
                          : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      <link.Icon className="h-5 w-5" />
                      {link.label}
                    </Link>
                  )
                })}
              </div>

              <div className="border-t border-border pt-3">
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-semibold text-destructive hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
                >
                  <LogOut className="h-4 w-4" />
                  יציאה מהחשבון
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  )
}
