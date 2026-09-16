// Shared time-interval primitive for a nailist's working hours: the single
// representation all business logic downstream (slot generation, booking
// validation, recommendations, gap detection) works against, regardless of
// whether the underlying Firestore doc still uses the legacy startTime/
// endTime pair or the newer intervals[] field. See normalizeDayAvailability.
//
// Semantics: [start, end) — start inclusive, end exclusive. Two intervals
// that touch (one's end equals the other's start, e.g. 09:00-13:00 and
// 13:00-18:00) are NOT considered overlapping and are kept as two separate
// intervals — normalization never silently merges them, since a nailist may
// have intentionally split her day and an automatic merge could hide a data
// entry mistake instead of surfacing it.
export interface TimeInterval {
  start: string // "HH:MM"
  end: string   // "HH:MM", exclusive
}

// The union of shapes a day's raw availability data can arrive in: the
// legacy single startTime/endTime pair, the new intervals[] array, or both
// at once (while a record is mid-migration or dual-written for rollback
// safety). `isActive: false` always means closed, regardless of what the
// other fields hold. `isActive` undefined is treated as active — callers
// like a date override's OPEN mode have no isActive field at all.
export interface RawDayAvailability {
  isActive?: boolean
  startTime?: string
  endTime?: string
  intervals?: TimeInterval[]
}

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/

export function isValidTimeStr(value: unknown): value is string {
  return typeof value === 'string' && TIME_RE.test(value)
}

export function sortIntervals(intervals: TimeInterval[]): TimeInterval[] {
  return [...intervals].sort((a, b) => a.start.localeCompare(b.start))
}

// Returns a Hebrew validation error message, or null when every interval is
// individually well-formed (valid HH:MM, start < end) and no two intervals
// overlap once sorted. Overlap is always a hard error — never silently
// merged — so a user's shift-entry mistake surfaces instead of vanishing.
export function validateIntervals(intervals: TimeInterval[]): string | null {
  if (intervals.length === 0) return null
  for (const interval of intervals) {
    if (!isValidTimeStr(interval.start) || !isValidTimeStr(interval.end)) {
      return 'פורמט שעה לא תקין (נדרש HH:MM)'
    }
    if (interval.start >= interval.end) {
      return 'שעת ההתחלה חייבת להיות לפני שעת הסיום'
    }
  }
  const sorted = sortIntervals(intervals)
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].start < sorted[i - 1].end) {
      return 'קיימת חפיפה בין טווחי השעות'
    }
  }
  return null
}

// The normalization layer: turns whatever shape a raw working-hours or
// date-override document happens to hold today into the one representation
// business logic operates on. Precedence when both legacy and new fields are
// present: a valid, non-empty intervals[] always wins — startTime/endTime
// are compatibility/rollback-safety data only, never read once intervals[]
// is present. Fail-safe by design: malformed or ambiguous legacy data (e.g.
// startTime with no endTime) normalizes to a closed day ([]) rather than
// inventing hours nobody configured — better to under-show availability than
// to open a window that was never actually set.
export function normalizeDayAvailability(raw: RawDayAvailability | undefined | null): TimeInterval[] {
  if (!raw || raw.isActive === false) return []
  if (Array.isArray(raw.intervals) && raw.intervals.length > 0) {
    return validateIntervals(raw.intervals) ? [] : sortIntervals(raw.intervals)
  }
  if (isValidTimeStr(raw.startTime) && isValidTimeStr(raw.endTime) && raw.startTime < raw.endTime) {
    return [{ start: raw.startTime, end: raw.endTime }]
  }
  return []
}
