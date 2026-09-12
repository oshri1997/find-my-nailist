import { adminDb } from '@/lib/firebase/admin'

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024
export const UPLOADS_PER_DAY = 30
export const GLOBAL_UPLOAD_BYTES_PER_DAY = 500 * 1024 * 1024
export const MAX_RETAINED_FILES = 50
export const MAX_RETAINED_BYTES = 100 * 1024 * 1024
export class UploadError extends Error {
  constructor(message: string, public status: number) { super(message) }
}
export function imageExtension(bytes: Buffer, contentType: string): string {
  if (contentType === 'image/png' && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return 'png'
  if (contentType === 'image/jpeg' && bytes.length >= 3 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return 'jpg'
  if (contentType === 'image/webp' && bytes.length >= 12 && bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP') return 'webp'
  throw new UploadError('אפשר להעלות רק תמונת PNG, JPEG או WebP תקינה.', 415)
}
export async function readImageBody(request: Request): Promise<Buffer> {
  if (Number(request.headers.get('content-length')) > MAX_UPLOAD_BYTES) throw new UploadError('גודל התמונה המקסימלי הוא 5MB.', 413)
  const reader = request.body?.getReader()
  if (!reader) throw new UploadError('התמונה ריקה.', 400)
  const chunks: Uint8Array[] = []
  let size = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > MAX_UPLOAD_BYTES) {
        await reader.cancel()
        throw new UploadError('גודל התמונה המקסימלי הוא 5MB.', 413)
      }
      chunks.push(value)
    }
  } finally { reader.releaseLock() }
  if (!size) throw new UploadError('התמונה ריקה.', 400)
  return Buffer.concat(chunks, size)
}
type Entry = { key: string; bytes: number; ready: boolean }
type Ledger = { day?: string; attempts?: number; entries?: Entry[] }

// Bounded documents; maximum-size reservations charge attempts before reading
// bodies. Deletion never refunds daily usage, including failed attempts.
export async function reserveUpload(uid: string, key: string) {
  const db = adminDb()
  const userRef = db.collection('uploadQuotas').doc(`user-${uid}`)
  const globalRef = db.collection('uploadQuotas').doc('_global')
  const day = new Date().toISOString().slice(0, 10)
  await db.runTransaction(async transaction => {
    const [userSnap, globalSnap] = await Promise.all([transaction.get(userRef), transaction.get(globalRef)])
    const user = (userSnap.data() || {}) as Ledger
    const global = globalSnap.data() || {}
    const attempts = user.day === day ? user.attempts || 0 : 0
    const dailyBytes = global.day === day ? global.bytes || 0 : 0
    const entries = user.entries || []
    if (attempts >= UPLOADS_PER_DAY || dailyBytes + MAX_UPLOAD_BYTES > GLOBAL_UPLOAD_BYTES_PER_DAY) throw new UploadError('מכסת העלאות התמונות להיום נוצלה. נסו שוב מחר.', 429)
    if (entries.length >= MAX_RETAINED_FILES || entries.reduce((sum, entry) => sum + entry.bytes, 0) + MAX_UPLOAD_BYTES > MAX_RETAINED_BYTES) throw new UploadError('מכסת אחסון התמונות נוצלה. מחקו תמונות ישנות לפני העלאה נוספת.', 429)
    transaction.set(userRef, { day, attempts: attempts + 1, entries: [...entries, { key, bytes: MAX_UPLOAD_BYTES, ready: false }] })
    transaction.set(globalRef, { day, bytes: dailyBytes + MAX_UPLOAD_BYTES })
  })
}
export async function finishUpload(uid: string, key: string, bytes: number | null) {
  const db = adminDb()
  const ref = db.collection('uploadQuotas').doc(`user-${uid}`)
  await db.runTransaction(async transaction => {
    const snap = await transaction.get(ref)
    const ledger = (snap.data() || {}) as Ledger
    const entries = ledger.entries || []
    transaction.set(ref, { ...ledger, entries: bytes === null ? entries.filter(entry => entry.key !== key) : entries.map(entry => entry.key === key ? { ...entry, bytes, ready: true } : entry) })
  })
}
export async function assertUploadReady(uid: string, key: string) {
  const snap = await adminDb().collection('uploadQuotas').doc(`user-${uid}`).get()
  const entry = (snap.data()?.entries as Entry[] | undefined)?.find(item => item.key === key)
  if (entry && !entry.ready) throw new UploadError('התמונה עדיין בהעלאה. נסו שוב בעוד רגע.', 409)
}

// Creation endpoints must fail closed. Unlike deletion, they may only attach
// an object whose successful upload is recorded in the caller's ledger.
export async function assertCompletedUpload(uid: string, key: string) {
  const snap = await adminDb().collection('uploadQuotas').doc(`user-${uid}`).get()
  const entry = (snap.data()?.entries as Entry[] | undefined)?.find(item => item.key === key)
  if (!entry || !entry.ready) throw new UploadError('התמונה לא הועלתה או טרם הסתיימה.', 400)
}
