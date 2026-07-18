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
        className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm focus:outline-none focus:border-primary h-11 font-medium text-foreground placeholder:text-muted-foreground/40"
        autoComplete="off"
        dir="rtl"
      />
      {open && (
        <ul className="absolute z-50 top-full mt-1 w-full bg-card rounded-xl border border-border shadow-2xl overflow-hidden">
          {predictions.map((p) => (
            <li
              key={p.place_id}
              onMouseDown={() => selectPlace(p)}
              className="flex items-center gap-3 px-4 py-3 hover:bg-primary/10 dark:hover:bg-primary/30 cursor-pointer transition-colors border-b border-border/50 last:border-0"
              dir="rtl"
            >
              <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-sm leading-tight">
                <span className="font-semibold text-foreground">{p.structured_formatting.main_text}</span>
                {p.structured_formatting.secondary_text && (
                  <span className="text-muted-foreground text-xs block">{p.structured_formatting.secondary_text}</span>
                )}
              </span>
            </li>
          ))}
          <li className="flex justify-end px-3 py-1.5 bg-muted/50">
            <span className="text-[10px] text-muted-foreground font-medium">powered by Google</span>
          </li>
        </ul>
      )}
    </div>
  )
}
