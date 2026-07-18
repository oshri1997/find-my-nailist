'use client'

import { useEffect, useState } from 'react'
import { APIProvider, Map, AdvancedMarker } from '@vis.gl/react-google-maps'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'

interface Nailist {
  id: string
  businessName: string
  city?: string
  avgRating: number
  latitude?: number
  longitude?: number
  distanceKm?: number
  photoUrl?: string
}

interface Props {
  nailists: Nailist[]
  center?: { lat: number; lng: number }
}

const DEFAULT_CENTER = { lat: 32.0853, lng: 34.7818 } // Tel Aviv

function NailistPin({ nailist }: { nailist: Nailist }) {
  const initials = nailist.businessName
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()

  return (
    <div className="flex flex-col items-center cursor-pointer group">
      <div className="w-11 h-11 rounded-full overflow-hidden border-[3px] border-white shadow-lg bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center group-hover:scale-110 transition-transform">
        {nailist.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={nailist.photoUrl} alt={nailist.businessName} className="w-full h-full object-cover" />
        ) : (
          <span className="text-white text-sm font-black">{initials}</span>
        )}
      </div>
      <div className="bg-card text-xs font-bold text-foreground px-2.5 py-1 rounded-full shadow-md mt-1 whitespace-nowrap max-w-[120px] truncate opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        {nailist.businessName}
      </div>
      {/* Pin tail */}
      <div className="w-0 h-0 border-l-[5px] border-r-[5px] border-t-[6px] border-l-transparent border-r-transparent border-t-white -mt-0.5 drop-shadow-sm" />
    </div>
  )
}

export default function NailistMap({ nailists, center }: Props) {
  const [apiKey, setApiKey] = useState<string | null>(
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? null
  )
  const [loading, setLoading] = useState(!apiKey)

  useEffect(() => {
    if (apiKey) return
    fetch('/api/maps-config')
      .then((r) => r.json())
      .then(({ key }: { key?: string }) => { if (key) setApiKey(key) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [apiKey])

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-muted rounded-2xl">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!apiKey) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-muted rounded-2xl" dir="rtl">
        <p className="text-muted-foreground font-medium">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY לא מוגדר</p>
      </div>
    )
  }

  const mapCenter = center ?? DEFAULT_CENTER
  const pinned = nailists.filter((n) => n.latitude != null && n.longitude != null)

  return (
    <APIProvider apiKey={apiKey}>
      <Map
        mapId="find-my-nailist-map"
        defaultCenter={mapCenter}
        defaultZoom={12}
        gestureHandling="greedy"
        disableDefaultUI={false}
        style={{ width: '100%', height: '100%' }}
      >
        {/* User location dot */}
        {center && (
          <AdvancedMarker position={center}>
            <div className="w-5 h-5 rounded-full bg-blue-500 border-2 border-white shadow-lg ring-4 ring-blue-200" />
          </AdvancedMarker>
        )}

        {/* Nailist pins */}
        {pinned.map((n) => (
          <AdvancedMarker
            key={n.id}
            position={{ lat: n.latitude!, lng: n.longitude! }}
            title={n.businessName}
          >
            <Link href={`/nailists/${n.id}`}>
              <NailistPin nailist={n} />
            </Link>
          </AdvancedMarker>
        ))}
      </Map>
    </APIProvider>
  )
}
