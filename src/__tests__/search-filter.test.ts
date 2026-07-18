import { matchesFilter, matchesQuery, FILTER_KEYWORDS, filterTags, filterCategories, subFilterTags, matchesTwoTierFilter, nextSlotSortKey, PRICE_BANDS, matchesPriceBand } from '@/app/search/page'

describe('matchesFilter', () => {
  it('returns true for "הכל" regardless of services', () => {
    expect(matchesFilter([], 'הכל')).toBe(true)
    expect(matchesFilter(["מניקור ג'ל", 'פדיקור'], 'הכל')).toBe(true)
  })

  it('matches מניקור', () => {
    expect(matchesFilter(['מניקור קלאסי', 'פדיקור'], 'מניקור')).toBe(true)
    expect(matchesFilter(['פדיקור'], 'מניקור')).toBe(false)
  })

  it('matches פדיקור', () => {
    expect(matchesFilter(['פדיקור רגיל'], 'פדיקור')).toBe(true)
    expect(matchesFilter(['מניקור'], 'פדיקור')).toBe(false)
  })

  it("matches ג'ל", () => {
    expect(matchesFilter(["מניקור ג'ל"], "ג'ל")).toBe(true)
    expect(matchesFilter(['gel nails'], "ג'ל")).toBe(true)
    expect(matchesFilter(['אקריל'], "ג'ל")).toBe(false)
  })

  it("matches ג'ל בנייה", () => {
    expect(matchesFilter(["ג'ל בנייה לציפורניים"], "ג'ל בנייה")).toBe(true)
    expect(matchesFilter(['builder gel'], "ג'ל בנייה")).toBe(true)
    expect(matchesFilter(['בנייה ידיים'], "ג'ל בנייה")).toBe(true)
  })

  it("matches ביוג'ל", () => {
    expect(matchesFilter(["ביוג'ל"], "ביוג'ל")).toBe(true)
    expect(matchesFilter(['BIAB treatment'], "ביוג'ל")).toBe(true)
    expect(matchesFilter(["ביו ג'ל"], "ביוג'ל")).toBe(true)
    expect(matchesFilter(['אקריל'], "ביוג'ל")).toBe(false)
  })

  it("matches ג'ל רוסי", () => {
    expect(matchesFilter(["ג'ל רוסי"], "ג'ל רוסי")).toBe(true)
    expect(matchesFilter(['russian gel manicure'], "ג'ל רוסי")).toBe(true)
    expect(matchesFilter(['ציפורן רוסי'], "ג'ל רוסי")).toBe(true)
  })

  it('matches נייל ארט', () => {
    expect(matchesFilter(['נייל ארט'], 'נייל ארט')).toBe(true)
    expect(matchesFilter(['nail art design'], 'נייל ארט')).toBe(true)
    expect(matchesFilter(['ציור ציפורניים'], 'נייל ארט')).toBe(true)
    expect(matchesFilter(['מניקור'], 'נייל ארט')).toBe(false)
  })

  it('matches אקריל', () => {
    expect(matchesFilter(['ציפורן אקריל'], 'אקריל')).toBe(true)
    expect(matchesFilter(['acrylic nails'], 'אקריל')).toBe(true)
  })

  it('matches אקריגל', () => {
    expect(matchesFilter(['אקריגל'], 'אקריגל')).toBe(true)
    expect(matchesFilter(['acrygel treatment'], 'אקריגל')).toBe(true)
  })

  it('matches אקסטנשן', () => {
    expect(matchesFilter(['אקסטנשן ציפורניים'], 'אקסטנשן')).toBe(true)
    expect(matchesFilter(['nail extension'], 'אקסטנשן')).toBe(true)
  })

  it('matches ספא ידיים', () => {
    expect(matchesFilter(['ספא ידיים מפנק'], 'ספא ידיים')).toBe(true)
    expect(matchesFilter(['hand spa'], 'ספא ידיים')).toBe(true)
    expect(matchesFilter(['ספא רגיל'], 'ספא ידיים')).toBe(true)
  })

  it('matches פרפין', () => {
    expect(matchesFilter(['טיפול פרפין'], 'פרפין')).toBe(true)
    expect(matchesFilter(['paraffin wax'], 'פרפין')).toBe(true)
  })

  it('matches רפואי', () => {
    expect(matchesFilter(['פדיקור רפואי'], 'רפואי')).toBe(true)
    expect(matchesFilter(['טיפול רפואית'], 'רפואי')).toBe(true)
    expect(matchesFilter(['ציפורן חודרנית'], 'רפואי')).toBe(true)
    expect(matchesFilter(['מניקור'], 'רפואי')).toBe(false)
  })

  it('is case-insensitive', () => {
    expect(matchesFilter(['MANICURE'], 'מניקור')).toBe(true)
    expect(matchesFilter(['Gel Nails'], "ג'ל")).toBe(true)
  })

  it('returns false when serviceNames is empty and filter is not הכל', () => {
    expect(matchesFilter([], 'מניקור')).toBe(false)
    expect(matchesFilter([], "ג'ל")).toBe(false)
  })

  it('matches if any service in the list matches', () => {
    expect(matchesFilter(['פדיקור', "מניקור ג'ל", 'אקריל'], 'אקריל')).toBe(true)
    expect(matchesFilter(['פדיקור', 'מניקור'], 'אקריל')).toBe(false)
  })
})

