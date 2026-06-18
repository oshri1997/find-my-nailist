'use client'

import { APIProvider, Map, AdvancedMarker, Pin } from '@vis.gl/react-google-maps'
import Link from 'next/link'

interface Nailist {
  id: string
  businessName: string
  city?: string
  avgRating: number
  latitude?: number
  longitude?: number
  distanceKm?: number
}

interface Props {
  nailists: Nailist[]
  center?: { lat: number; lng: number }
}

const DEFAULT_CENTER = { lat: 32.0853, lng: 34.7818 } // Tel Aviv

export default function NailistMap({ nailists, center }: Props) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  if (!apiKey) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100 rounded-2xl" dir="rtl">
        <p className="text-gray-400 font-medium">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY לא מוגדר</p>
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
        className="w-full h-full rounded-2xl overflow-hidden"
      >
        {center && (
          <AdvancedMarker position={center}>
            <div className="w-4 h-4 rounded-full bg-blue-500 border-2 border-white shadow-md" />
          </AdvancedMarker>
        )}
        {pinned.map((n) => (
          <AdvancedMarker
            key={n.id}
            position={{ lat: n.latitude!, lng: n.longitude! }}
            title={n.businessName}
          >
            <Link href={`/nailists/${n.id}`}>
              <div className="flex flex-col items-center cursor-pointer group">
                <div className="bg-gradient-to-r from-pink-500 to-purple-600 text-white text-xs font-black px-2.5 py-1 rounded-full shadow-lg group-hover:scale-110 transition-transform whitespace-nowrap">
                  💅 {n.businessName}
                </div>
                <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-pink-500 mt-0" />
              </div>
            </Link>
          </AdvancedMarker>
        ))}
      </Map>
    </APIProvider>
  )
}
