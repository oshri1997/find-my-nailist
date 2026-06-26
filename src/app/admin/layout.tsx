'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, Users, Scissors, Calendar, Star, LogOut, Shield } from 'lucide-react'
import { useAuth } from '@/components/auth/auth-provider'

const ADMIN_EMAIL = 'oshri19970@gmail.com'

const NAV = [
  { href: '/admin', label: 'דשבורד', icon: LayoutDashboard, exact: true },
  { href: '/admin/users', label: 'משתמשים', icon: Users },
  { href: '/admin/nailists', label: 'נייליסטיות', icon: Scissors },
  { href: '/admin/appointments', label: 'הזמנות', icon: Calendar },
  { href: '/admin/reviews', label: 'ביקורות', icon: Star },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, signOut } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!loading && (!user || user.email !== ADMIN_EMAIL)) {
      router.replace('/')
    }
  }, [user, loading, router])

  if (loading || !user || user.email !== ADMIN_EMAIL) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex bg-background" dir="rtl">
      {/* Sidebar */}
      <aside className="w-60 flex-shrink-0 bg-card border-l border-border flex flex-col">
        <div className="p-6 border-b border-border">
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-5 h-5 text-primary" />
            <span className="font-black text-foreground">אדמין פאנל</span>
          </div>
          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {NAV.map(({ href, label, icon: Icon, exact }) => {
            const active = exact ? pathname === href : pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
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
        </nav>

        <div className="p-4 border-t border-border">
          <button
            onClick={() => signOut()}
            className="flex items-center gap-3 px-3 py-2.5 w-full rounded-xl text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
          >
            <LogOut className="w-4 h-4" />
            התנתק
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
