import type { Metadata } from 'next'
import { adminDb } from '@/lib/firebase/admin'
import { COLLECTIONS } from '@/lib/firebase/collections'
import NailistProfileClient from './NailistProfileClient'

type Props = { params: Promise<{ id: string }> }

const BASE_URL = 'https://nailistiot.fun'

async function getNailistMeta(id: string) {
  try {
    const snap = await adminDb().collection(COLLECTIONS.NAILIST_PROFILES).doc(id).get()
    if (!snap.exists) return null
    return snap.data() as Record<string, unknown>
  } catch {
    return null
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const p = await getNailistMeta(id)
  if (!p) return {}

  const name = p.businessName as string
  const city = p.city as string | undefined
  const bio = p.bio as string | undefined
  // coverPhotoUrl is legacy (no UI sets it anymore) — fall back to the avatar for social share images
  const coverPhotoUrl = (p.coverPhotoUrl as string | undefined) ?? (p.photoUrl as string | undefined)

  const title = city ? `${name} — נייליסטית ב${city}` : `${name} — נייליסטית`
  const description = bio
    ? bio.slice(0, 155)
    : `${name}${city ? ` ב${city}` : ''} — נייליסטית מקצועית. הזמיני תור לעיצוב גל, נייל ארט ומניקור בנייליסטיות.`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      locale: 'he_IL',
      siteName: 'נייליסטיות',
      url: `${BASE_URL}/nailists/${id}`,
      ...(coverPhotoUrl && { images: [{ url: coverPhotoUrl, alt: name }] }),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      ...(coverPhotoUrl && { images: [coverPhotoUrl] }),
    },
    alternates: { canonical: `/nailists/${id}` },
  }
}

export default async function NailistProfilePage({ params }: Props) {
  const { id } = await params
  const p = await getNailistMeta(id)

  const jsonLd: Record<string, unknown> | null = p
    ? {
        '@context': 'https://schema.org',
        '@type': 'BeautySalon',
        name: p.businessName,
        description: p.bio ?? undefined,
        url: `${BASE_URL}/nailists/${id}`,
        address: p.city
          ? { '@type': 'PostalAddress', addressLocality: p.city, addressCountry: 'IL' }
          : undefined,
        aggregateRating:
          (p.avgRating as number) > 0
            ? {
                '@type': 'AggregateRating',
                ratingValue: (p.avgRating as number).toFixed(1),
                reviewCount: p.reviewCount,
                bestRating: 5,
                worstRating: 1,
              }
            : undefined,
        image: (p.coverPhotoUrl as string | undefined) ?? (p.photoUrl as string | undefined) ?? undefined,
        geo:
          p.latitude && p.longitude
            ? { '@type': 'GeoCoordinates', latitude: p.latitude, longitude: p.longitude }
            : undefined,
      }
    : null

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <NailistProfileClient id={id} />
    </>
  )
}
