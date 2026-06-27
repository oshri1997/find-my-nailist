import type { MetadataRoute } from 'next'
import { adminDb } from '@/lib/firebase/admin'
import { COLLECTIONS } from '@/lib/firebase/collections'

export const revalidate = 3600

const BASE_URL = 'https://nailistiot.fun'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${BASE_URL}/search`, lastModified: new Date(), changeFrequency: 'hourly', priority: 0.9 },
  ]

  try {
    const db = adminDb()
    const snap = await db.collection(COLLECTIONS.NAILIST_PROFILES).get()
    const nailistPages: MetadataRoute.Sitemap = snap.docs.map((doc) => {
      const data = doc.data()
      return {
        url: `${BASE_URL}/nailists/${doc.id}`,
        lastModified: data.updatedAt?.toDate?.() ?? new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.8,
      }
    })
    return [...staticPages, ...nailistPages]
  } catch {
    return staticPages
  }
}
