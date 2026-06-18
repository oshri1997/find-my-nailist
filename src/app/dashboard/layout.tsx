'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import { Sparkles, LayoutDashboard, Calendar, Scissors, Image, Settings, Star, Clock, LogOut } from 'lucide-react'
import { useAuth } from '@/components/auth/auth-provider'

const navLinks = [
  { href: '/dashboard/nailist', label: 'סקירה', icon: LayoutDashboard, emoji: '📊' },
  { href: '/dashboard/nailist/appointments', label: 'תורים', icon: Calendar, emoji: '📅' },
  { href: '/dashboard/nailist/services', label: 'שירותים', icon: Scissors, emoji: '✂️' },
  { href: '/dashboard/nailist/hours', label: 'שעות', icon: Clock, emoji: '⏰' },
  { href: '/dashboard/nailist/portfolio', label: 'פורטפוליו', icon: Image, emoji: '🎨' },
  { href: '/dashboard/nailist/reviews', label: 'ביקורות', icon: Star, emoji: '⭐' },
  { href: '/dashboard/nailist/settings', label: 'הגדרות', icon: Settings, emoji: '⚙️' },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { user, signOut } = useAuth()
  const router = useRouter()

  const displayName = user?.displayName?.split(' ')[0] ?? user?.email?.split('@')[0] ?? 'נייליסטית'

  async function handleSignOut() {
    await signOut()
    router.push('/')
  }

  return (
    <div className="min-h-screen bg-gray-50/50">

      {/* ── Mobile header (md and below) ─────────────────────────── */}
      <header className="md:hidden sticky top-0 z-40 bg-white border-b border-gray-100 shadow-sm">
        <div className="flex items-center justify-between px-4 h-14">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <span className="font-black text-base gradient-text">מצאי נייליסטית</span>
          </Link>

          <div className="flex items-center gap-2">
            {user?.photoURL ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.photoURL} alt={displayName} className="w-8 h-8 rounded-full object-cover" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-white text-xs font-black">
                {displayName[0].toUpperCase()}
              </div>
            )}
            <span className="text-sm font-bold text-gray-700 max-w-[90px] truncate">{displayName}</span>
          </div>
        </div>
      </header>

      <div className="flex min-h-[calc(100vh-56px)] md:min-h-screen">

        {/* ── Desktop sidebar (md and above) ───────────────────────── */}
        <motion.aside
          initial={{ x: 80, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="hidden md:flex w-64 bg-white border-l border-gray-100 flex-col shrink-0 shadow-sm"
        >
          {/* Logo */}
          <div className="h-20 flex items-center px-6 border-b border-gray-100">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center shadow-md shadow-pink-200 group-hover:scale-110 transition-transform">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <span className="font-black text-lg gradient-text">מצאי נייליסטית</span>
            </Link>
          </div>

          {/* Profile pill */}
          <div className="px-4 py-4 border-b border-gray-100">
            <div className="flex items-center gap-3 bg-gradient-to-r from-pink-50 to-purple-50 rounded-2xl p-3">
              {user?.photoURL ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.photoURL} alt={displayName} className="w-10 h-10 rounded-xl object-cover" />
              ) : (
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center text-white font-black text-lg">
                  {displayName[0].toUpperCase()}
                </div>
              )}
              <div>
                <p className="font-black text-sm text-gray-800 max-w-[120px] truncate">{displayName}</p>
                <p className="text-xs text-gray-400">נייליסטית</p>
              </div>
            </div>
          </div>

          {/* Nav */}
          <nav className="flex-1 p-4 space-y-1">
            {navLinks.map((link, i) => {
              const isActive = pathname === link.href
              return (
                <motion.div
                  key={link.href}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + i * 0.05 }}
                >
                  <Link
                    href={link.href}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                      isActive
                        ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-md shadow-pink-200'
                        : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
                    }`}
                  >
                    <span className="text-base">{link.emoji}</span>
                    {link.label}
                  </Link>
                </motion.div>
              )
            })}
          </nav>

          {/* Sign out */}
          <div className="p-4 border-t border-gray-100">
            <button
              onClick={handleSignOut}
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-semibold text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all"
            >
              <LogOut className="h-4 w-4" />
              יציאה
            </button>
          </div>
        </motion.aside>

        {/* ── Main content ──────────────────────────────────────────── */}
        <main className="flex-1 overflow-auto pb-20 md:pb-0">
          {children}
        </main>
      </div>

      {/* ── Mobile bottom tab bar ─────────────────────────────────── */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-gray-100 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
        <div className="flex items-stretch h-16">
          {navLinks.map((link) => {
            const isActive = pathname === link.href
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-bold transition-colors ${
                  isActive ? 'text-pink-600' : 'text-gray-400'
                }`}
              >
                <span className={`text-lg leading-none transition-transform ${isActive ? 'scale-110' : ''}`}>
                  {link.emoji}
                </span>
                <span>{link.label}</span>
                {isActive && (
                  <motion.div
                    layoutId="bottomTab"
                    className="absolute bottom-0 w-8 h-0.5 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full"
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
