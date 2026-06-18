'use client'

import { motion } from 'framer-motion'
import { Navbar } from '@/components/layout/navbar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { MapPin, Search, Star, Clock, SlidersHorizontal, Heart } from 'lucide-react'

const MOCK_NAILISTS = [
  {
    id: '1', businessName: 'סטודיו גל בע"מ', city: 'תל אביב', avgRating: 4.9, reviewCount: 127,
    distanceKm: 0.8, services: ['ג\'ל', 'נייל ארט', 'אקריל'], minPrice: 120,
    gradient: 'from-pink-400 to-rose-500', emoji: '🌸',
  },
  {
    id: '2', businessName: 'נעמי ציפורניים', city: 'רמת גן', avgRating: 4.7, reviewCount: 89,
    distanceKm: 1.2, services: ['ג\'ל', 'מניקור', 'פדיקור'], minPrice: 90,
    gradient: 'from-purple-400 to-violet-500', emoji: '✨',
  },
  {
    id: '3', businessName: 'גלמור נייל ספא', city: 'הרצליה', avgRating: 4.8, reviewCount: 203,
    distanceKm: 2.1, services: ['נייל ארט', 'אקסטנשן', 'ג\'ל'], minPrice: 150,
    gradient: 'from-violet-400 to-purple-500', emoji: '💜',
  },
  {
    id: '4', businessName: 'שיק נייל בר', city: 'תל אביב', avgRating: 5.0, reviewCount: 341,
    distanceKm: 0.5, services: ['ג\'ל', 'רטרו', 'עיצוב מיוחד'], minPrice: 180,
    gradient: 'from-rose-400 to-pink-500', emoji: '💅',
  },
  {
    id: '5', businessName: 'לונה נייל ארט', city: 'גבעתיים', avgRating: 4.6, reviewCount: 56,
    distanceKm: 3.4, services: ['נייל ארט', 'ג\'ל'], minPrice: 110,
    gradient: 'from-indigo-400 to-blue-500', emoji: '🌙',
  },
  {
    id: '6', businessName: 'בלינג נייל סטודיו', city: 'פתח תקווה', avgRating: 4.8, reviewCount: 112,
    distanceKm: 4.1, services: ['ג\'ל', 'ריינסטון', 'נייל ארט'], minPrice: 140,
    gradient: 'from-amber-400 to-orange-500', emoji: '💎',
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
                <motion.span
                  whileHover={{ scale: 1.3, rotate: 15 }}
                  className="text-6xl"
                >
                  {nailist.emoji}
                </motion.span>
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                {/* Heart button */}
                <button className="absolute top-3 left-3 w-9 h-9 bg-white/20 backdrop-blur rounded-full flex items-center justify-center hover:bg-white/40 transition-colors">
                  <Heart className="h-4 w-4 text-white" />
                </button>
                {/* Distance badge */}
                <div className="absolute top-3 right-3 bg-white/20 backdrop-blur rounded-full px-3 py-1 text-white text-xs font-bold flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {nailist.distanceKm} ק"מ
                </div>
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

                <div className="flex items-center justify-between border-t border-gray-50 pt-4">
                  <div>
                    <span className="text-xs text-gray-400">מחיר מ-</span>
                    <span className="text-lg font-black text-gray-800"> ₪{nailist.minPrice}</span>
                  </div>
                  <Button
                    size="sm"
                    className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 border-0 rounded-xl shadow-md shadow-pink-200 font-bold"
                  >
                    לפרופיל
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}

