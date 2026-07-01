'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Navbar } from '@/components/layout/navbar'
import { Button } from '@/components/ui/button'
import { MapPin, Star, Clock, MessageCircle, Navigation, ExternalLink, ChevronRight, Settings, ImageIcon, Share2, Check, Heart, AlertCircle, Scissors, MessageSquare } from 'lucide-react'
import { toWhatsAppUrl, whatsAppBookingMessage } from '@/lib/whatsapp'
import BookingModal from '@/components/booking/BookingModal'
import Link from 'next/link'
import { useAuth } from '@/components/auth/auth-provider'

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
  photoUrl?: string
  coverPhotoUrl?: string
  services: Service[]
  portfolio: PortfolioPhoto[]
  reviews: Review[]
}

export default function NailistProfileClient({ id }: { id: string }) {
  const { user, role } = useAuth()
  const router = useRouter()
  const [profile, setProfile] = useState<NailistProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [isOwner, setIsOwner] = useState<boolean | null>(null)
  const [showBooking, setShowBooking] = useState(false)
  const [bookingServiceId, setBookingServiceId] = useState<string | undefined>(undefined)
  const [activeTab, setActiveTab] = useState<'portfolio' | 'services' | 'reviews'>('portfolio')
  const [copied, setCopied] = useState(false)
  const [isFavorited, setIsFavorited] = useState(false)
  const [favLoading, setFavLoading] = useState(false)

  function openBooking(serviceId?: string) {
    if (!user) {
      router.push(`/login?redirect=/nailists/${id}`)
      return
    }
    setBookingServiceId(serviceId)
    setShowBooking(true)
  }

  async function handleShare() {
    const url = window.location.href
    const text = `${profile?.businessName} — נייליסטית מקצועית${profile?.city ? ` ב${profile.city}` : ''}`
    if (navigator.share) {
      await navigator.share({ title: profile?.businessName ?? 'נייליסטית', text, url })
    } else {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  useEffect(() => {
    fetch(`/api/nailists/${id}`)
      .then((r) => r.json())
      .then(({ data }) => setProfile(data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!user || role !== 'NAILIST') { setIsOwner(false); return }
    fetch('/api/me/nailist-profile')
      .then(r => r.ok ? r.json() : null)
      .then(json => { setIsOwner(json?.data?.id === id) })
      .catch(() => {})
  }, [user, id, role])

  useEffect(() => {
    if (!user) return
    fetch(`/api/favorites/${id}`)
      .then(r => r.json())
      .then(json => setIsFavorited(json?.data?.isFavorited ?? false))
      .catch(() => {})
  }, [user, id])

  async function toggleFavorite() {
    if (!user) {
      router.push(`/login?redirect=/nailists/${id}`)
      return
    }
    if (favLoading) return
    setFavLoading(true)
    const method = isFavorited ? 'DELETE' : 'POST'
    try {
      const res = await fetch(`/api/favorites/${id}`, { method })
      const json = await res.json()
      setIsFavorited(json?.data?.isFavorited ?? !isFavorited)
    } catch {
      // revert on error
    } finally {
      setFavLoading(false)
    }
  }

  function wazeUrl() {
    if (!profile?.latitude || !profile?.longitude) return null
    return `https://waze.com/ul?ll=${profile.latitude},${profile.longitude}&navigate=yes`
  }

  function googleMapsUrl() {
    if (!profile?.latitude || !profile?.longitude) return null
    return `https://maps.google.com/maps?q=${profile.latitude},${profile.longitude}`
  }

  function initials(name: string) {
    return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  }

  function formatReviewerName(displayName?: string) {
    if (!displayName) return 'לקוחה'
    const parts = displayName.trim().split(/\s+/)
    if (parts.length < 2) return parts[0]
    return `${parts[0]} ${parts[1][0]}.`
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-muted/30">
        <Navbar />
        <div className="animate-pulse">
          <div className="h-64 bg-gradient-to-br from-pink-400 via-purple-500 to-violet-500 opacity-60" />
          <div className="container mx-auto max-w-4xl px-6 py-6 space-y-4">
            <div className="h-5 bg-muted rounded w-1/3" />
            <div className="h-5 bg-muted rounded w-1/2" />
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-8">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="aspect-square rounded-2xl bg-muted" />
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex flex-col bg-muted/50">
        <Navbar />
        <div className="flex-1 flex items-center justify-center flex-col gap-3" dir="rtl">
          <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center">
            <AlertCircle className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="font-black text-muted-foreground">הפרופיל לא נמצא</p>
          <Link href="/search">
            <Button variant="outline" className="rounded-xl">חזרה לחיפוש</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-muted/50" dir="rtl">
      <Navbar />

      {/* Hero */}
      <div className={`relative text-white overflow-hidden ${!profile.coverPhotoUrl ? 'bg-gradient-to-br from-pink-500 via-purple-600 to-violet-600' : ''}`}>
        {profile.coverPhotoUrl && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={profile.coverPhotoUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-br from-pink-900/60 via-purple-900/50 to-violet-900/60" />
          </>
        )}

        {/* Owner edit buttons */}
        {isOwner === true && (
          <div className="absolute top-3 left-3 flex gap-2 z-10">
            <Link href="/dashboard/nailist/portfolio">
              <button className="bg-white/20 backdrop-blur text-white text-xs font-bold rounded-full px-3 py-1.5 hover:bg-white/35 transition-colors flex items-center gap-1.5 border border-white/20">
                <ImageIcon className="h-3 w-3" />
                שני רקע
              </button>
            </Link>
            <Link href="/dashboard/nailist/settings">
              <button className="bg-white/20 backdrop-blur text-white text-xs font-bold rounded-full px-3 py-1.5 hover:bg-white/35 transition-colors flex items-center gap-1.5 border border-white/20">
                <Settings className="h-3 w-3" />
                ערכי פרופיל
              </button>
            </Link>
          </div>
        )}

        <div className="container mx-auto max-w-4xl px-6 py-10 relative z-10">
          <Link href="/search" className="flex items-center gap-1 text-white/70 text-sm mb-6 hover:text-white transition-colors w-fit">
            <ChevronRight className="h-4 w-4" />
            חזרה לחיפוש
          </Link>
          <div className="flex items-start gap-5">
            {/* Avatar */}
            <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur shrink-0 overflow-hidden flex items-center justify-center">
              {profile.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.photoUrl} alt={profile.businessName} className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl font-black text-white">{initials(profile.businessName)}</span>
              )}
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
            {isOwner === false && profile.services.length > 0 && (
              <Button
                onClick={() => openBooking()}
                className="bg-white text-pink-600 hover:bg-pink-50 border-0 rounded-2xl font-black shadow-lg"
              >
                קביעת תור
              </Button>
            )}
            {user ? (
              <>
                {profile.whatsappPhone && (
                  <a
                    href={toWhatsAppUrl(profile.whatsappPhone, whatsAppBookingMessage(profile.businessName))}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 bg-white/20 backdrop-blur hover:bg-white/30 text-white rounded-2xl px-4 py-2 font-bold text-sm transition-colors border border-white/20"
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
                    className="flex items-center gap-2 bg-white/20 backdrop-blur hover:bg-white/30 text-white rounded-2xl px-4 py-2 font-bold text-sm transition-colors border border-white/20"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
                    </svg>
                    אינסטגרם
                  </a>
                )}
                {profile.tiktokUrl && (
                  <a
                    href={profile.tiktokUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 bg-white/20 backdrop-blur hover:bg-white/30 text-white rounded-2xl px-4 py-2 font-bold text-sm transition-colors border border-white/20"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.78 1.52V6.73a4.85 4.85 0 01-1.01-.04z"/>
                    </svg>
                    טיקטוק
                  </a>
                )}
                {wazeUrl() && (
                  <a
                    href={wazeUrl()!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 bg-white/20 backdrop-blur hover:bg-white/30 text-white rounded-2xl px-4 py-2 font-bold text-sm transition-colors border border-white/20"
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
                    className="flex items-center gap-2 bg-white/20 backdrop-blur hover:bg-white/30 text-white rounded-2xl px-4 py-2 font-bold text-sm transition-colors border border-white/20"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Google Maps
                  </a>
                )}
              </>
            ) : (
              (profile.whatsappPhone || profile.instagramUrl || profile.tiktokUrl || wazeUrl()) && (
                <Link
                  href={`/login?redirect=/nailists/${id}`}
                  className="flex items-center gap-2 bg-white/20 backdrop-blur hover:bg-white/30 text-white rounded-2xl px-4 py-2 font-bold text-sm transition-colors border border-white/30"
                >
                  <MessageCircle className="h-4 w-4" />
                  כניסה לצפייה בפרטי קשר
                </Link>
              )
            )}
            {isOwner === false && (
              <button
                onClick={toggleFavorite}
                disabled={favLoading}
                className="flex items-center gap-2 bg-white/20 backdrop-blur hover:bg-white/30 text-white rounded-2xl px-4 py-2 font-bold text-sm transition-colors border border-white/20 disabled:opacity-60"
              >
                <Heart
                  className={`h-4 w-4 transition-all ${isFavorited ? 'fill-white scale-110' : ''}`}
                />
                {isFavorited ? 'שמורה' : 'שמרי'}
              </button>
            )}
            <button
              onClick={handleShare}
              className="flex items-center gap-2 bg-white/20 backdrop-blur hover:bg-white/30 text-white rounded-2xl px-4 py-2 font-bold text-sm transition-colors border border-white/20"
            >
              {copied ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
              {copied ? 'הלינק הועתק!' : 'שתפי'}
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-card border-b border-border sticky top-20 z-20">
        <div className="container mx-auto max-w-4xl px-6">
          <div className="flex gap-1">
            {([['portfolio', 'פורטפוליו'], ['services', 'שירותים'], ['reviews', 'ביקורות']] as const).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`py-4 px-4 text-sm font-bold border-b-2 transition-colors ${
                  activeTab === key
                    ? 'border-pink-500 text-pink-600'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
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
              <div className="text-center py-16 text-muted-foreground">
                <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-3">
                  <ImageIcon className="h-6 w-6 text-muted-foreground" />
                </div>
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
                    className="aspect-square rounded-2xl overflow-hidden bg-muted"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
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
              <div className="text-center py-16 text-muted-foreground">
                <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-3">
                  <Scissors className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="font-bold">אין שירותים זמינים כרגע</p>
              </div>
            ) : (
              profile.services.map((service, i) => (
                <motion.div
                  key={service.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.07 }}
                  className="bg-card rounded-2xl border border-border p-5 flex items-center justify-between hover:border-pink-200 transition-colors"
                >
                  <div>
                    <h3 className="font-black text-foreground">{service.name}</h3>
                    {service.description && <p className="text-sm text-muted-foreground mt-0.5">{service.description}</p>}
                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />
                      {service.durationMinutes} {"דק'"}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0 mr-4">
                    <span className="font-black text-pink-600 text-xl">
                      {service.currency === 'ILS' ? '₪' : '$'}{service.price}
                    </span>
                    {isOwner === false && (
                      <Button
                        size="sm"
                        onClick={() => openBooking(service.id)}
                        className="bg-gradient-to-r from-pink-500 to-purple-600 border-0 rounded-xl font-bold shadow-sm shadow-primary/40"
                      >
                        הזמני
                      </Button>
                    )}
                  </div>
                </motion.div>
              ))
            )}
          </div>
        )}

        {activeTab === 'reviews' && (
          <div className="space-y-4">
            {profile.reviews.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-3">
                  <MessageSquare className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="font-bold">אין ביקורות עדיין</p>
              </div>
            ) : (
              profile.reviews.map((review, i) => (
                <motion.div
                  key={review.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.07 }}
                  className="bg-card rounded-2xl border border-border p-5"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="font-bold text-muted-foreground">{formatReviewerName(review.clientDisplayName)}</div>
                    <div className="flex gap-0.5">
                      {Array.from({ length: 5 }).map((_, j) => (
                        <Star
                          key={j}
                          className={`h-4 w-4 ${j < review.rating ? 'fill-amber-400 text-amber-400' : 'text-border'}`}
                        />
                      ))}
                    </div>
                  </div>
                  {review.comment && <p className="text-sm text-muted-foreground leading-relaxed">{review.comment}</p>}
                  <p className="text-xs text-muted-foreground/60 mt-2">
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
          initialServiceId={bookingServiceId}
          onClose={() => setShowBooking(false)}
        />
      )}
    </div>
  )
}
