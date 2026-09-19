import { serializeJsonLd } from '@/lib/json-ld'

describe('serializeJsonLd', () => {
  it('never lets user text close the script tag it is embedded in', () => {
    // A nailist can type anything into her business name — it is a plain
    // z.string() on the API. Plain JSON.stringify leaves "<" alone, so this
    // value used to end the <script> block and run as markup on her public
    // profile and on her city's listing page.
    const hostile = '</script><script>alert(1)</script>'
    const out = serializeJsonLd({ name: hostile })

    expect(out).not.toContain('</script>')
    expect(out).not.toContain('<')
    expect(JSON.stringify({ name: hostile })).toContain('</script>')
  })

  it('still round-trips to the exact original value', () => {
    const value = {
      name: '</script> & "quoted" <b>bold</b>',
      bio: 'line\u2028break\u2029here',
      rating: 4.5,
      nested: { city: 'תל אביב' },
    }

    expect(JSON.parse(serializeJsonLd(value))).toEqual(value)
  })

  it('escapes the JavaScript line terminators that are legal inside JSON', () => {
    const out = serializeJsonLd({ bio: 'a\u2028b\u2029c' })

    expect(out).toContain('\\u2028')
    expect(out).toContain('\\u2029')
    expect(out).not.toMatch(new RegExp('[\\u2028\\u2029]'))
  })
})
