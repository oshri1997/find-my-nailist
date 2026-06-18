'use client'

import { useState, useEffect, use } from 'react'
import { motion } from 'framer-motion'
import { Navbar } from '@/components/layout/navbar'
import { Button } from '@/components/ui/button'
import { MapPin, Star, Clock, MessageCircle, Navigation, ExternalLink, ChevronRight, Link2 } from 'lucide-react'
import { toWhatsAppUrl, whatsAppBookingMessage } from '@/lib/whatsapp'
import BookingModal from '@/components/booking/BookingModal'
import Link from 'next/link'

interface Service {
  id: string
  name: string
  durationMinutes: number
  price: number
  currency: string
  description?: string
}

interface PortfolioPhoto {
  id: string
  url: string
  caption?: string
}

interface Review {
  id: string
  rating: number
  comment?: string
  clientDisplayName?: string
  createdAt: string
}

interface NailistProfile {
  id: string
  businessName: string
  bio?: string
  city?: string
  address?: string
  whatsappPhone?: string
  instagramUrl?: string
  tiktokUrl?: string
  avgRating: number
  reviewCount: number
  latitude?: number
  longitude?: number
  services: Service[]
  portfolio: PortfolioPhoto[]
  reviews: Review[]
}

export default function NailistProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [profile, setProfile] = useState<NailistProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [showBooking, setShowBooking] = useState(false)
  const [activeTab, setActiveTab] = useState<'portfolio' | 'services' | 'reviews'>('portfolio')

  useEffect(() => {
    fetch(`/api/nailists/${id}`)
      .then((r) => r.json())
      .then(({ data }) => setProfile(data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [id])

  function wazeUrl() {
    if (!profile?.latitude || !profile?.longitude) return null
    return `https://waze.com/ul?ll=${profile.latitude},${profile.longitude}&navigate=yes`
  }

  function googleMapsUrl() {
    if (!profile?.latitude || !profile?.longitude) return null
    return `https://maps.google.com/maps?q=${profile.latitude},${profile.longitude}`
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50/50">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-pink-500 border-t-transparent animate-spin" />
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50/50">
        <Navbar />
        <div className="flex-1 flex items-center justify-center flex-col gap-3" dir="rtl">
          <div className="text-4xl">😔</div>
          <p className="font-black text-gray-400">הפרופיל לא נמצא</p>
          <Link href="/search">
            <Button variant="outline" className="rounded-xl">חזרה לחיפוש</Button>
          </Link>
        </div>
      </div>
    )
  }

  // symbol is determined per-service; this is a fallback for non-service text
  const symbol = '₪'

  return (
    <div className="min-h-screen flex flex-col bg-gray-50/50" dir="rtl">
      <Navbar />

      {/* Hero */}
      <div className="bg-gradient-to-br from-pink-500 via-purple-600 to-violet-600 text-white">
        <div className="container mx-auto max-w-4xl px-6 py-10">
          <Link href="/search" className="flex items-center gap-1 text-white/70 text-sm mb-6 hover:text-white transition-colors w-fit">
            <ChevronRight className="h-4 w-4" />
            חזרה לחיפוש
          </Link>
          <div className="flex items-start gap-5">
            <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-4xl shrink-0">
              💅
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-black mb-1">{profile.businessName}</h1>
              {profile.city && (
                <div className="flex items-center gap-1 text-white/80 text-sm mb-2">
                  <MapPin className="h-3.5 w-3.5" />
                  {profile.city}
                </div>
              )}
              {profile.avgRating > 0 && (
                <div className="flex items-center gap-1 text-sm">
                  <Star className="h-4 w-4 fill-amber-300 text-amber-300" />
                  <span className="font-black">{profile.avgRating.toFixed(1)}</span>
                  <span className="text-white/60">({profile.reviewCount} ביקורות)</span>
                </div>
              )}
            </div>
          </div>

          {profile.bio && (
            <p className="mt-4 text-white/80 text-sm leading-relaxed">{profile.bio}</p>
          )}

          <div className="flex flex-wrap gap-2 mt-5">
            {profile.services.length > 0 && (
              <Button
                onClick={() => setShowBooking(true)}
                className="bg-white text-pink-600 hover:bg-pink-50 border-0 rounded-2xl font-black shadow-lg"
              >
                קביעת תור 💅
              </Button>
            )}
            {profile.whatsappPhone && (
              <a
                href={toWhatsAppUrl(profile.whatsappPhone, whatsAppBookingMessage(profile.businessName))}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 bg-[#25D366] hover:bg-[#22c55e] text-white rounded-2xl px-4 py-2 font-bold text-sm transition-colors"
              >
                <MessageCircle className="h-4 w-4" />
                וואטסאפ
              </a>
            )}
            {profile.instagramUrl && (
              <a
                href={profile.instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 bg-white/20 backdrop-blur hover:bg-white/30 text-white rounded-2xl px-4 py-2 font-bold text-sm transition-colors"
              >
                <Link2 className="h-4 w-4" />
                אינסטגרם
              </a>
            )}
            {wazeUrl() && (
              <a
                href={wazeUrl()!}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 bg-white/20 backdrop-blur hover:bg-white/30 text-white rounded-2xl px-4 py-2 font-bold text-sm transition-colors"
              >
                <Navigation className="h-4 w-4" />
                Waze
              </a>
            )}
            {googleMapsUrl() && (
              <a
                href={googleMapsUrl()!}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 bg-white/20 backdrop-blur hover:bg-white/30 text-white rounded-2xl px-4 py-2 font-bold text-sm transition-colors"
              >
                <ExternalLink className="h-4 w-4" />
                Google Maps
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-100 sticky top-20 z-20">
        <div className="container mx-auto max-w-4xl px-6">
          <div className="flex gap-1">
            {([['portfolio', 'פורטפוליו'], ['services', 'שירותים'], ['reviews', 'ביקורות']] as const).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`py-4 px-4 text-sm font-bold border-b-2 transition-colors ${
                  activeTab === key
                    ? 'border-pink-500 text-pink-600'
                    : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto max-w-4xl px-6 py-8">
        {activeTab === 'portfolio' && (
          <div>
            {profile.portfolio.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <div className="text-4xl mb-3">🖼️</div>
                <p className="font-bold">אין תמונות בפורטפוליו עדיין</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {profile.portfolio.map((photo, i) => (
                  <motion.div
                    key={photo.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.05 }}
                    className="aspect-square rounded-2xl overflow-hidden bg-gray-100"
                  >
                    <img src={photo.url} alt={photo.caption ?? ''} className="w-full h-full object-cover" />
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'services' && (
          <div className="space-y-4">
            {profile.services.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <div className="text-4xl mb-3">✂️</div>
                <p className="font-bold">אין שירותים זמינים כרגע</p>
              </div>
            ) : (
              profile.services.map((service, i) => (
                <motion.div
                  key={service.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.07 }}
                  className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center justify-between hover:border-pink-200 transition-colors"
                >
                  <div>
                    <h3 className="font-black text-gray-800">{service.name}</h3>
                    {service.description && <p className="text-sm text-gray-400 mt-0.5">{service.description}</p>}
                    <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
                      <Clock className="h-3.5 w-3.5" />
                      {service.durationMinutes} דק'
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0 mr-4">
                    <span className="font-black text-pink-600 text-xl">
                      {service.currency === 'ILS' ? '₪' : '$'}{service.price}
                    </span>
                    <Button
                      size="sm"
                      onClick={() => setShowBooking(true)}
                      className="bg-gradient-to-r from-pink-500 to-purple-600 border-0 rounded-xl font-bold shadow-sm shadow-pink-200"
                    >
                      הזמני
                    </Button>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        )}

        {activeTab === 'reviews' && (
          <div className="space-y-4">
            {profile.reviews.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <div className="text-4xl mb-3">💬</div>
                <p className="font-bold">אין ביקורות עדיין</p>
              </div>
            ) : (
              profile.reviews.map((review, i) => (
                <motion.div
                  key={review.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.07 }}
                  className="bg-white rounded-2xl border border-gray-100 p-5"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="font-bold text-gray-700">{review.clientDisplayName ?? 'לקוחה'}</div>
                    <div className="flex gap-0.5">
                      {Array.from({ length: 5 }).map((_, j) => (
                        <Star
                          key={j}
                          className={`h-4 w-4 ${j < review.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`}
                        />
                      ))}
                    </div>
                  </div>
                  {review.comment && <p className="text-sm text-gray-600 leading-relaxed">{review.comment}</p>}
                  <p className="text-xs text-gray-300 mt-2">
                    {new Date(review.createdAt).toLocaleDateString('he-IL')}
                  </p>
                </motion.div>
              ))
            )}
          </div>
        )}
      </div>

      {showBooking && (
        <BookingModal
          nailistProfileId={id}
          businessName={profile.businessName}
          services={profile.services}
          onClose={() => setShowBooking(false)}
        />
      )}
    </div>
  )
}
