'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { Navbar } from '@/components/layout/navbar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { MapPin, Search, Star, Heart, MessageCircle, Loader2, LocateFixed, Map as MapIcon, LayoutGrid, Sparkles } from 'lucide-react'
import { toWhatsAppUrl, whatsAppBookingMessage } from '@/lib/whatsapp'
import { formatDistance } from '@/lib/format-utils'
import Link from 'next/link'
import dynamic from 'next/dynamic'

const NailistMap = dynamic(() => import('@/components/search/NailistMap'), { ssr: false })

function NailistCardSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl overflow-hidden bg-card shadow-[0_2px_12px_rgba(0,0,0,0.06)] border border-border">
      <div className="h-44 bg-muted" />
      <div className="p-5 space-y-3">
        <div className="flex items-start justify-between">
          <div className="h-4 bg-muted rounded w-2/3" />
          <div className="h-5 w-12 bg-muted rounded-lg shrink-0 ml-2" />
        </div>
        <div className="h-3 bg-muted rounded w-1/3" />
        <div className="h-3 bg-muted rounded w-1/2" />
        <div className="flex justify-end pt-2 border-t border-border">
          <div className="h-8 w-20 bg-muted rounded-xl" />
        </div>
      </div>
    </div>
  )
}

interface Nailist {
  id: string
  businessName: string
  city?: string
  bio?: string
  avgRating: number
  reviewCount: number
  whatsappPhone?: string
  distanceKm?: number
  coverPhotoUrl?: string
}

type SortKey = 'distance' | 'rating'

const filterTags = ['הכל', "ג'ל", 'נייל ארט', 'אקריל', 'מניקור', 'פדיקור', 'אקסטנשן']

