/**
 * @jest-environment node
 */

jest.mock('@/lib/firebase/admin', () => ({ adminDb: jest.fn() }))

import { imageExtension, MAX_UPLOAD_BYTES, readImageBody, UploadError } from '@/lib/upload-guard'

function imageRequest(bytes: Uint8Array, contentLength?: string) {
  return new Request('http://localhost/api/uploads', {
    method: 'POST',
    headers: contentLength ? { 'content-length': contentLength } : undefined,
    body: Buffer.from(bytes),
  })
}

describe('imageExtension', () => {
  it.each([
    ['image/png', Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), 'png'],
    ['image/jpeg', Buffer.from([255, 216, 255]), 'jpg'],
    ['image/webp', Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBP')]), 'webp'],
  ])('accepts valid %s signature', (contentType, bytes, extension) => {
    expect(imageExtension(bytes, contentType)).toBe(extension)
  })

  it('rejects a mismatched image signature', () => {
    expect(() => imageExtension(Buffer.from('not an image'), 'image/png')).toThrow(UploadError)
  })
})

describe('readImageBody', () => {
  it('rejects advertised bodies above maximum size before reading', async () => {
    await expect(readImageBody(imageRequest(new Uint8Array([1]), String(MAX_UPLOAD_BYTES + 1))))
      .rejects.toMatchObject({ status: 413 })
  })

  it('rejects an empty body', async () => {
    await expect(readImageBody(imageRequest(new Uint8Array()))).rejects.toMatchObject({ status: 400 })
  })

  it('returns a body at maximum allowed size', async () => {
    const bytes = new Uint8Array(MAX_UPLOAD_BYTES)
    bytes[0] = 1
    await expect(readImageBody(imageRequest(bytes))).resolves.toHaveLength(MAX_UPLOAD_BYTES)
  })
})
