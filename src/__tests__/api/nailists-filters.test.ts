import { filterNailists } from '@/lib/search-filters'

describe('filterNailists', () => {
  const nailists = [
    { id: 'cheap-gel', serviceNames: ["ג'ל בנייה"], minPrice: 90 },
    { id: 'builder', serviceNames: ['Builder Gel'], minPrice: 180 },
    { id: 'spa', serviceNames: ['ספא ידיים'], minPrice: 250 },
    { id: 'unknown', serviceNames: [], minPrice: null },
  ]

  it('matches any service keyword and applies a cumulative price cap', () => {
    expect(filterNailists(nailists, "ג'ל בנייה||builder gel", 200).map((n) => n.id)).toEqual([
      'cheap-gel',
      'builder',
    ])
  })

  it('excludes profiles without a known minimum price when capped', () => {
    expect(filterNailists(nailists, undefined, 200).map((n) => n.id)).toEqual(['cheap-gel', 'builder'])
  })
})
