'use client'

import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { LayoutDashboard, Calendar, Scissors, Image as ImageIcon, Settings, Star, Clock, LogOut, Menu, X, Search, Eye, Shield, MessageCircleMore, Megaphone, CircleHelp, Home, UserCog, Heart } from 'lucide-react'
import NextImage from 'next/image'
import { useAuth } from '@/components/auth/auth-provider'
import { ThemeToggle } from '@/components/theme-toggle'
import { EmailVerificationBanner } from '@/components/layout/email-verification-banner'
import { FeedbackLauncher } from '@/components/feedback/FeedbackLauncher'
import { useNailistProfile } from '@/lib/hooks/use-nailist-profile'
import { TOUR_RESTART_EVENT, isTourRoute } from '@/lib/product-tour'

// `label` is the descriptive name used wherever there is room for it — the
// desktop sidebar and the mobile "more" sheet. `tabLabel` is the short form
// for the mobile bottom bar, where five items share the screen width and a
// long label would wrap or be cut off.
const primaryNavLinks = [
  { href: '/dashboard/nailist', label: 'תמונת מצב', tabLabel: 'תמונת מצב', Icon: LayoutDashboard, dynamic: false },
  { href: '/dashboard/nailist/appointments', label: 'התורים שלי', tabLabel: 'תורים', Icon: Calendar, dynamic: false },
  { href: '/dashboard/nailist/services', label: 'השירותים שלי', tabLabel: 'שירותים', Icon: Scissors, dynamic: false },
  { href: '/dashboard/nailist/settings', label: 'פרטי העסק', tabLabel: 'פרטי העסק', Icon: Settings, dynamic: false },
]

const secondaryNavLinks = [
  { href: '/dashboard/nailist/hours', label: 'שעות פעילות העסק', tabLabel: 'שעות', Icon: Clock, dynamic: false },
  { href: '/dashboard/nailist/portfolio', label: 'העבודות שלי', tabLabel: 'עבודות', Icon: ImageIcon, dynamic: false },
  { href: '/dashboard/nailist/reviews', label: 'ביקורות', tabLabel: 'ביקורות', Icon: Star, dynamic: false },
  { href: '/whats-new', label: 'מה חדש', tabLabel: 'מה חדש', Icon: Megaphone, dynamic: false },
  // href is resolved at render time from the caller's own nailist profile id — see resolveHref below
  { href: null as string | null, label: 'הפרופיל שלי', tabLabel: 'הפרופיל שלי', Icon: Eye, dynamic: true },
]

