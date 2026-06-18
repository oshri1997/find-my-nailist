import Link from 'next/link'
import { MapPin } from 'lucide-react'

export function Footer() {
  return (
    <footer className="border-t bg-white">
      <div className="container mx-auto max-w-7xl px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <Link href="/" className="inline-flex items-center gap-2 font-bold text-xl text-primary mb-3">
              <MapPin className="h-5 w-5" />
              Find My Nailist
            </Link>
            <p className="text-sm text-muted-foreground max-w-xs">
              Connecting clients with talented nail technicians in their area.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-3">For Clients</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/search" className="hover:text-foreground">Find Nailists</Link></li>
              <li><Link href="/register?role=client" className="hover:text-foreground">Sign Up</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-3">For Nailists</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/register?role=nailist" className="hover:text-foreground">List Your Business</Link></li>
              <li><Link href="/dashboard/nailist" className="hover:text-foreground">Dashboard</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-8 pt-8 border-t text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} Find My Nailist. All rights reserved.
        </div>
      </div>
    </footer>
  )
}