describe('matchesQuery', () => {
  it('returns true for an empty or blank query', () => {
    expect(matchesQuery({ businessName: 'סטודיו שרה', city: 'תל אביב' }, '')).toBe(true)
    expect(matchesQuery({ businessName: 'סטודיו שרה', city: 'תל אביב' }, '   ')).toBe(true)
  })

  it('matches by city', () => {
    expect(matchesQuery({ businessName: 'סטודיו שרה', city: 'רחובות' }, 'רחובות')).toBe(true)
    expect(matchesQuery({ businessName: 'סטודיו שרה', city: 'ראשון לציון' }, 'רחובות')).toBe(false)
  })

  it('matches by business name', () => {
    expect(matchesQuery({ businessName: 'סטודיו שרה', city: 'רחובות' }, 'שרה')).toBe(true)
    expect(matchesQuery({ businessName: 'סטודיו דנה', city: 'רחובות' }, 'שרה')).toBe(false)
  })

  it('is case-insensitive and matches partial substrings', () => {
    expect(matchesQuery({ businessName: 'Nail Studio', city: 'Tel Aviv' }, 'nail')).toBe(true)
    expect(matchesQuery({ businessName: 'Nail Studio', city: 'Tel Aviv' }, 'AVIV')).toBe(true)
  })

  it('handles a missing city without throwing', () => {
    expect(matchesQuery({ businessName: 'סטודיו שרה' }, 'שרה')).toBe(true)
    expect(matchesQuery({ businessName: 'סטודיו שרה' }, 'תל אביב')).toBe(false)
  })
})

describe('filterTags', () => {
  it('starts with "הכל"', () => {
    expect(filterTags[0]).toBe('הכל')
  })

  it('includes all major categories', () => {
    expect(filterTags).toContain('מניקור')
    expect(filterTags).toContain('פדיקור')
    expect(filterTags).toContain("ג'ל")
    expect(filterTags).toContain('נייל ארט')
    expect(filterTags).toContain('אקריל')
    expect(filterTags).toContain('רפואי')
    expect(filterTags).toContain("ביוג'ל")
  })

  it('every filter tag except "הכל" has a FILTER_KEYWORDS entry', () => {
    const missing = filterTags.filter((t) => t !== 'הכל' && !FILTER_KEYWORDS[t])
    expect(missing).toHaveLength(0)
  })
})

describe('filterCategories', () => {
  it('starts with "הכל" and offers מניקור/פדיקור', () => {
    expect(filterCategories[0]).toBe('הכל')
    expect(filterCategories).toContain('מניקור')
    expect(filterCategories).toContain('פדיקור')
  })
})

describe('subFilterTags', () => {
  it('starts with "הכל" and every non-"הכל" entry has a FILTER_KEYWORDS entry', () => {
    expect(subFilterTags[0]).toBe('הכל')
    const missing = subFilterTags.filter((t) => t !== 'הכל' && !FILTER_KEYWORDS[t])
    expect(missing).toHaveLength(0)
  })

  it('does not include the tier-1 categories', () => {
    expect(subFilterTags).not.toContain('מניקור')
    expect(subFilterTags).not.toContain('פדיקור')
  })
})

