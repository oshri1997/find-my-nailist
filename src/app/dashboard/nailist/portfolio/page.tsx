'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { ImagePlus, X, Loader2, AlertCircle, Star } from 'lucide-react'

interface Photo {
  id: string
  url: string
  storageKey?: string
  caption?: string
}

export default function PortfolioPage() {
  const [profileId, setProfileId] = useState<string | null>(null)
  const [photos, setPhotos] = useState<Photo[]>([])
  const [coverPhotoUrl, setCoverPhotoUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/me/nailist-profile')
        if (!res.ok) {
          setError(res.status === 401 ? 'פג תוקף ההתחברות — אנא התחברי מחדש' : 'שגיאה בטעינת הפרופיל')
          return
        }
        const { data } = await res.json()
        setProfileId(data.id)
        setCoverPhotoUrl(data.coverPhotoUrl ?? null)
        const photosRes = await fetch(`/api/portfolio?profileId=${data.id}`)
        if (photosRes.ok) {
          const { data: photos } = await photosRes.json()
          setPhotos(photos ?? [])
        } else {
          setError('שגיאה בטעינת התמונות')
        }
      } catch {
        setError('שגיאה בטעינת הפרופיל')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !profileId) return

    if (file.size > 5 * 1024 * 1024) {
      setError('הקובץ גדול מדי — מקסימום 5MB')
      return
    }

    setError('')
    setUploading(true)
    setProgress(0)

    try {
      const { uploadPortfolioPhoto } = await import('@/lib/firebase/storage')
      const { url, storageKey } = await uploadPortfolioPhoto(profileId, file, setProgress)

      const res = await fetch('/api/portfolio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nailistProfileId: profileId, url, storageKey, displayOrder: photos.length }),
      })

      if (res.ok) {
        const { data } = await res.json()
        setPhotos((prev) => [...prev, data])
      } else {
        setError('שגיאה בשמירת התמונה — נסי שוב')
      }
    } catch {
      setError('שגיאה בהעלאה — ודאי ש-Storage מופעל ב-Firebase Console')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function handleDelete(photo: Photo) {
    try {
      if (photo.storageKey) {
        const { deleteStorageFile } = await import('@/lib/firebase/storage')
        await deleteStorageFile(photo.storageKey).catch(() => {})
      }
      await fetch(`/api/portfolio/${photo.id}`, { method: 'DELETE' })
      setPhotos((prev) => prev.filter((p) => p.id !== photo.id))
      if (coverPhotoUrl === photo.url) setCoverPhotoUrl(null)
    } catch {
      setError('שגיאה במחיקה')
    }
  }

  async function handleSetCover(photo: Photo) {
    if (!profileId) return
    const newUrl = coverPhotoUrl === photo.url ? null : photo.url
    try {
      await fetch(`/api/nailists/${profileId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coverPhotoUrl: newUrl }),
      })
      setCoverPhotoUrl(newUrl)
    } catch {
      setError('שגיאה בהגדרת תמונת רקע')
    }
  }

  return (
    <div className="p-4 md:p-8">
      <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black text-foreground mb-1">פורטפוליו 🎨</h1>
            <p className="text-muted-foreground font-medium">העלי תמונות של עבודות שלך</p>
            <p className="text-xs text-amber-500 font-medium mt-0.5 flex items-center gap-1">
              <Star className="h-3 w-3 fill-amber-400" />
              לחצי על ⭐ בתמונה כדי להגדיר אותה כתמונת הרקע של הכרטיס שלך
            </p>
          </div>
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || !profileId}
            className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 border-0 rounded-xl h-11 px-5 font-bold shadow-lg shadow-primary/40 gap-2 disabled:opacity-60"
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
            {uploading ? `${progress}%` : 'העלי תמונה'}
          </Button>
        </div>

        {uploading && (
          <div className="mt-4 h-2 bg-muted rounded-full overflow-hidden">
            <motion.div
              animate={{ width: `${progress}%` }}
              transition={{ ease: 'linear' }}
              className="h-full bg-gradient-to-r from-pink-500 to-purple-600 rounded-full"
            />
          </div>
        )}

        {error && (
          <div className="mt-3 flex items-center gap-2 text-red-500 text-sm font-semibold">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}
      </motion.div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {loading ? (
        <div className="flex items-center gap-3 text-muted-foreground font-medium">
          <Loader2 className="h-5 w-5 animate-spin" />
          טוענת תמונות...
        </div>
      ) : photos.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-border rounded-3xl p-16 flex flex-col items-center justify-center text-center cursor-pointer hover:border-pink-300 hover:bg-pink-50/30 transition-all group"
        >
          <div className="w-16 h-16 rounded-2xl bg-muted group-hover:bg-pink-100 dark:group-hover:bg-pink-950/40 flex items-center justify-center text-3xl mb-4 transition-colors">
            🖼️
          </div>
          <p className="font-black text-muted-foreground mb-1">אין תמונות עדיין</p>
          <p className="text-sm text-muted-foreground/50 font-medium">לחצי להעלאת תמונה ראשונה</p>
        </motion.div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <AnimatePresence>
            {photos.map((photo, i) => (
              <motion.div
                key={photo.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ delay: i * 0.04 }}
                className="relative group aspect-square rounded-2xl overflow-hidden bg-muted shadow-sm"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.url}
                  alt={photo.caption ?? 'תמונת פורטפוליו'}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors" />

                {/* Cover badge (always visible when set) */}
                {coverPhotoUrl === photo.url && (
                  <div className="absolute top-2 left-2 bg-amber-400 text-white rounded-full px-2 py-0.5 text-xs font-black flex items-center gap-1 shadow">
                    <Star className="h-3 w-3 fill-white" />
                    רקע
                  </div>
                )}

                {/* Delete */}
                <button
                  onClick={() => handleDelete(photo)}
                  className="absolute top-2 right-2 w-8 h-8 bg-white/90 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50 hover:text-red-500 shadow-sm"
                >
                  <X className="h-4 w-4" />
                </button>

                {/* Set/unset cover */}
                <button
                  onClick={() => handleSetCover(photo)}
                  title={coverPhotoUrl === photo.url ? 'הסרי תמונת רקע' : 'הגדרי כתמונת רקע לכרטיס'}
                  className={`absolute bottom-2 left-2 w-8 h-8 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm ${
                    coverPhotoUrl === photo.url
                      ? 'bg-amber-400 text-white'
                      : 'bg-white/90 hover:bg-amber-50 hover:text-amber-500'
                  }`}
                >
                  <Star className={`h-4 w-4 ${coverPhotoUrl === photo.url ? 'fill-white' : ''}`} />
                </button>
              </motion.div>
            ))}

            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onClick={() => fileInputRef.current?.click()}
              className="aspect-square rounded-2xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-2 hover:border-pink-300 hover:bg-pink-50/30 transition-all text-muted-foreground/50 hover:text-pink-400"
            >
              <ImagePlus className="h-6 w-6" />
              <span className="text-xs font-bold">הוסיפי</span>
            </motion.button>
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
