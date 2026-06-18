'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { MapPin } from 'lucide-react'

interface Prediction {
  place_id: string
  description: string
  structured_formatting: {
    main_text: string
    secondary_text: string
  }
}

export interface PlaceResult {
  address: string
  city: string
  lat: number
  lng: number
}

interface Props {
  value: string
  onChange: (value: string) => void
  onPlaceSelect: (result: PlaceResult) => void
  placeholder?: string
}

export function PlacesInput({ value, onChange, onPlaceSelect, placeholder }: Props) {
  const [predictions, setPredictions] = useState<Prediction[]>([])
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const fetchSuggestions = useCallback((input: string) => {
    if (!input.trim()) { setPredictions([]); setOpen(false); return }
    fetch(`/api/places?input=${encodeURIComponent(input)}`)
      .then((r) => r.json())
      .then((data: { predictions?: Prediction[] }) => {
        const preds = data.predictions ?? []
        setPredictions(preds)
        setOpen(preds.length > 0)
      })
      .catch(() => {})
  }, [])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    onChange(val)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchSuggestions(val), 300)
  }

  async function selectPlace(p: Prediction) {
    onChange(p.description)
    setOpen(false)
    setPredictions([])

    try {
      const res = await fetch(`/api/places?placeId=${p.place_id}`)
      const data = await res.json() as {
        result?: {
          formatted_address?: string
          geometry?: { location: { lat: number; lng: number } }
          address_components?: Array<{ types: string[]; long_name: string }>
        }
      }
      const r = data.result
      if (!r?.geometry) return

      const city =
        r.address_components?.find((c) =>
          c.types.includes('locality') || c.types.includes('administrative_area_level_2')
        )?.long_name ?? ''

      onPlaceSelect({
        address: r.formatted_address ?? p.description,
        city,
        lat: r.geometry.location.lat,
        lng: r.geometry.location.lng,
      })
    } catch {
      // if details fail just keep the typed address
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <input
        value={value}
        onChange={handleChange}
        onFocus={() => predictions.length > 0 && setOpen(true)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:border-pink-300 h-11 font-medium text-gray-700 placeholder:text-gray-300"
        autoComplete="off"
        dir="rtl"
      />
      {open && (
        <ul className="absolute z-50 top-full mt-1 w-full bg-white rounded-xl border border-gray-100 shadow-2xl overflow-hidden">
          {predictions.map((p) => (
            <li
              key={p.place_id}
              onMouseDown={() => selectPlace(p)}
              className="flex items-center gap-3 px-4 py-3 hover:bg-pink-50 cursor-pointer transition-colors border-b border-gray-50 last:border-0"
              dir="rtl"
            >
              <MapPin className="h-4 w-4 text-gray-400 shrink-0" />
              <span className="text-sm leading-tight">
                <span className="font-semibold text-gray-700">{p.structured_formatting.main_text}</span>
                {p.structured_formatting.secondary_text && (
                  <span className="text-gray-400 text-xs block">{p.structured_formatting.secondary_text}</span>
                )}
              </span>
            </li>
          ))}
          <li className="flex justify-end px-3 py-1.5 bg-gray-50">
            <span className="text-[10px] text-gray-400 font-medium">powered by Google</span>
          </li>
        </ul>
      )}
    </div>
  )
}
