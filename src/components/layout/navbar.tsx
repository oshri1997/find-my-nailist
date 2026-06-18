'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Sparkles } from 'lucide-react'
import { motion } from 'framer-motion'

export function Navbar() {
  return (
    <motion.nav
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className="sticky top-0 z-50 w-full"
    >
      <div className="mx-4 mt-3">
        <div className="glass rounded-2xl shadow-lg shadow-pink-100/50 border border-white/60 max-w-7xl mx-auto">
          <div className="flex h-16 items-center justify-between px-6">
            <Link href="/" className="flex items-center gap-2 font-black text-xl">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <span className="gradient-text">מצאי נייליסטית</span>
            </Link>

            <div className="hidden md:flex items-center gap-8 text-sm font-semibold">
              <Link href="/search" className="text-gray-500 hover:text-gray-900 transition-colors hover:scale-105 inline-block">
                חיפוש
              </Link>
              <Link href="/how-it-works" className="text-gray-500 hover:text-gray-900 transition-colors hover:scale-105 inline-block">
                איך זה עובד
              </Link>
            </div>

            <div className="flex items-center gap-3">
              <Link href="/login">
                <Button variant="ghost" size="sm" className="font-semibold text-gray-600 hover:text-gray-900">
                  התחברות
                </Button>
              </Link>
              <Link href="/register">
                <Button size="sm" className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 border-0 shadow-md shadow-pink-200 font-bold rounded-xl px-5">
                  הצטרפי עכשיו
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </motion.nav>
  )
}
