import { ImageResponse } from 'next/og'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default async function AppleIcon() {
  const logoData = await readFile(join(process.cwd(), 'public/logo-og.png'), 'base64')
  const logoSrc = `data:image/png;base64,${logoData}`

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #c2542d, #d9a441)',
        }}
      >
        <img src={logoSrc} width={150} height={150} style={{ objectFit: 'contain' }} alt="" />
      </div>
    ),
    { ...size }
  )
}
