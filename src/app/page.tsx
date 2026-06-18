import Link from 'next/link'
import { Navbar } from '@/components/layout/navbar'
import { Footer } from '@/components/layout/footer'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { MapPin, Search, Star, Calendar, Shield, Sparkles } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      {/* Hero */}
      <section className="relative bg-gradient-to-br from-pink-50 via-white to-rose-50 py-20 md:py-32">
        <div className="container mx-auto max-w-7xl px-4 text-center">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary rounded-full px-4 py-1.5 text-sm font-medium mb-6">
            <Sparkles className="h-4 w-4" />
            Find Nail Technicians Near You
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
            Your Perfect Nailist,{' '}
            <span className="text-primary">Just Around</span> the Corner
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
            Discover talented nail technicians nearby, browse their portfolios, compare prices, and book your appointment — all in one place.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/search">
              <Button size="lg" className="gap-2 text-base px-8">
                <Search className="h-5 w-5" /> Find Nailists Near Me
              </Button>
            </Link>
            <Link href="/register?role=nailist">
              <Button size="lg" variant="outline" className="gap-2 text-base px-8">
                List Your Business
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-white">
        <div className="container mx-auto max-w-7xl px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">How It Works</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">Book your perfect nail appointment in three simple steps</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: MapPin, title: 'Find Nearby Nailists', desc: 'Use your location to discover nail technicians in your area.', step: '01' },
              { icon: Star, title: 'Browse & Compare', desc: 'View portfolios, read reviews, and check prices.', step: '02' },
              { icon: Calendar, title: 'Book Instantly', desc: 'Pick your service, choose a time slot, and confirm.', step: '03' },
            ].map((item) => (
              <Card key={item.step} className="relative overflow-hidden border-0 shadow-md">
                <CardContent className="p-8">
                  <span className="absolute top-4 right-4 text-6xl font-bold text-primary/5">{item.step}</span>
                  <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-5">
                    <item.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                  <p className="text-muted-foreground">{item.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto max-w-7xl px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-6">Everything You Need for the Perfect Experience</h2>
              <div className="space-y-6">
                {[
                  { icon: Search, title: 'Smart Search', desc: 'Filter by location, service type, price range, and availability.' },
                  { icon: Star, title: 'Verified Reviews', desc: 'Real reviews from real clients.' },
                  { icon: Calendar, title: 'Easy Booking', desc: 'Book in seconds with real-time availability.' },
                  { icon: Shield, title: 'Secure & Trusted', desc: 'Verified nail technicians. Protected bookings.' },
                ].map((f) => (
                  <div key={f.title} className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                      <f.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-semibold mb-1">{f.title}</h4>
                      <p className="text-sm text-muted-foreground">{f.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-gradient-to-br from-primary/10 to-pink-100 rounded-2xl h-96 flex items-center justify-center">
              <div className="text-center">
                <Sparkles className="h-16 w-16 text-primary/30 mx-auto mb-4" />
                <p className="text-sm text-muted-foreground">App Preview Coming Soon</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-primary text-white">
        <div className="container mx-auto max-w-7xl px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Are You a Nail Technician?</h2>
          <p className="text-primary-foreground/80 max-w-xl mx-auto mb-8">
            Join nail technicians growing their business on Find My Nailist. Showcase your portfolio, manage bookings, and reach new clients.
          </p>
          <Link href="/register?role=nailist">
            <Button size="lg" variant="secondary" className="text-base px-8">
              Start Your Free Profile
            </Button>
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  )
}
