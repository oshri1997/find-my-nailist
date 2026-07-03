import { matchesFilter, matchesQuery, FILTER_KEYWORDS, filterTags } from '@/app/search/page'

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
