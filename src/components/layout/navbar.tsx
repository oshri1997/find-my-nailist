import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { MapPin } from 'lucide-react'

export function Navbar() {
  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="container flex h-16 items-center justify-between px-4 mx-auto max-w-7xl">
        <Link href="/" className="flex items-center gap-2 font-bold text-xl text-primary">
          <MapPin className="h-5 w-5" />
          Find My Nailist
        </Link>

        <div className="hidden md:flex items-center gap-6 text-sm font-medium">
          <Link href="/search" className="text-muted-foreground hover:text-foreground transition-colors">
            Find Nailists
          </Link>
          <Link href="/how-it-works" className="text-muted-foreground hover:text-foreground transition-colors">
            How It Works
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/login">
            <Button variant="ghost" size="sm">Sign In</Button>
          </Link>
          <Link href="/register">
            <Button size="sm">Get Started</Button>
          </Link>
        </div>
      </div>
    </nav>
  )
}