describe('matchesTwoTierFilter', () => {
  it('matches on category alone when sub-filter is "הכל"', () => {
    expect(matchesTwoTierFilter(["מניקור ג'ל"], 'מניקור', 'הכל')).toBe(true)
    expect(matchesTwoTierFilter(['פדיקור רגיל'], 'מניקור', 'הכל')).toBe(false)
  })

  it('requires both tiers to match when a sub-filter is selected', () => {
    expect(matchesTwoTierFilter(["מניקור ג'ל"], 'מניקור', "ג'ל")).toBe(true)
    expect(matchesTwoTierFilter(['מניקור אקריל'], 'מניקור', "ג'ל")).toBe(false)
    expect(matchesTwoTierFilter(["פדיקור ג'ל"], 'מניקור', "ג'ל")).toBe(false)
  })

  it('passes everything when both tiers are "הכל"', () => {
    expect(matchesTwoTierFilter([], 'הכל', 'הכל')).toBe(true)
    expect(matchesTwoTierFilter(['anything'], 'הכל', 'הכל')).toBe(true)
  })

  it('matches on sub-filter alone when category is "הכל"', () => {
    expect(matchesTwoTierFilter(['פדיקור רפואי'], 'הכל', 'רפואי')).toBe(true)
    expect(matchesTwoTierFilter(["מניקור ג'ל"], 'הכל', 'רפואי')).toBe(false)
  })
})

describe('PRICE_BANDS', () => {
  it('starts with "הכל" covering the full range', () => {
    expect(PRICE_BANDS[0]).toEqual({ key: 'all', label: 'הכל', min: 0, max: Infinity })
  })

  it('has a top-open band for the highest bracket', () => {
    const top = PRICE_BANDS[PRICE_BANDS.length - 1]
    expect(top.max).toBe(Infinity)
  })
})

describe('matchesPriceBand', () => {
  it('matches everything for the "all" band regardless of price', () => {
    expect(matchesPriceBand(500, 'all')).toBe(true)
    expect(matchesPriceBand(null, 'all')).toBe(true)
    expect(matchesPriceBand(undefined, 'all')).toBe(true)
  })

  it('matches prices within the band range (inclusive)', () => {
    expect(matchesPriceBand(50, 'under100')).toBe(true)
    expect(matchesPriceBand(100, 'under100')).toBe(true)
    expect(matchesPriceBand(101, 'under100')).toBe(false)
  })

  it('matches a mid-range band', () => {
    expect(matchesPriceBand(150, '100-200')).toBe(true)
    expect(matchesPriceBand(99, '100-200')).toBe(false)
    expect(matchesPriceBand(201, '100-200')).toBe(false)
  })

  it('matches the open-ended top band', () => {
    expect(matchesPriceBand(350, '350plus')).toBe(true)
    expect(matchesPriceBand(10000, '350plus')).toBe(true)
    expect(matchesPriceBand(349, '350plus')).toBe(false)
  })

  it('excludes nailists with no known price once a specific band is selected', () => {
    expect(matchesPriceBand(null, 'under100')).toBe(false)
    expect(matchesPriceBand(undefined, '200-350')).toBe(false)
  })

  it('falls back to matching everything for an unknown band key', () => {
    expect(matchesPriceBand(500, 'not-a-real-band')).toBe(true)
  })
})

describe('nextSlotSortKey', () => {
  it('returns a sortable date+time string when a slot exists', () => {
    expect(nextSlotSortKey({ nextAvailableSlot: { date: '2026-06-10', time: '14:00' } })).toBe('2026-06-10T14:00')
  })

  it('returns a sentinel that sorts after any real date when there is no slot', () => {
    const withSlot = nextSlotSortKey({ nextAvailableSlot: { date: '2099-12-31', time: '23:30' } })
    const withoutSlot = nextSlotSortKey({ nextAvailableSlot: null })
    expect(withoutSlot > withSlot).toBe(true)
  })

  it('treats a missing field the same as null', () => {
    expect(nextSlotSortKey({})).toBe(nextSlotSortKey({ nextAvailableSlot: null }))
  })

  it('sorts an array of nailists into soonest-first order with no-slot nailists last', () => {
    const nailists = [
      { id: 'no-slot', nextAvailableSlot: null },
      { id: 'later', nextAvailableSlot: { date: '2026-06-12', time: '09:00' } },
      { id: 'soonest', nextAvailableSlot: { date: '2026-06-10', time: '14:00' } },
    ]
    const sorted = [...nailists].sort((a, b) => nextSlotSortKey(a).localeCompare(nextSlotSortKey(b)))
    expect(sorted.map((n) => n.id)).toEqual(['soonest', 'later', 'no-slot'])
  })
})
