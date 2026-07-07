'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, Users, Scissors, Calendar, Star, LogOut, Shield, Menu, X, ArrowRight, Home, TrendingUp, History } from 'lucide-react'
import { useAuth } from '@/components/auth/auth-provider'

const NAV = [
  { href: '/admin', label: 'דשבורד', icon: LayoutDashboard, exact: true },
  { href: '/admin/users', label: 'משתמשים', icon: Users },
  { href: '/admin/nailists', label: 'נייליסטיות', icon: Scissors },
  { href: '/admin/appointments', label: 'הזמנות', icon: Calendar },
  { href: '/admin/reviews', label: 'ביקורות', icon: Star },
  { href: '/admin/analytics', label: 'אנלטיקה', icon: TrendingUp },
  { href: '/admin/audit-log', label: 'יומן פעולות', icon: History },
]

function NavLinks({ pathname, onNav }: { pathname: string; onNav?: () => void }) {
  return (
    <>
      {NAV.map(({ href, label, icon: Icon, exact }) => {
        const active = exact ? pathname === href : pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            onClick={onNav}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              active
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            {label}
          </Link>
        )
      })}
    </>
  )
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, isAdmin, signOut } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [drawerOpen, setDrawerOpen] = useState(false)

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      router.replace('/')
    }
  }, [user, isAdmin, loading, router])

  // Close drawer on route change
  useEffect(() => {
    async function close() { setDrawerOpen(false) }
    void close()
  }, [pathname])

  if (loading || !user || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Mobile header */}
      <header className="md:hidden sticky top-0 z-40 flex items-center justify-between px-4 h-14 bg-card border-b border-border">
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.back()}
            className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted transition-colors"
            title="חזרה"
          >
            <ArrowRight className="w-4 h-4" />
          </button>
          <Link
            href="/"
            className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted transition-colors"
            title="דף הבית"
          >
            <Home className="w-4 h-4" />
          </Link>
          <Shield className="w-4 h-4 text-primary" />
          <span className="font-black text-foreground text-sm">אדמין פאנל</span>
        </div>
        <button
          onClick={() => setDrawerOpen(true)}
          className="p-2 rounded-lg text-muted-foreground hover:bg-muted transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
      </header>

      {/* Mobile drawer overlay */}
      {drawerOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-50"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <div className={`md:hidden fixed top-0 right-0 h-full w-64 bg-card border-l border-border z-50 flex flex-col transition-transform duration-300 ${drawerOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" />
            <span className="font-black text-foreground text-sm">אדמין פאנל</span>
          </div>
          <button onClick={() => setDrawerOpen(false)} className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted">
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-muted-foreground px-4 py-2">{user.email}</p>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          <NavLinks pathname={pathname} onNav={() => setDrawerOpen(false)} />
        </nav>
        <div className="p-3 border-t border-border space-y-1">
          <button
            onClick={() => { setDrawerOpen(false); router.back() }}
            className="flex items-center gap-3 px-3 py-2.5 w-full rounded-xl text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <ArrowRight className="w-4 h-4" />
            חזרה
          </button>
          <Link
            href="/"
            onClick={() => setDrawerOpen(false)}
            className="flex items-center gap-3 px-3 py-2.5 w-full rounded-xl text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <Home className="w-4 h-4" />
            דף הבית
          </Link>
          <button
            onClick={() => signOut()}
            className="flex items-center gap-3 px-3 py-2.5 w-full rounded-xl text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
          >
            <LogOut className="w-4 h-4" />
            התנתק
          </button>
        </div>
      </div>

      {/* Desktop layout */}
      <div className="md:flex min-h-screen">
        {/* Desktop sidebar */}
        <aside className="hidden md:flex w-60 flex-shrink-0 flex-col bg-card border-l border-border min-h-screen sticky top-0 h-screen">
          <div className="p-6 border-b border-border">
            <div className="flex items-center gap-2 mb-1">
              <Shield className="w-5 h-5 text-primary" />
              <span className="font-black text-foreground">אדמין פאנל</span>
            </div>
            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
          </div>
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            <NavLinks pathname={pathname} />
          </nav>
          <div className="p-4 border-t border-border space-y-1">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-3 px-3 py-2.5 w-full rounded-xl text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <ArrowRight className="w-4 h-4" />
              חזרה
            </button>
            <Link
              href="/"
              className="flex items-center gap-3 px-3 py-2.5 w-full rounded-xl text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <Home className="w-4 h-4" />
              דף הבית
            </Link>
            <button
              onClick={() => signOut()}
              className="flex items-center gap-3 px-3 py-2.5 w-full rounded-xl text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
            >
              <LogOut className="w-4 h-4" />
              התנתק
            </button>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
