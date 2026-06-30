import type { MetadataRoute } from 'next'
import { CITIES } from '@/lib/cities'

export const dynamic = 'force-dynamic'

const BASE_URL = 'https://nailistiot.fun'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${BASE_URL}/search`, lastModified: new Date(), changeFrequency: 'hourly', priority: 0.9 },
    { url: `${BASE_URL}/how-it-works`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
  ]

  const cityPages: MetadataRoute.Sitemap = CITIES.map((c) => ({
    url: `${BASE_URL}/cities/${c.slug}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: 0.85,
  }))

  let nailistPages: MetadataRoute.Sitemap = []
  try {
    // Dynamic import so a missing/broken Firebase Admin never breaks the whole sitemap
    const { adminDb } = await import('@/lib/firebase/admin')
    const { COLLECTIONS } = await import('@/lib/firebase/collections')
    const db = adminDb()
    const snap = await db.collection(COLLECTIONS.NAILIST_PROFILES).where('isActive', '==', true).get()
    nailistPages = snap.docs.map((doc) => {
      const data = doc.data()
      return {
        url: `${BASE_URL}/nailists/${doc.id}`,
        lastModified: data.updatedAt?.toDate?.() ?? new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.8,
      }
    })
  } catch {
    // Firebase unavailable — sitemap still returns static + city pages
  }

  return [...staticPages, ...cityPages, ...nailistPages]
}
