import { NextRequest, NextResponse } from 'next/server'

const mapsKey = () =>
  process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? process.env.GOOGLE_MAPS_API_KEY ?? ''

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const key = mapsKey()
  if (!key) return NextResponse.json({ error: 'Maps key not configured' }, { status: 500 })

  const placeId = searchParams.get('placeId')
  if (placeId) {
    const url = new URL('https://maps.googleapis.com/maps/api/place/details/json')
    url.searchParams.set('place_id', placeId)
    url.searchParams.set('fields', 'formatted_address,geometry,address_components')
    url.searchParams.set('language', 'he')
    url.searchParams.set('key', key)
    const res = await fetch(url.toString())
    const data = await res.json() as Record<string, unknown>
    return NextResponse.json(data)
  }

  const input = searchParams.get('input')
  if (!input?.trim()) return NextResponse.json({ predictions: [] })

  const url = new URL('https://maps.googleapis.com/maps/api/place/autocomplete/json')
  url.searchParams.set('input', input)
  url.searchParams.set('components', 'country:il')
  url.searchParams.set('language', 'he')
  url.searchParams.set('key', key)
  const res = await fetch(url.toString())
  const data = await res.json() as { predictions?: unknown[] }
  return NextResponse.json({ predictions: data.predictions ?? [] })
}
