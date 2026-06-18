import { geohashForLocation } from 'geofire-common'

interface GeoResult {
  lat: number
  lng: number
  geohash: string
}

export async function geocodeAddress(address: string): Promise<GeoResult | null> {
  const key = process.env.GOOGLE_MAPS_API_KEY
  if (!key) return null
  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${key}`
    )
    const data = await res.json()
    if (data.status !== 'OK' || !data.results?.length) return null
    const { lat, lng } = data.results[0].geometry.location
    return { lat, lng, geohash: geohashForLocation([lat, lng]) }
  } catch {
    return null
  }
}