export default function SearchPage() {
  const router = useRouter()
  const [nailists, setNailists] = useState<Nailist[]>([])
  const [loading, setLoading] = useState(true)
  const [imagesReady, setImagesReady] = useState(false)
  // Skeleton count: remembered across fetches so the count matches reality
  const [skeletonCount, setSkeletonCount] = useState(() => {
    try { return Math.max(1, parseInt(localStorage.getItem('nailists-count') ?? '3', 10)) }
    catch { return 3 }
  })
  const [locating, setLocating] = useState(false)
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [locationLabel, setLocationLabel] = useState('')
  const [sortBy, setSortBy] = useState<SortKey>('rating')
  const [activeFilter, setActiveFilter] = useState('הכל')
  const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid')

  const fetchIdRef = useRef(0)

  const fetchNailists = useCallback(async (lat?: number, lng?: number) => {
    const myId = ++fetchIdRef.current
    setLoading(true)
    setImagesReady(false)
    try {
      const params = new URLSearchParams({ pageSize: '24' })
      if (lat != null && lng != null) {
        params.set('lat', String(lat))
        params.set('lng', String(lng))
        params.set('radius', '30')
      }
      const res = await fetch(`/api/nailists?${params}`)
      if (!res.ok) return
      const { data } = await res.json()
      if (myId !== fetchIdRef.current) return  // stale — a newer fetch is in flight
      setNailists(data)
      const count = Math.max(1, (data as Nailist[]).length)
      setSkeletonCount(count)
      try { localStorage.setItem('nailists-count', String(count)) } catch {}
    } finally {
      if (myId === fetchIdRef.current) setLoading(false)
    }
  }, [])

  // Pre-load all cover images; only show real cards once they're all ready
  useEffect(() => {
    if (loading) return
    const urls = nailists.map(n => n.coverPhotoUrl).filter(Boolean) as string[]
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (urls.length === 0) { setImagesReady(true); return }

    let settled = 0
    let cancelled = false

    function onSettle() {
      settled++
      if (!cancelled && settled === urls.length) setImagesReady(true)
    }

    const imgs = urls.map(url => {
      const img = new window.Image()
      img.onload = onSettle
      img.onerror = onSettle
      img.src = url
      return img
    })

    // Safety timeout — show cards after 2.5 s even if some images stall
    const timeout = setTimeout(() => { if (!cancelled) setImagesReady(true) }, 2500)

    return () => {
      cancelled = true
      clearTimeout(timeout)
      imgs.forEach(img => { img.onload = null; img.onerror = null })
    }
  }, [loading, nailists])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchNailists()
  }, [fetchNailists])

  function handleLocate() {
    if (!navigator.geolocation) return
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords
        setCoords({ lat: latitude, lng: longitude })
        setLocationLabel('המיקום שלי')
        setSortBy('distance')
        fetchNailists(latitude, longitude)
        setLocating(false)
      },
      () => setLocating(false)
    )
  }

  const sorted = [...nailists].sort((a, b) => {
    if (sortBy === 'distance' && a.distanceKm != null && b.distanceKm != null) {
      return a.distanceKm - b.distanceKm
    }
    return b.avgRating - a.avgRating
  })

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      {/* Search controls bar */}
      <div className="bg-card border-b border-border sticky top-16 z-30 shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
        <div className="container mx-auto max-w-7xl px-6 py-4">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
              <Input
                value={locationLabel}
                onChange={(e) => setLocationLabel(e.target.value)}
                className="pr-9 rounded-xl border-border focus:border-primary h-11 bg-card"
                placeholder="הכניסי מיקום..."
                readOnly={!!coords}
              />
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={handleLocate}
              disabled={locating}
              className="rounded-xl h-11 border-border gap-2 shrink-0 hover:border-primary/40 hover:bg-pink-50/50 hover:text-foreground cursor-pointer"
              title="השתמשי במיקום שלי"
            >
              {locating ? <Loader2 className="h-4 w-4 animate-spin" /> : <LocateFixed className="h-4 w-4 text-primary" />}
              <span className="hidden md:inline text-sm font-semibold">קרוב אלי</span>
            </Button>
            <Button
              onClick={() => fetchNailists(coords?.lat, coords?.lng)}
              className="bg-primary hover:bg-primary/90 text-white border-0 rounded-xl h-11 px-6 font-bold gap-2 shadow-[0_2px_12px_rgba(236,72,153,0.25)] cursor-pointer"
            >
              <Search className="h-4 w-4" />
              <span className="hidden md:inline">חפשי</span>
            </Button>
          </div>

          {/* Filter tags */}
          <div className="flex gap-2 mt-3 flex-wrap">
            {filterTags.map((tag) => (
              <button
                key={tag}
                onClick={() => setActiveFilter(tag)}
                className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-all cursor-pointer ${
                  activeFilter === tag
                    ? 'bg-primary text-white shadow-[0_2px_8px_rgba(236,72,153,0.25)]'
                    : 'bg-card border border-border text-muted-foreground hover:border-primary/40 hover:text-primary'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 container mx-auto max-w-7xl px-6 py-8">
        {/* Results header */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-muted-foreground font-medium text-sm">
            {loading || !imagesReady ? (
              <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin text-primary" /> מחפשת...</span>
            ) : (
              <>נמצאו <span className="font-black text-foreground">{sorted.length}</span> נייליסטיות</>
            )}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => {
                const next = viewMode === 'grid' ? 'map' : 'grid'
                setViewMode(next)
                if (next === 'map' && !coords && navigator.geolocation) {
                  setLocating(true)
                  navigator.geolocation.getCurrentPosition(
                    (pos) => {
                      const { latitude, longitude } = pos.coords
                      setCoords({ lat: latitude, lng: longitude })
                      setLocationLabel('המיקום שלי')
                      setSortBy('distance')
                      void fetchNailists(latitude, longitude)
                      setLocating(false)
                    },
                    () => setLocating(false)
                  )
                }
              }}
              className={`rounded-xl px-3 py-1.5 text-sm font-semibold border transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'map'
                  ? 'border-primary/40 text-primary bg-pink-50 dark:bg-pink-950/30'
                  : 'border-border text-muted-foreground hover:border-primary/30 hover:text-primary'
              }`}
            >
              {viewMode === 'grid' ? <MapIcon className="h-3.5 w-3.5" /> : <LayoutGrid className="h-3.5 w-3.5" />}
              {viewMode === 'grid' ? 'מפה' : 'רשת'}
            </button>
            {([['distance', 'מרחק'], ['rating', 'דירוג']] as [SortKey, string][]).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setSortBy(key)}
                disabled={key === 'distance' && !coords}
                className={`rounded-xl px-3 py-1.5 text-sm font-semibold border transition-all disabled:opacity-40 cursor-pointer ${
                  sortBy === key
                    ? 'border-primary/40 text-primary bg-pink-50 dark:bg-pink-950/30'
                    : 'border-border text-muted-foreground hover:border-primary/30 hover:text-primary'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Content area */}
        {loading || !imagesReady ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: loading ? skeletonCount : sorted.length }).map((_, i) => (
              <NailistCardSkeleton key={i} />
            ))}
          </div>
        ) : sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-5">
              <Search className="w-7 h-7 text-muted-foreground/60" />
            </div>
            <p className="font-black text-foreground/60 text-lg mb-2">לא נמצאו נייליסטיות</p>
            <p className="text-sm text-muted-foreground">נסי לחפש באזור אחר</p>
          </div>
        ) : viewMode === 'map' ? (
          <div className="h-[70vh] rounded-2xl overflow-hidden shadow-sm border border-border">
            <NailistMap nailists={sorted} center={coords ?? undefined} />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {sorted.map((nailist, i) => (
              <motion.div
                key={nailist.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: Math.min(i * 0.06, 0.4) }}
                whileHover={{ y: -3, transition: { duration: 0.2 } }}
                onClick={() => router.push(`/nailists/${nailist.id}`)}
                className="bg-card rounded-2xl overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.06)] hover:shadow-[0_8px_32px_rgba(236,72,153,0.12)] transition-all duration-300 cursor-pointer group border border-border hover:border-pink-200"
              >
                {/* Cover */}
                <div className="h-44 relative flex items-center justify-center overflow-hidden bg-pink-50">
                  {nailist.coverPhotoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={nailist.coverPhotoUrl}
                      alt={nailist.businessName}
                      className="w-full h-full object-cover"
                      style={{ opacity: 0, transition: 'opacity 0.4s' }}
                      onLoad={(e) => { e.currentTarget.style.opacity = '1' }}
                    />
                  ) : (
                    <div className="flex items-center justify-center w-full h-full">
                      <div className="w-16 h-16 rounded-2xl bg-card/80 flex items-center justify-center shadow-[0_2px_12px_rgba(236,72,153,0.12)]">
                        <Sparkles className="w-8 h-8 text-primary/60" />
                      </div>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent" />
                  <button
                    onClick={(e) => e.stopPropagation()}
                    className="absolute top-3 left-3 w-9 h-9 bg-card/80 rounded-full flex items-center justify-center hover:bg-card transition-colors shadow-sm cursor-pointer"
                  >
                    <Heart className="h-4 w-4 text-muted-foreground/60" />
                  </button>
                  {nailist.distanceKm != null && (
                    <div className="absolute top-3 right-3 bg-card/90 rounded-full px-3 py-1 text-foreground text-xs font-bold flex items-center gap-1 shadow-sm">
                      <MapPin className="h-3 w-3 text-primary" />
                      {formatDistance(nailist.distanceKm)}
                    </div>
                  )}
                  {nailist.whatsappPhone && (
                    <div className="absolute bottom-3 left-3">
                      <span className="bg-[#25D366]/90 text-white text-xs font-bold rounded-full px-2.5 py-1 flex items-center gap-1">
                        <MessageCircle className="h-3 w-3" />
                        WhatsApp
                      </span>
                    </div>
                  )}
                </div>

                {/* Card body */}
                <div className="p-5">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-black text-foreground text-base leading-tight">{nailist.businessName}</h3>
                    <div className="flex items-center gap-1 text-sm shrink-0 bg-amber-50 dark:bg-amber-950/30 rounded-lg px-2 py-0.5 ml-2 border border-amber-100 dark:border-amber-900/40">
                      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                      <span className="font-black text-amber-600 dark:text-amber-400 text-xs">{nailist.avgRating > 0 ? nailist.avgRating.toFixed(1) : '—'}</span>
                      {nailist.reviewCount > 0 && <span className="text-amber-400/60 text-xs">({nailist.reviewCount})</span>}
                    </div>
                  </div>

                  {nailist.city && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mb-3">
                      <MapPin className="h-3.5 w-3.5" />
                      <span>{nailist.city}</span>
                    </div>
                  )}

                  {nailist.bio && (
                    <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{nailist.bio}</p>
                  )}

                  <div className="flex items-center justify-end border-t border-border pt-4 gap-2">
                    {nailist.whatsappPhone && (
                      <a
                        href={toWhatsAppUrl(nailist.whatsappPhone, whatsAppBookingMessage(nailist.businessName))}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-1.5 bg-[#25D366] hover:bg-[#22c55e] text-white text-xs font-bold rounded-xl px-3 py-2 shadow-sm transition-colors cursor-pointer"
                      >
                        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-white">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                        </svg>
                        וואטסאפ
                      </a>
                    )}
                    <Link href={`/nailists/${nailist.id}`} onClick={(e) => e.stopPropagation()}>
                      <Button
                        size="sm"
                        className="bg-primary hover:bg-primary/90 text-white border-0 rounded-xl shadow-[0_2px_8px_rgba(236,72,153,0.25)] font-bold cursor-pointer"
                      >
                        לפרופיל
                      </Button>
                    </Link>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
