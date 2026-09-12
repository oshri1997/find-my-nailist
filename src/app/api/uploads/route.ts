import { randomUUID } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb, adminStorage } from '@/lib/firebase/admin'
import { COLLECTIONS } from '@/lib/firebase/collections'
import { assertUploadReady, finishUpload, imageExtension, readImageBody, reserveUpload, UploadError } from '@/lib/upload-guard'
export const runtime = 'nodejs'

async function authenticate(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value
  if (!token) throw new UploadError('יש להתחבר כדי להעלות תמונות.', 401)
  try { return (await adminAuth().verifyIdToken(token)).uid }
  catch { throw new UploadError('יש להתחבר מחדש.', 401) }
}
async function assertOwner(uid: string, kind: string, ownerId: string) {
  if (!/^[a-zA-Z0-9_-]{1,128}$/.test(ownerId)) throw new UploadError('יעד העלאה לא תקין.', 400)
  if (kind === 'avatars' || kind === 'feedback') {
    if (ownerId === uid) return
  } else if (kind === 'portfolio' || kind === 'covers') {
    const profile = await adminDb().collection(COLLECTIONS.NAILIST_PROFILES).doc(ownerId).get()
    if (profile.exists && profile.data()?.userId === uid) return
  }
  throw new UploadError('אין הרשאה להעלות או למחוק תמונה זו.', 403)
}
function failure(error: unknown) {
  if (error instanceof UploadError) return NextResponse.json({ error: error.message }, { status: error.status })
  console.error('Upload operation failed', error)
  return NextResponse.json({ error: 'שירות התמונות אינו זמין כרגע. נסו שוב מאוחר יותר.' }, { status: 503 })
}
export async function POST(request: NextRequest) {
  try {
    const uid = await authenticate(request)
    const params = new URL(request.url).searchParams
    const kind = params.get('kind') || ''
    const ownerId = params.get('ownerId') || ''
    await assertOwner(uid, kind, ownerId)
    const contentType = request.headers.get('content-type') || ''
    const ext = ({ 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' } as Record<string, string>)[contentType]
    if (!ext) throw new UploadError('אפשר להעלות רק PNG, JPEG או WebP.', 415)
    const storageKey = `${kind}/${ownerId}/${randomUUID()}.${ext}`
    await reserveUpload(uid, storageKey)
    const bucket = adminStorage().bucket()
    const file = bucket.file(storageKey)
    try {
      const bytes = await readImageBody(request)
      imageExtension(bytes, contentType)
      const token = randomUUID()
      await file.save(bytes, { resumable: false, preconditionOpts: { ifGenerationMatch: 0 }, metadata: { contentType, metadata: kind === 'feedback' ? {} : { firebaseStorageDownloadTokens: token } } })
      await finishUpload(uid, storageKey, bytes.length)
      const data = kind === 'feedback' ? { storageKey } : { storageKey, url: `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(storageKey)}?alt=media&token=${token}` }
      return NextResponse.json({ data }, { status: 201 })
    } catch (error) {
      // Retain the reservation unless Storage confirms deletion/absence.
      try { await file.delete({ ignoreNotFound: true }); await finishUpload(uid, storageKey, null) }
      catch (cleanupError) { console.error('Upload cleanup failed', cleanupError) }
      throw error
    }
  } catch (error) { return failure(error) }
}
export async function DELETE(request: NextRequest) {
  try {
    const uid = await authenticate(request)
    const key = new URL(request.url).searchParams.get('storageKey') || ''
    const parts = key.split('/')
    if (parts.length !== 3 || !/^[a-zA-Z0-9_.-]{1,180}$/.test(parts[2])) throw new UploadError('נתיב תמונה לא תקין.', 400)
    await assertOwner(uid, parts[0], parts[1])
    await assertUploadReady(uid, key)
    await adminStorage().bucket().file(key).delete({ ignoreNotFound: true })
    await finishUpload(uid, key, null)
    return NextResponse.json({ data: { deleted: true } })
  } catch (error) { return failure(error) }
}
