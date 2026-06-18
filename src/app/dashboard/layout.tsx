import Link from 'next/link'
import { MapPin, LayoutDashboard, Calendar, Scissors, Image, Settings, Star } from 'lucide-react'

const navLinks = [
  { href: '/dashboard/nailist', label: 'Overview', icon: LayoutDashboard },
  { href: '/dashboard/nailist/appointments', label: 'Appointments', icon: Calendar },
  { href: '/dashboard/nailist/services', label: 'Services', icon: Scissors },
  { href: '/dashboard/nailist/portfolio', label: 'Portfolio', icon: Image },
  { href: '/dashboard/nailist/reviews', label: 'Reviews', icon: Star },
  { href: '/dashboard/nailist/settings', label: 'Settings', icon: Settings },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex">
      <aside className="w-64 bg-white border-r flex flex-col shrink-0">
        <div className="h-16 flex items-center px-6 border-b">
          <Link href="/" className="flex items-center gap-2 font-bold text-primary">
            <MapPin className="h-5 w-5" />
            Find My Nailist
          </Link>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-gray-50 transition-colors"
            >
              <link.icon className="h-4 w-4" />
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t">
          <Link
            href="/"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-gray-50 transition-colors"
          >
            Sign Out
          </Link>
        </div>
      </aside>
      <main className="flex-1 overflow-auto bg-gray-50">{children}</main>
    </div>
  )
}
