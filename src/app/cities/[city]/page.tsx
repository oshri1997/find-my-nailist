import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { adminDb } from '@/lib/firebase/admin'
import { COLLECTIONS } from '@/lib/firebase/collections'
import { Navbar } from '@/components/layout/navbar'
import { MapPin, Star, Sparkles } from 'lucide-react'

const BASE_URL = 'https://nailistiot.fun'

interface CityEntry {
  slug: string
  name: string
  alt?: string[]
}

export const CITIES: CityEntry[] = [
  { slug: 'tel-aviv', name: 'תל אביב', alt: ['תל אביב-יפו', 'ת"א', 'יפו'] },
  { slug: 'jerusalem', name: 'ירושלים', alt: ['ירושלים'] },
  { slug: 'haifa', name: 'חיפה' },
  { slug: 'rishon-lezion', name: 'ראשון לציון', alt: ['ראשל"צ'] },
  { slug: 'petah-tikva', name: 'פתח תקווה', alt: ['פ"ת'] },
  { slug: 'ashdod', name: 'אשדוד' },
  { slug: 'netanya', name: 'נתניה' },
  { slug: 'beer-sheva', name: 'באר שבע' },
  { slug: 'bnei-brak', name: 'בני ברק' },
  { slug: 'herzliya', name: 'הרצליה' },
  { slug: 'ramat-gan', name: 'רמת גן' },
  { slug: 'givatayim', name: 'גבעתיים' },
  { slug: 'raanana', name: 'רעננה' },
  { slug: 'kfar-saba', name: 'כפר סבא' },
  { slug: 'yavne', name: 'יבנה' },
  { slug: 'rosh-haayin', name: 'ראש העין' },
  { slug: 'modiin', name: 'מודיעין', alt: ['מודיעין-מכבים-רעות'] },
  { slug: 'ashkelon', name: 'אשקלון' },
  { slug: 'holon', name: 'חולון' },
  { slug: 'bat-yam', name: 'בת ים' },
  { slug: 'rehovot', name: 'רחובות' },
  { slug: 'nes-ziona', name: 'נס ציונה' },
  { slug: 'lod', name: 'לוד' },
  { slug: 'ramla', name: 'רמלה' },
  { slug: 'kiryat-gat', name: 'קריית גת' },
]

function getCity(slug: string): CityEntry | undefined {
  return CITIES.find((c) => c.slug === slug)
}

interface NailistRow {
  id: string
  businessName: string
  city?: string
  bio?: string
  avgRating: number
  reviewCount: number
  coverPhotoUrl?: string
}

async function getNailistsByCity(cityName: string, altNames: string[]): Promise<NailistRow[]> {
  try {
    const db = adminDb()
    const allNames = [cityName, ...altNames]

    const snaps = await Promise.all(
      allNames.map((name) =>
        db.collection(COLLECTIONS.NAILIST_PROFILES)
          .where('city', '==', name)
          .where('isActive', '==', true)
          .limit(24)
          .get()
      )
    )

    const seen = new Set<string>()
    const results: NailistRow[] = []
    for (const snap of snaps) {
      for (const doc of snap.docs) {
        if (seen.has(doc.id)) continue
        seen.add(doc.id)
        const d = doc.data()
        results.push({
          id: doc.id,
          businessName: (d.businessName as string) ?? '',
          city: d.city as string | undefined,
          bio: d.bio as string | undefined,
          avgRating: (d.avgRating as number) ?? 0,
          reviewCount: (d.reviewCount as number) ?? 0,
          coverPhotoUrl: d.coverPhotoUrl as string | undefined,
        })
      }
    }

    return results.sort((a, b) => b.avgRating - a.avgRating)
  } catch {
    return []
  }
}

type Props = { params: Promise<{ city: string }> }

