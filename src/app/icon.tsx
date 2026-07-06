import { ImageResponse } from 'next/og'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

// 96px (a multiple of 48) per Google's favicon-in-search-results guidelines —
// browsers scale this down fine for the actual tab-size favicon, but Google
// needs the larger source to show it crisply in search results.
export const size = { width: 96, height: 96 }
export const contentType = 'image/png'

export default async function Icon() {
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
        }}
      >
        <img src={logoSrc} width={96} height={96} style={{ objectFit: 'contain' }} alt="" />
      </div>
    ),
    { ...size }
  )
}
