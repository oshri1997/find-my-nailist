'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { Navbar } from '@/components/layout/navbar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { MapPin, Search, Star, SlidersHorizontal, Heart, MessageCircle, Loader2, LocateFixed, Map as MapIcon, LayoutGrid } from 'lucide-react'
import { toWhatsAppUrl, whatsAppBookingMessage } from '@/lib/whatsapp'
import Link from 'next/link'
import dynamic from 'next/dynamic'

const NailistMap = dynamic(() => import('@/components/search/NailistMap'), { ssr: false })

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

const GRADIENTS = [
  'from-pink-400 to-rose-500',
  'from-purple-400 to-violet-500',
  'from-violet-400 to-purple-500',
  'from-rose-400 to-pink-500',
  'from-indigo-400 to-blue-500',
  'from-amber-400 to-orange-500',
]
const EMOJIS = ['🌸', '✨', '💜', '💅', '🌙', '💎']

const filterTags = ['הכל', 'ג\'ל', 'נייל ארט', 'אקריל', 'מניקור', 'פדיקור', 'אקסטנשן']

export default function SearchPage() {
  const router = useRouter()
  const [nailists, setNailists] = useState<Nailist[]>([])
  const [loading, setLoading] = useState(true)
  const [locating, setLocating] = useState(false)
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [locationLabel, setLocationLabel] = useState('')
  const [sortBy, setSortBy] = useState<SortKey>('rating')
  const [activeFilter, setActiveFilter] = useState('הכל')
  const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid')

  const fetchNailists = useCallback(async (lat?: number, lng?: number) => {
    setLoading(true)
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
      setNailists(data)
    } finally {
      setLoading(false)
    }
  }, [])

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
    <div className="min-h-screen flex flex-col bg-gray-50/50">
      <Navbar />

      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-100 sticky top-20 z-30">
        <div className="container mx-auto max-w-7xl px-6 py-4">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-pink-400" />
              <Input
                value={locationLabel}
                onChange={(e) => setLocationLabel(e.target.value)}
                className="pr-9 rounded-xl border-gray-200 focus:border-pink-300 h-11"
                placeholder="הכניסי מיקום..."
                readOnly={!!coords}
              />
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={handleLocate}
              disabled={locating}
              className="rounded-xl h-11 border-gray-200 gap-2 shrink-0"
              title="השתמשי במיקום שלי"
            >
              {locating ? <Loader2 className="h-4 w-4 animate-spin" /> : <LocateFixed className="h-4 w-4 text-pink-500" />}
              <span className="hidden md:inline text-sm font-semibold">קרוב אלי</span>
            </Button>
            <Button
              onClick={() => fetchNailists(coords?.lat, coords?.lng)}
              className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 border-0 rounded-xl h-11 px-6 font-bold gap-2 shadow-md shadow-pink-200"
            >
              <Search className="h-4 w-4" />
              <span className="hidden md:inline">חפשי</span>
            </Button>
            <Button variant="outline" className="rounded-xl h-11 border-gray-200 gap-2 hidden md:flex">
              <SlidersHorizontal className="h-4 w-4" />
              סינון
            </Button>
          </div>

          <div className="flex gap-2 mt-3 flex-wrap">
            {filterTags.map((tag) => (
              <button
                key={tag}
                onClick={() => setActiveFilter(tag)}
                className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-all ${
                  activeFilter === tag
                    ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-sm'
                    : 'bg-white border border-gray-200 text-gray-500 hover:border-pink-300 hover:text-pink-500'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 container mx-auto max-w-7xl px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <p className="text-gray-500 font-medium">
            {loading ? (
              <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> מחפשת...</span>
            ) : (
              <>נמצאו <span className="font-black text-gray-800">{sorted.length}</span> נייליסטיות</>
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
              className={`rounded-xl px-4 py-1.5 text-sm font-semibold border transition-all flex items-center gap-1.5 ${
                viewMode === 'map'
                  ? 'border-pink-300 text-pink-600 bg-pink-50'
                  : 'border-gray-200 text-gray-400 hover:border-pink-200 hover:text-pink-500'
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
                className={`rounded-xl px-4 py-1.5 text-sm font-semibold border transition-all disabled:opacity-40 ${
                  sortBy === key
                    ? 'border-pink-300 text-pink-600 bg-pink-50'
                    : 'border-gray-200 text-gray-400 hover:border-pink-200 hover:text-pink-500'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {!loading && sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="text-5xl mb-4">🔍</div>
            <p className="font-black text-gray-400 text-lg mb-2">לא נמצאו נייליסטיות</p>
            <p className="text-sm text-gray-300 font-medium">נסי לחפש באזור אחר</p>
          </div>
        ) : viewMode === 'map' ? (
          <div className="h-[70vh] rounded-2xl overflow-hidden shadow-sm border border-gray-100">
            <NailistMap nailists={sorted} center={coords ?? undefined} />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sorted.map((nailist, i) => {
              const gradient = GRADIENTS[i % GRADIENTS.length]
              const emoji = EMOJIS[i % EMOJIS.length]
              return (
                <motion.div
                  key={nailist.id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: Math.min(i * 0.07, 0.5) }}
                  whileHover={{ y: -4, transition: { duration: 0.2 } }}
                  onClick={() => router.push(`/nailists/${nailist.id}`)}
                  className="bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-xl hover:shadow-pink-100/50 transition-shadow cursor-pointer group border border-gray-100"
                >
                  <div className={`h-44 relative flex items-center justify-center overflow-hidden ${nailist.coverPhotoUrl ? '' : `bg-gradient-to-br ${gradient}`}`}>
                    {nailist.coverPhotoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={nailist.coverPhotoUrl} alt={nailist.businessName} className="w-full h-full object-cover" />
                    ) : (
                      <motion.span whileHover={{ scale: 1.3, rotate: 15 }} className="text-6xl">{emoji}</motion.span>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                    <button
                      onClick={(e) => e.stopPropagation()}
                      className="absolute top-3 left-3 w-9 h-9 bg-white/20 backdrop-blur rounded-full flex items-center justify-center hover:bg-white/40 transition-colors"
                    >
                      <Heart className="h-4 w-4 text-white" />
                    </button>
                    {nailist.distanceKm != null && (
                      <div className="absolute top-3 right-3 bg-white/20 backdrop-blur rounded-full px-3 py-1 text-white text-xs font-bold flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {`${nailist.distanceKm.toFixed(1)} ק"מ`}
                      </div>
                    )}
                    {nailist.whatsappPhone && (
                      <div className="absolute bottom-3 left-3">
                        <span className="bg-[#25D366]/90 backdrop-blur text-white text-xs font-bold rounded-full px-2.5 py-1 flex items-center gap-1">
                          <MessageCircle className="h-3 w-3" />
                          WhatsApp
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="p-5">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-black text-gray-800 text-lg leading-tight">{nailist.businessName}</h3>
                      <div className="flex items-center gap-1 text-sm shrink-0 bg-amber-50 rounded-lg px-2 py-0.5 ml-2">
                        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                        <span className="font-black text-amber-600">{nailist.avgRating > 0 ? nailist.avgRating.toFixed(1) : '—'}</span>
                        {nailist.reviewCount > 0 && <span className="text-amber-400/60">({nailist.reviewCount})</span>}
                      </div>
                    </div>

                    {nailist.city && (
                      <div className="flex items-center gap-1 text-sm text-gray-400 mb-3">
                        <MapPin className="h-3.5 w-3.5" />
                        <span>{nailist.city}</span>
                      </div>
                    )}

                    {nailist.bio && (
                      <p className="text-xs text-gray-400 mb-3 line-clamp-2 font-medium">{nailist.bio}</p>
                    )}

                    <div className="flex items-center justify-end border-t border-gray-50 pt-4 gap-2">
                      {nailist.whatsappPhone && (
                        <motion.a
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.97 }}
                          href={toWhatsAppUrl(nailist.whatsappPhone, whatsAppBookingMessage(nailist.businessName))}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-1.5 bg-[#25D366] hover:bg-[#22c55e] text-white text-xs font-bold rounded-xl px-3 py-2 shadow-sm shadow-green-200 transition-colors"
                        >
                          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-white">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                          </svg>
                          וואטסאפ
                        </motion.a>
                      )}
                      <Link href={`/nailists/${nailist.id}`} onClick={(e) => e.stopPropagation()}>
                        <Button
                          size="sm"
                          className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 border-0 rounded-xl shadow-md shadow-pink-200 font-bold"
                        >
                          לפרופיל
                        </Button>
                      </Link>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
