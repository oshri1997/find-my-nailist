'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { LogOut, LayoutDashboard, ChevronDown, CalendarDays, Shield, Heart } from 'lucide-react'
import { motion } from 'framer-motion'
import { useAuth } from '@/components/auth/auth-provider'
import { ThemeToggle } from '@/components/theme-toggle'

export function Navbar() {
  const { user, role, signOut } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [showMenu, setShowMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!showMenu) return
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showMenu])

  async function handleSignOut() {
    setShowMenu(false)
    await signOut()
    router.push('/')
  }

  const displayName = user?.displayName?.split(' ')[0] ?? user?.email?.split('@')[0] ?? ''

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="sticky top-0 z-50 w-full bg-card/95 backdrop-blur-sm border-b border-border shadow-[0_1px_12px_rgba(236,72,153,0.06)]"
    >
      <div className="container mx-auto max-w-7xl px-6">
        <div className="flex h-16 items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 md:gap-2.5 font-black text-xl group"
          >
            <Image
              src="/logo.png"
              alt="נייליסטיות לוגו"
              width={52}
              height={52}
              className="w-9 h-9 md:w-[52px] md:h-[52px] group-hover:scale-105 transition-transform drop-shadow-sm"
            />
            <span className="hidden sm:inline gradient-text">נייליסטיות</span>
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
            <ThemeToggle />
            {user ? (
              <>
                {role === 'NAILIST' && (
                  <Link href="/dashboard/nailist">
                    <Button size="sm" variant="ghost" className="font-semibold text-muted-foreground hover:text-foreground gap-2 cursor-pointer">
                      <LayoutDashboard className="h-4 w-4" />
                      <span className="hidden sm:inline">דשבורד</span>
                    </Button>
                  </Link>
                )}
                {role === 'CLIENT' && (
                  <>
                    <Link href="/my-appointments">
                      <Button size="sm" variant="ghost" className="font-semibold text-muted-foreground hover:text-foreground gap-2 cursor-pointer">
                        <CalendarDays className="h-4 w-4" />
                        <span className="hidden sm:inline">התורים שלי</span>
                      </Button>
                    </Link>
                    <Link href="/my-favorites">
                      <Button size="sm" variant="ghost" className="font-semibold text-muted-foreground hover:text-foreground gap-2 cursor-pointer">
                        <Heart className="h-4 w-4" />
                        <span className="hidden sm:inline">מועדפות</span>
                      </Button>
                    </Link>
                  </>
                )}

                {/* Profile dropdown */}
                <div ref={menuRef} className="relative">
                  <button
                    onClick={() => setShowMenu(v => !v)}
                    className="flex items-center gap-2 hover:bg-muted/60 px-2 py-1.5 rounded-xl transition-colors cursor-pointer"
                  >
                    {user.photoURL ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={user.photoURL}
                        alt={displayName}
                        className="w-8 h-8 rounded-full object-cover ring-2 ring-primary/30"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-xs font-black">
                        {displayName[0]?.toUpperCase() ?? '?'}
                      </div>
                    )}
                    <span className="hidden sm:block max-w-[100px] truncate text-sm font-semibold text-foreground/80">
                      {displayName}
                    </span>
                    <ChevronDown className={`hidden sm:block h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 ${showMenu ? 'rotate-180' : ''}`} />
                  </button>

                  {showMenu && (
                    <div className="absolute top-full mt-2 end-0 w-52 bg-card rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.12)] border border-border p-1 z-50">
                      <div className="px-3 py-2.5 border-b border-border mb-1">
                        <p className="text-sm font-bold text-foreground truncate">{displayName}</p>
                        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                      </div>
                      <Link
                        href="/my-favorites"
                        onClick={() => setShowMenu(false)}
                        className="flex items-center gap-2 w-full px-3 py-2 text-sm font-semibold text-foreground hover:bg-muted/60 rounded-lg transition-colors"
                      >
                        <Heart className="h-4 w-4 text-pink-500" />
                        המועדפות שלי
                      </Link>
                      {user.email === 'oshri19970@gmail.com' && (
                        <Link
                          href="/admin"
                          onClick={() => setShowMenu(false)}
                          className="flex items-center gap-2 w-full px-3 py-2 text-sm font-semibold text-primary hover:bg-primary/8 rounded-lg transition-colors"
                        >
                          <Shield className="h-4 w-4" />
                          פאנל ניהול
                        </Link>
                      )}
                      <button
                        onClick={handleSignOut}
                        className="flex items-center gap-2 w-full px-3 py-2 text-sm font-semibold text-destructive hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                      >
                        <LogOut className="h-4 w-4" />
                        התנתקי
                      </button>
                    </div>
                  )}
                </div>
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
