import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const projectRoot = process.cwd()

function source(path: string) {
  return readFileSync(join(projectRoot, path), 'utf8')
}

describe('search and share brand assets', () => {
  it.each(['src/app/icon.tsx', 'src/app/apple-icon.tsx', 'src/app/opengraph-image.tsx'])(
    '%s renders the current SVG logo',
    (path) => {
      const file = source(path)

      expect(file).toContain("'public/logo.svg'")
      expect(file).toContain('data:image/svg+xml;base64,${logoData}')
      expect(file).not.toContain('logo-og.png')
    }
  )

  it('uses the valid generated icon route in Organization JSON-LD', () => {
    expect(source('src/app/layout.tsx')).toContain('logo: `${APP_URL}/icon`,')
  })
})
