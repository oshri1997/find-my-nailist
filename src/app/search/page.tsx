import { Navbar } from '@/components/layout/navbar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { MapPin, Search, Star, Clock, Filter } from 'lucide-react'

const MOCK_NAILISTS = [
  { id: '1', businessName: 'Luxe Nails by Sofia', city: 'New York', avgRating: 4.9, reviewCount: 127, distanceKm: 0.8, services: ['Gel Polish', 'Nail Art', 'Acrylics'], minPrice: 35 },
  { id: '2', businessName: 'Nail Studio by Emma', city: 'New York', avgRating: 4.7, reviewCount: 89, distanceKm: 1.2, services: ['Gel Polish', 'Manicure', 'Pedicure'], minPrice: 25 },
  { id: '3', businessName: 'Glamour Touch', city: 'New York', avgRating: 4.8, reviewCount: 203, distanceKm: 2.1, services: ['Nail Art', 'Extensions', 'Gel Polish'], minPrice: 45 },
]

export default function SearchPage() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      <div className="bg-white border-b py-6">
        <div className="container mx-auto max-w-7xl px-4">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Enter your location..." />
            </div>
            <div className="relative flex-1 hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Service (e.g., gel nails, nail art)" />
            </div>
            <Button className="gap-2">
              <Search className="h-4 w-4" /> Search
            </Button>
            <Button variant="outline" className="gap-2">
              <Filter className="h-4 w-4" /> Filters
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 container mx-auto max-w-7xl px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{MOCK_NAILISTS.length} nailists</span> found near you
          </p>
          <div className="flex gap-2">
            {['Distance', 'Rating', 'Price'].map((sort) => (
              <Button key={sort} variant="outline" size="sm" className="text-xs">{sort}</Button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {MOCK_NAILISTS.map((nailist) => (
            <Card key={nailist.id} className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer">
              <div className="h-48 bg-gradient-to-br from-pink-100 to-rose-100 flex items-center justify-center">
                <span className="text-5xl">💅</span>
              </div>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold">{nailist.businessName}</h3>
                  <div className="flex items-center gap-1 text-sm shrink-0">
                    <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                    <span className="font-medium">{nailist.avgRating}</span>
                    <span className="text-muted-foreground">({nailist.reviewCount})</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-sm text-muted-foreground mb-3">
                  <MapPin className="h-3 w-3" />
                  <span>{nailist.city}</span>
                  <span className="mx-1">·</span>
                  <Clock className="h-3 w-3" />
                  <span>{nailist.distanceKm} km away</span>
                </div>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {nailist.services.map((s) => (
                    <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                  ))}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    From <span className="font-semibold text-foreground">${nailist.minPrice}</span>
                  </span>
                  <Button size="sm">View Profile</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
