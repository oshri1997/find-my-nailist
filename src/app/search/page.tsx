'use client'

import { motion } from 'framer-motion'
import { Navbar } from '@/components/layout/navbar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { MapPin, Search, Star, Clock, SlidersHorizontal, Heart, MessageCircle } from 'lucide-react'
import { toWhatsAppUrl, whatsAppBookingMessage } from '@/lib/whatsapp'

const MOCK_NAILISTS = [
  {
    id: '1', businessName: 'סטודיו גל בע"מ', city: 'תל אביב', avgRating: 4.9, reviewCount: 127,
    distanceKm: 0.8, services: ['ג\'ל', 'נייל ארט', 'אקריל'], minPrice: 120,
    gradient: 'from-pink-400 to-rose-500', emoji: '🌸', whatsappPhone: '0501234567',
  },
  {
    id: '2', businessName: 'נעמי ציפורניים', city: 'רמת גן', avgRating: 4.7, reviewCount: 89,
    distanceKm: 1.2, services: ['ג\'ל', 'מניקור', 'פדיקור'], minPrice: 90,
    gradient: 'from-purple-400 to-violet-500', emoji: '✨', whatsappPhone: '0521234567',
  },
  {
    id: '3', businessName: 'גלמור נייל ספא', city: 'הרצליה', avgRating: 4.8, reviewCount: 203,
    distanceKm: 2.1, services: ['נייל ארט', 'אקסטנשן', 'ג\'ל'], minPrice: 150,
    gradient: 'from-violet-400 to-purple-500', emoji: '💜', whatsappPhone: '0541234567',
  },
  {
    id: '4', businessName: 'שיק נייל בר', city: 'תל אביב', avgRating: 5.0, reviewCount: 341,
    distanceKm: 0.5, services: ['ג\'ל', 'רטרו', 'עיצוב מיוחד'], minPrice: 180,
    gradient: 'from-rose-400 to-pink-500', emoji: '💅', whatsappPhone: '0531234567',
  },
  {
    id: '5', businessName: 'לונה נייל ארט', city: 'גבעתיים', avgRating: 4.6, reviewCount: 56,
    distanceKm: 3.4, services: ['נייל ארט', 'ג\'ל'], minPrice: 110,
    gradient: 'from-indigo-400 to-blue-500', emoji: '🌙', whatsappPhone: '',
  },
  {
    id: '6', businessName: 'בלינג נייל סטודיו', city: 'פתח תקווה', avgRating: 4.8, reviewCount: 112,
    distanceKm: 4.1, services: ['ג\'ל', 'ריינסטון', 'נייל ארט'], minPrice: 140,
    gradient: 'from-amber-400 to-orange-500', emoji: '💎', whatsappPhone: '0511234567',
  },
]

const filterTags = ['הכל', 'ג\'ל', 'נייל ארט', 'אקריל', 'מניקור', 'פדיקור', 'אקסטנשן']

export default function SearchPage() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50/50">
      <Navbar />

      {/* Search Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-100 sticky top-20 z-30">
        <div className="container mx-auto max-w-7xl px-6 py-4">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-pink-400" />
              <Input className="pr-9 rounded-xl border-gray-200 focus:border-pink-300 h-11" placeholder="הכניסי מיקום..." />
            </div>
            <div className="relative flex-1 hidden md:block">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-pink-400" />
              <Input className="pr-9 rounded-xl border-gray-200 focus:border-pink-300 h-11" placeholder="סוג שירות (ג'ל, נייל ארט...)" />
            </div>
            <Button className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 border-0 rounded-xl h-11 px-6 font-bold gap-2 shadow-md shadow-pink-200">
              <Search className="h-4 w-4" />
              חפשי
            </Button>
            <Button variant="outline" className="rounded-xl h-11 border-gray-200 gap-2">
              <SlidersHorizontal className="h-4 w-4" />
              סינון
            </Button>
          </div>

          {/* Filter tags */}
          <div className="flex gap-2 mt-3 flex-wrap">
            {filterTags.map((tag, i) => (
              <button
                key={tag}
                className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-all ${
                  i === 0
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
            נמצאו <span className="font-black text-gray-800">{MOCK_NAILISTS.length}</span> נייליסטיות קרוב אלייך
          </p>
          <div className="flex gap-2">
            {['מרחק', 'דירוג', 'מחיר'].map((sort, i) => (
              <button
                key={sort}
                className={`rounded-xl px-4 py-1.5 text-sm font-semibold border transition-all ${
                  i === 0
                    ? 'border-pink-300 text-pink-600 bg-pink-50'
                    : 'border-gray-200 text-gray-400 hover:border-pink-200 hover:text-pink-500'
                }`}
              >
                {sort}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {MOCK_NAILISTS.map((nailist, i) => (
            <motion.div
              key={nailist.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.07 }}
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
              className="bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-xl hover:shadow-pink-100/50 transition-shadow cursor-pointer group border border-gray-100"
            >
              {/* Cover */}
              <div className={`h-44 bg-gradient-to-br ${nailist.gradient} relative flex items-center justify-center overflow-hidden`}>
                <motion.span whileHover={{ scale: 1.3, rotate: 15 }} className="text-6xl">
                  {nailist.emoji}
                </motion.span>
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                {/* Heart */}
                <button className="absolute top-3 left-3 w-9 h-9 bg-white/20 backdrop-blur rounded-full flex items-center justify-center hover:bg-white/40 transition-colors">
                  <Heart className="h-4 w-4 text-white" />
                </button>
                {/* Distance */}
                <div className="absolute top-3 right-3 bg-white/20 backdrop-blur rounded-full px-3 py-1 text-white text-xs font-bold flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {nailist.distanceKm} ק"מ
                </div>
                {/* WhatsApp badge on cover */}
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
                  <h3 className="font-black text-gray-800 text-lg">{nailist.businessName}</h3>
                  <div className="flex items-center gap-1 text-sm shrink-0 bg-amber-50 rounded-lg px-2 py-0.5">
                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                    <span className="font-black text-amber-600">{nailist.avgRating}</span>
                    <span className="text-amber-400/60">({nailist.reviewCount})</span>
                  </div>
                </div>

                <div className="flex items-center gap-1 text-sm text-gray-400 mb-3">
                  <Clock className="h-3.5 w-3.5" />
                  <span>{nailist.city}</span>
                </div>

                <div className="flex flex-wrap gap-1.5 mb-4">
                  {nailist.services.map((s) => (
                    <span key={s} className="bg-gray-50 border border-gray-100 text-gray-500 rounded-lg px-2.5 py-0.5 text-xs font-semibold">
                      {s}
                    </span>
                  ))}
                </div>

                <div className="flex items-center justify-between border-t border-gray-50 pt-4 gap-2">
                  <div className="shrink-0">
                    <span className="text-xs text-gray-400">מחיר מ-</span>
                    <span className="text-lg font-black text-gray-800"> ₪{nailist.minPrice}</span>
                  </div>

                  <div className="flex gap-2">
                    {/* WhatsApp CTA */}
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

                    <Button
                      size="sm"
                      className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 border-0 rounded-xl shadow-md shadow-pink-200 font-bold"
                    >
                      לפרופיל
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}
