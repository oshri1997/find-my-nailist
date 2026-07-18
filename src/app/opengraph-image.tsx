import { ImageResponse } from 'next/og'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

export const alt = 'נייליסטיות'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image() {
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
        <img src={logoSrc} width={560} height={506} style={{ objectFit: 'contain' }} alt="נייליסטיות" />
      </div>
    ),
    { ...size }
  )
}
