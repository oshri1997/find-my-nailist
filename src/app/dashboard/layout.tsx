'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import { Sparkles, LayoutDashboard, Calendar, Scissors, Image, Settings, Star, LogOut } from 'lucide-react'

const navLinks = [
  { href: '/dashboard/nailist', label: 'סקירה כללית', icon: LayoutDashboard, emoji: '📊' },
  { href: '/dashboard/nailist/appointments', label: 'תורים', icon: Calendar, emoji: '📅' },
  { href: '/dashboard/nailist/services', label: 'שירותים', icon: Scissors, emoji: '✂️' },
  { href: '/dashboard/nailist/portfolio', label: 'פורטפוליו', icon: Image, emoji: '🎨' },
  { href: '/dashboard/nailist/reviews', label: 'ביקורות', icon: Star, emoji: '⭐' },
  { href: '/dashboard/nailist/settings', label: 'הגדרות', icon: Settings, emoji: '⚙️' },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="min-h-screen flex bg-gray-50/50">
      {/* Sidebar */}
      <motion.aside
        initial={{ x: 80, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="w-64 bg-white border-l border-gray-100 flex flex-col shrink-0 shadow-sm"
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
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center text-xl shadow-sm">
              💅
            </div>
            <div>
              <p className="font-black text-sm text-gray-800">הפרופיל שלי</p>
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
          <Link
            href="/"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all"
          >
            <LogOut className="h-4 w-4" />
            יציאה
          </Link>
        </div>
      </motion.aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}