const allNavLinks = [...primaryNavLinks, ...secondaryNavLinks]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { user, loading: authLoading, role, isAdmin, displayName: resolvedDisplayName, signOut } = useAuth()
  const router = useRouter()
  const [showMoreSheet, setShowMoreSheet] = useState(false)
  const isNailist = !authLoading && !!user && role === 'NAILIST'
  const { data: nailistProfile } = useNailistProfile({ enabled: isNailist })
  const profileId = nailistProfile?.id ?? null
  const canRunTour = isTourRoute(role, pathname)

  useEffect(() => {
    if (authLoading) return
    if (!user) { router.replace('/login'); return }

    // AuthProvider resolves this role before it releases its only full-screen
    // loader. Reuse it so onboarding does not hand off to a second spinner.
    if (role !== 'NAILIST') {
      router.replace('/search')
    }
  }, [user, authLoading, role, router])

  // Dynamic entries (public profile link) resolve their href from profileId once it loads.
  function resolveHref(link: { href: string | null; dynamic: boolean }): string | null {
    return link.dynamic ? (profileId ? `/nailists/${profileId}` : null) : link.href
  }

  const displayName = (resolvedDisplayName || user?.displayName)?.split(' ')[0] ?? user?.email?.split('@')[0] ?? 'נייליסטית'

  function handleSignOut() {
    router.push('/')
    signOut().catch(console.error)
  }

  const secondaryActive = secondaryNavLinks.some(l => pathname === l.href)

  // AuthProvider owns the only full-screen loader. This short handoff frame
  // intentionally renders nothing instead of briefly showing a second one.
  if (!isNailist) return null

  return (
    <div className="min-h-screen bg-background">

      {/* Mobile header */}
      <header className="md:hidden sticky top-0 z-40 bg-card border-b border-border shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
        <div className="flex items-center justify-between px-4 h-14">
          <Link href="/" className="flex items-center gap-2 group">
            <NextImage src="/logo.svg" alt="נייליסטיות לוגו" width={36} height={36} />
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

      {/* ConditionalNavbar hides its own copy of this banner on every
          /dashboard route (the dashboard has its own header/sidebar) —
          without mounting it here too, a nailist never sees the "verify
          your email" notice at all, since her whole app lives under
          /dashboard/nailist. */}
      <EmailVerificationBanner />

      <div className="flex min-h-[calc(100vh-56px)] md:min-h-screen">

        {/* Desktop sidebar */}
        <motion.aside
          initial={{ x: 60, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.4 }}
          data-tour="nailist-sidebar"
          className="hidden md:flex w-60 bg-card border-l border-border flex-col shrink-0 shadow-[1px_0_12px_rgba(0,0,0,0.04)]"
        >
          {/* Logo */}
          <div className="h-18 flex items-center px-5 border-b border-border py-5">
            <Link href="/" className="flex items-center gap-2 group">
              <NextImage src="/logo.svg" alt="נייליסטיות לוגו" width={36} height={36} />
              <span className="font-black text-base gradient-text">נייליסטיות</span>
            </Link>
          </div>

          {/* Profile */}
          <div className="px-4 py-4 border-b border-border">
            <div className="flex items-center gap-3 bg-primary/10 dark:bg-primary/40 rounded-xl p-3">
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
              const href = resolveHref(link)
              const isActive = href !== null && pathname === href
              const pending = href === null
              return (
                <motion.div
                  key={link.label}
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05 + i * 0.04 }}
                >
                  <Link
                    data-tour={link.href === '/dashboard/nailist/appointments' ? 'nailist-nav-appointments' : link.href === '/dashboard/nailist/services' ? 'nailist-nav-services' : link.href === '/dashboard/nailist/settings' ? 'nailist-nav-settings' : link.href === '/dashboard/nailist/reviews' ? 'nailist-nav-reviews' : undefined}
                    href={pending ? '#' : href}
                    aria-disabled={pending}
                    onClick={pending ? (e) => e.preventDefault() : undefined}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                      pending
                        ? 'text-muted-foreground/40 cursor-not-allowed'
                        : isActive
                        ? 'bg-primary text-white shadow-[0_4px_12px_rgba(245,23,92,0.30)]'
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
              href="/"
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
            >
              <Home className="h-4 w-4" />
              דף הבית
            </Link>
            <Link
              href="/search"
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
            >
              <Search className="h-4 w-4" />
              חיפוש נייליסטיות
            </Link>
            <Link
              href="/settings"
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
            >
              <UserCog className="h-4 w-4" />
              הגדרות חשבון
            </Link>
            <Link
              href="/my-favorites"
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-semibold text-muted-foreground hover:text-primary hover:bg-primary/8 transition-all"
            >
              <Heart className="h-4 w-4" />
              המועדפות שלי
            </Link>
            <Link
              href="/my-feedback"
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-semibold text-muted-foreground hover:text-primary hover:bg-primary/8 transition-all"
            >
              <MessageCircleMore className="h-4 w-4" />
              הפניות שלי
            </Link>
            <FeedbackLauncher compact />
            {/* The tour walks through the overview page, so it is only offered
                there — from a sub-page the button had nothing to drive. */}
            {canRunTour && (
              <button
                type="button"
                onClick={() => window.dispatchEvent(new Event(TOUR_RESTART_EVENT))}
                className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-semibold text-muted-foreground hover:text-primary hover:bg-primary/8 transition-all"
              >
                <CircleHelp className="h-4 w-4" />
                סיור מודרך
              </button>
            )}
            {isAdmin && (
              <Link
                href="/admin"
                className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-semibold text-primary hover:bg-primary/8 transition-all"
              >
                <Shield className="h-4 w-4" />
                פאנל ניהול
              </Link>
            )}
            <div className="flex items-center justify-between px-3 py-2">
              <span className="text-sm font-semibold text-muted-foreground">מצב תצוגה</span>
              <ThemeToggle />
            </div>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-semibold text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all cursor-pointer"
            >
              <LogOut className="h-4 w-4" />
              יציאה מהחשבון
            </button>
          </div>
        </motion.aside>

        {/* Main content */}
        <main className="flex-1 overflow-auto pb-20 md:pb-0">
          {children}
        </main>
      </div>

      {/* Mobile bottom tab bar — 4 primary + More */}
      <nav data-tour="nailist-mobile-navigation" className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-card border-t border-border shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
        <div className="flex items-stretch h-16">
          {primaryNavLinks.map((link) => {
            const isActive = pathname === link.href
            return (
              <Link
                key={link.href}
                data-tour={link.href === '/dashboard/nailist/appointments' ? 'nailist-mobile-appointments' : link.href === '/dashboard/nailist/services' ? 'nailist-mobile-services' : link.href === '/dashboard/nailist/settings' ? 'nailist-mobile-settings' : undefined}
                href={link.href}
                className={`flex-1 flex flex-col items-center justify-center gap-1 text-[10px] font-bold transition-colors relative ${
                  isActive ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                <link.Icon className={`h-5 w-5 transition-transform ${isActive ? 'scale-110' : ''}`} />
                <span>{link.tabLabel}</span>
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

              <div className="grid grid-cols-2 gap-2 mb-4">
                {secondaryNavLinks.map((link) => {
                  const href = resolveHref(link)
                  const isActive = href !== null && pathname === href
                  const pending = href === null
                  return (
                    <Link
                      key={link.label}
                      href={pending ? '#' : href}
                      aria-disabled={pending}
                      onClick={pending ? (e) => e.preventDefault() : () => setShowMoreSheet(false)}
                      className={`flex flex-col items-center gap-2 py-4 rounded-2xl text-xs font-bold transition-colors ${
                        pending
                          ? 'bg-muted/30 text-muted-foreground/40 cursor-not-allowed'
                          : isActive
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

              <div className="border-t border-border pt-3 space-y-1">
                <Link
                  href="/"
                  onClick={() => setShowMoreSheet(false)}
                  className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  <Home className="h-4 w-4" />
                  דף הבית
                </Link>
                <Link
                  href="/search"
                  onClick={() => setShowMoreSheet(false)}
                  className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  <Search className="h-4 w-4" />
                  חיפוש נייליסטיות
                </Link>
                <Link
                  href="/settings"
                  onClick={() => setShowMoreSheet(false)}
                  className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  <UserCog className="h-4 w-4" />
                  הגדרות חשבון
                </Link>
                <Link
                  href="/my-favorites"
                  onClick={() => setShowMoreSheet(false)}
                  className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-semibold text-muted-foreground hover:text-primary hover:bg-primary/8 transition-colors"
                >
                  <Heart className="h-4 w-4" />
                  המועדפות שלי
                </Link>                <Link
                  href="/my-feedback"
                  onClick={() => setShowMoreSheet(false)}
                  className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-semibold text-muted-foreground hover:text-primary hover:bg-primary/8 transition-colors"
                >
                  <MessageCircleMore className="h-4 w-4" />
                  הפניות שלי
                </Link>
                {isAdmin && (
                  <Link
                    href="/admin"
                    onClick={() => setShowMoreSheet(false)}
                    className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-semibold text-primary hover:bg-primary/8 transition-colors"
                  >
                    <Shield className="h-4 w-4" />
                    פאנל ניהול
                  </Link>
                )}
                <FeedbackLauncher compact onClose={() => setShowMoreSheet(false)} className="px-4 py-3" />
                {canRunTour && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowMoreSheet(false)
                      window.dispatchEvent(new Event(TOUR_RESTART_EVENT))
                    }}
                    className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-semibold text-muted-foreground hover:text-primary hover:bg-primary/8 transition-colors"
                  >
                    <CircleHelp className="h-4 w-4" />
                    סיור מודרך
                  </button>
                )}
                <div className="flex items-center justify-between px-4 py-2.5 rounded-xl">
                  <span className="text-sm font-semibold text-muted-foreground">מצב תצוגה</span>
                  <ThemeToggle />
                </div>
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-semibold text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
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
