'use client'

import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Sparkles, LayoutDashboard, Calendar, Scissors, Image, Settings, Star, Clock, LogOut, Loader2 } from 'lucide-react'
import { useAuth } from '@/components/auth/auth-provider'

const navLinks = [
  { href: '/dashboard/nailist', label: 'סקירה', Icon: LayoutDashboard },
  { href: '/dashboard/nailist/appointments', label: 'תורים', Icon: Calendar },
  { href: '/dashboard/nailist/services', label: 'שירותים', Icon: Scissors },
  { href: '/dashboard/nailist/hours', label: 'שעות', Icon: Clock },
  { href: '/dashboard/nailist/portfolio', label: 'פורטפוליו', Icon: Image },
  { href: '/dashboard/nailist/reviews', label: 'ביקורות', Icon: Star },
  { href: '/dashboard/nailist/settings', label: 'הגדרות', Icon: Settings },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { user, signOut, loading: authLoading } = useAuth()
  const router = useRouter()
  const [authorized, setAuthorized] = useState<boolean | null>(null)

  useEffect(() => {
    if (authLoading) return
    if (!user) { router.replace('/login'); return }

    fetch('/api/me/role')
      .then(r => r.json())
      .then(({ role }) => {
        if (role === 'NAILIST') {
          setAuthorized(true)
        } else {
          router.replace('/search')
        }
      })
      .catch(() => router.replace('/login'))
  }, [user, authLoading, router])

  const displayName = user?.displayName?.split(' ')[0] ?? user?.email?.split('@')[0] ?? 'נייליסטית'

  async function handleSignOut() {
    await signOut()
    router.push('/')
  }

  if (authLoading || authorized === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50/50">
        <Loader2 className="h-8 w-8 animate-spin text-pink-400" />
      </div>
    )
  }

  if (!authorized) return null

  return (
    <div className="min-h-screen bg-background">

      {/* Mobile header */}
      <header className="md:hidden sticky top-0 z-40 bg-white border-b border-border shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
        <div className="flex items-center justify-between px-4 h-14">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center shadow-[0_2px_8px_rgba(236,72,153,0.30)]">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <span className="font-black text-base gradient-text">נייליסטיות</span>
          </Link>

          <div className="flex items-center gap-2">
            {user?.photoURL ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.photoURL} alt={displayName} className="w-8 h-8 rounded-full object-cover ring-2 ring-pink-100" />
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
          className="hidden md:flex w-60 bg-white border-l border-border flex-col shrink-0 shadow-[1px_0_12px_rgba(0,0,0,0.04)]"
        >
          {/* Logo */}
          <div className="h-18 flex items-center px-5 border-b border-border py-5">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center shadow-[0_2px_8px_rgba(236,72,153,0.30)] group-hover:scale-105 transition-transform">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <span className="font-black text-base gradient-text">נייליסטיות</span>
            </Link>
          </div>

          {/* Profile */}
          <div className="px-4 py-4 border-b border-border">
            <div className="flex items-center gap-3 bg-pink-50 rounded-xl p-3">
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
            {navLinks.map((link, i) => {
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

          {/* Sign out */}
          <div className="p-3 border-t border-border">
            <button
              onClick={handleSignOut}
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-semibold text-muted-foreground hover:text-destructive hover:bg-red-50 transition-all cursor-pointer"
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

      {/* Mobile bottom tab bar */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-border shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
        <div className="flex items-stretch h-16">
          {navLinks.map((link) => {
            const isActive = pathname === link.href
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex-1 flex flex-col items-center justify-center gap-1 text-[10px] font-bold transition-colors ${
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
        </div>
      </nav>

    </div>
  )
}
