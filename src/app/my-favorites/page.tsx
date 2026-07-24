'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Footer } from '@/components/layout/footer'
import { Button } from '@/components/ui/button'
import { MapPin, Star, Heart, Search } from 'lucide-react'
import { useAuth } from '@/components/auth/auth-provider'

interface FavoriteNailist {
  id: string
  businessName: string
  city?: string | null
  bio?: string | null
  avgRating: number
  reviewCount: number
  coverPhotoUrl?: string | null
  photoUrl?: string | null
  whatsappPhone?: string | null
}

function CardSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl overflow-hidden bg-card shadow-sm border border-border">
      <div className="h-44 bg-muted" />
      <div className="p-5 space-y-3">
        <div className="h-4 bg-muted rounded w-2/3" />
        <div className="h-3 bg-muted rounded w-1/3" />
        <div className="h-3 bg-muted rounded w-1/2" />
      </div>
    </div>
  )
}

export default function MyFavoritesPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [nailists, setNailists] = useState<FavoriteNailist[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.replace('/login?redirect=/my-favorites')
      return
    }
    fetch('/api/favorites')
      .then(r => r.json())
      .then(json => setNailists(json.data ?? []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [user, authLoading, router])

  function initials(name: string) {
    return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  }

  return (
    <div className="min-h-screen flex flex-col bg-muted/40" dir="rtl">
      <div className="container mx-auto max-w-5xl px-4 py-10 flex-1">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-2xl bg-primary/15 dark:bg-primary/20 flex items-center justify-center">
            <Heart className="h-5 w-5 fill-primary text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-foreground">המועדפות שלי</h1>
            <p className="text-sm text-muted-foreground">נייליסטיות ששמרת</p>
          </div>
        </div>

        {loading || authLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} />)}
          </div>
        ) : nailists.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
            <div className="w-16 h-16 rounded-full bg-primary/15 dark:bg-primary/20 flex items-center justify-center">
              <Heart className="h-8 w-8 text-primary" />
            </div>
            <p className="text-xl font-black text-foreground">עוד אין מועדפות</p>
            <p className="text-muted-foreground text-sm max-w-xs">
              לחצי על הלב בפרופיל של נייליסטית כדי לשמור אותה כאן
            </p>
            <Link href="/search">
              <Button className="mt-2 bg-primary text-white rounded-2xl font-bold gap-2">
                <Search className="h-4 w-4" />
                חפשי נייליסטיות
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {nailists.map((n, i) => (
              <motion.div
                key={n.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
              >
                <Link href={`/nailists/${n.id}`} className="group block rounded-2xl overflow-hidden bg-card border border-border shadow-[0_2px_12px_rgba(0,0,0,0.06)] hover:shadow-[0_4px_24px_rgba(245,23,92,0.12)] transition-shadow">
                  {/* Cover */}
                  <div className={`relative h-44 overflow-hidden ${!n.coverPhotoUrl ? 'bg-gradient-to-br from-primary via-primary/70 to-primary/50' : ''}`}>
                    {n.coverPhotoUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        loading="lazy"
                        src={n.coverPhotoUrl}
                        alt={n.businessName}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    )}
                    {/* Avatar */}
                    <div className="absolute bottom-3 right-3 w-12 h-12 rounded-xl bg-white/20 backdrop-blur overflow-hidden border-2 border-white/40 flex items-center justify-center">
                      {n.photoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={n.photoUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-white font-black text-sm">{initials(n.businessName)}</span>
                      )}
                    </div>
                    {/* Saved badge */}
                    <div className="absolute top-3 left-3 bg-white/90 dark:bg-card/90 backdrop-blur rounded-full p-1.5 shadow-sm">
                      <Heart className="h-3.5 w-3.5 fill-primary text-primary" />
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-4">
                    <h2 className="font-black text-base text-foreground truncate">{n.businessName}</h2>
                    {n.city && (
                      <div className="flex items-center gap-1 text-muted-foreground text-xs mt-1">
                        <MapPin className="h-3 w-3" />
                        {n.city}
                      </div>
                    )}
                    {n.avgRating > 0 && (
                      <div className="flex items-center gap-1 text-xs mt-1.5">
                        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                        <span className="font-bold">{n.avgRating.toFixed(1)}</span>
                        <span className="text-muted-foreground">({n.reviewCount})</span>
                      </div>
                    )}
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <Footer />
    </div>
  )
}
