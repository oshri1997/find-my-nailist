import { NextRequest, NextResponse } from 'next/server'
import { adminDb, adminStorage } from '@/lib/firebase/admin'
import { COLLECTIONS } from '@/lib/firebase/collections'
import { adminUnauthorized, verifyAdmin } from '@/lib/admin-auth'

const SIGNED_URL_TTL_MS = 5 * 60 * 1000

// A report only ever references an object generated beneath the reporting
// user's private feedback directory. Revalidate before signing so a malformed
// legacy document cannot turn this route into a generic bucket signer.
function isValidScreenshotKey(key: unknown, reporterUid: unknown) {
  if (typeof key !== 'string' || typeof reporterUid !== 'string') return false
  const escapedUid = reporterUid.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`^feedback/${escapedUid}/[a-zA-Z0-9-]{16,}\\.(png|jpe?g|webp)$`).test(key)
}

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  // Authenticate before any report or Storage lookup, including a malformed id.
  if (!await verifyAdmin(request)) return adminUnauthorized()

  const { id } = await context.params
  if (!id || id.length > 150) return NextResponse.json({ error: 'הפנייה לא נמצאה' }, { status: 404 })

  try {
    const snapshot = await adminDb().collection(COLLECTIONS.FEEDBACK).doc(id).get()
    const feedback = snapshot.data()
    const screenshotStorageKey = feedback?.screenshotStorageKey
    if (!snapshot.exists || !isValidScreenshotKey(screenshotStorageKey, feedback?.reporterUid)) {
      return NextResponse.json({ error: 'לא צורף צילום מסך לפנייה זו' }, { status: 404 })
    }

    const [url] = await adminStorage().bucket().file(screenshotStorageKey as string).getSignedUrl({
      action: 'read',
      expires: Date.now() + SIGNED_URL_TTL_MS,
    })

    return NextResponse.json({ data: { url } }, {
      headers: { 'Cache-Control': 'private, no-store' },
    })
  } catch (error) {
    console.error('GET /api/admin/feedback/[id]/screenshot error:', error)
    return NextResponse.json({ error: 'לא הצלחנו לטעון את צילום המסך' }, { status: 500 })
  }
}