export async function generateStaticParams() {
  return CITIES.map((c) => ({ city: c.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { city: slug } = await params
  const entry = getCity(slug)
  if (!entry) return {}

  const { name } = entry
  const title = `נייליסטית ב${name} — ג'ל, מניקור ונייל ארט`
  const description = `חפשי נייליסטית מקצועית ב${name}. עיצוב ג'ל, נייל ארט, מניקור ופדיקור — קראי ביקורות אמיתיות והזמיני תור בשניות דרך נייליסטיות.`
  const url = `${BASE_URL}/cities/${slug}`

  return {
    title,
    description,
    keywords: [
      `נייליסטית ב${name}`,
      `ציפורנים ב${name}`,
      `ג'ל ב${name}`,
      `מניקור ב${name}`,
      `נייל ארט ב${name}`,
      `פדיקור ב${name}`,
      `עיצוב ציפורניים ב${name}`,
    ],
    openGraph: { title, description, url, type: 'website', locale: 'he_IL', siteName: 'נייליסטיות' },
    twitter: { card: 'summary_large_image', title, description },
    alternates: { canonical: url },
  }
}

export default async function CityPage({ params }: Props) {
  const { city: slug } = await params
  const entry = getCity(slug)
  if (!entry) notFound()

  const { name, alt = [] } = entry
  const nailists = await getNailistsByCity(name, alt)

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'נייליסטיות', item: BASE_URL },
      { '@type': 'ListItem', position: 2, name: `נייליסטית ב${name}`, item: `${BASE_URL}/cities/${slug}` },
    ],
  }

  const cityPageJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `נייליסטיות ב${name}`,
    description: `רשימת נייליסטיות מקצועיות ב${name}`,
    url: `${BASE_URL}/cities/${slug}`,
    numberOfItems: nailists.length,
    itemListElement: nailists.map((n, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `${BASE_URL}/nailists/${n.id}`,
      name: n.businessName,
    })),
  }

  return (
    <div className="min-h-screen flex flex-col bg-background" dir="rtl">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(cityPageJsonLd) }} />
      <Navbar />

      <main className="flex-1 container mx-auto max-w-6xl px-6 py-10">
        {/* Breadcrumb */}
        <nav className="text-sm text-muted-foreground mb-6 flex items-center gap-1">
          <Link href="/" className="hover:text-primary transition-colors">נייליסטיות</Link>
          <span>/</span>
          <span className="text-foreground font-semibold">נייליסטית ב{name}</span>
        </nav>

        {/* Heading */}
        <div className="mb-8">
          <h1 className="text-3xl font-black text-foreground mb-2">
            נייליסטית ב{name}
          </h1>
          <p className="text-muted-foreground text-base">
            {nailists.length > 0
              ? `${nailists.length} נייליסטיות מקצועיות ב${name} — ג'ל, מניקור, נייל ארט ופדיקור`
              : `חפשי נייליסטית מקצועית ב${name} — ג'ל, מניקור, נייל ארט ופדיקור`}
          </p>
        </div>

        {nailists.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-5">
              <MapPin className="w-7 h-7 text-muted-foreground/60" />
            </div>
            <p className="text-lg font-bold text-foreground/60 mb-2">עדיין אין נייליסטיות ב{name}</p>
            <p className="text-sm text-muted-foreground mb-6">נסי לחפש בכל הערים</p>
            <Link
              href="/search"
              className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl px-6 py-3 transition-colors"
            >
              חפשי נייליסטית
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {nailists.map((nailist) => (
              <Link
                key={nailist.id}
                href={`/nailists/${nailist.id}`}
                className="bg-card rounded-2xl overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.06)] hover:shadow-[0_8px_32px_rgba(236,72,153,0.12)] transition-all duration-300 border border-border hover:border-pink-200 block group"
              >
                <div className="h-44 relative flex items-center justify-center overflow-hidden bg-pink-50">
                  {nailist.coverPhotoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={nailist.coverPhotoUrl}
                      alt={nailist.businessName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex items-center justify-center w-full h-full">
                      <div className="w-16 h-16 rounded-2xl bg-card/80 flex items-center justify-center shadow-sm">
                        <Sparkles className="w-8 h-8 text-primary/60" />
                      </div>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent" />
                </div>
                <div className="p-5">
                  <div className="flex items-start justify-between mb-2">
                    <h2 className="font-black text-foreground text-base leading-tight">{nailist.businessName}</h2>
                    <div className="flex items-center gap-1 shrink-0 bg-amber-50 rounded-lg px-2 py-0.5 ml-2 border border-amber-100">
                      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                      <span className="font-black text-amber-600 text-xs">{nailist.avgRating > 0 ? nailist.avgRating.toFixed(1) : '—'}</span>
                      {nailist.reviewCount > 0 && <span className="text-amber-400/60 text-xs">({nailist.reviewCount})</span>}
                    </div>
                  </div>
                  {nailist.city && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mb-3">
                      <MapPin className="h-3.5 w-3.5" />
                      <span>{nailist.city}</span>
                    </div>
                  )}
                  {nailist.bio && (
                    <p className="text-xs text-muted-foreground line-clamp-2">{nailist.bio}</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* City links section */}
        <section className="mt-16 pt-10 border-t border-border">
          <h2 className="text-lg font-bold text-foreground mb-4">חפשי נייליסטית בערים נוספות</h2>
          <div className="flex flex-wrap gap-2">
            {CITIES.filter((c) => c.slug !== slug).map((c) => (
              <Link
                key={c.slug}
                href={`/cities/${c.slug}`}
                className="rounded-full px-4 py-1.5 text-sm font-semibold border border-border text-muted-foreground hover:border-primary/40 hover:text-primary transition-all bg-card"
              >
                {c.name}
              </Link>
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}
