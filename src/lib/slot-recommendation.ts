import { israelWallClockToUtc } from './booking-utils'
import type { TimeInterval } from './availability-intervals'

export interface RecommendationBookedSlot {
  startTime: string // ISO instant
  endTime: string // ISO instant
}

/**
 * Nudges the client toward slots that consolidate the nailist's schedule
 * instead of fragmenting it — the same "can any active service ever fill
 * this leftover time?" question findUnfillableGaps asks about already-
 * booked gaps (see gap-detection.ts), asked prospectively about each
 * still-bookable slot instead. A slot only qualifies as "recommended" if:
 *   1. it's adjacent to an existing appointment or the edge of the
 *      interval IT belongs to (booking it consolidates busy time rather
 *      than opening a fresh isolated island of free time in the middle of
 *      the day), AND
 *   2. it doesn't leave a too-small sliver — one no active service could
 *      ever fill — on the OTHER side, still bounded by that same interval.
 * On a split-shift day, each interval is judged independently: a slot at
 * the end of the morning interval is only ever compared against that
 * interval's own boundary, never against a later interval across the
 * break — the break itself is off-hours, not "open space" a slot could
 * float in or consolidate toward.
 * On a mostly-empty day this naturally surfaces just the first/last slot of
 * each interval; the more fragmented the day already is, the more slots
 * qualify, which is exactly when steering the client matters most.
 */
export function getRecommendedSlots(params: {
  date: string // "YYYY-MM-DD"
  intervals: TimeInterval[]
  bookedSlots: RecommendationBookedSlot[]
  candidateSlots: string[] // "HH:MM" — already filtered to bookable (non-past, non-overlapping) slots
  serviceDurationMinutes: number
  minServiceDurationMinutes: number // smallest active service duration — null/0 disables recommendations entirely
}): Set<string> {
  const {
    date, intervals, bookedSlots,
    candidateSlots, serviceDurationMinutes, minServiceDurationMinutes,
  } = params

  const recommended = new Set<string>()
  if (!minServiceDurationMinutes || minServiceDurationMinutes <= 0 || intervals.length === 0) return recommended

  const minMs = minServiceDurationMinutes * 60_000
  const intervalBounds = intervals.map((interval) => ({
    start: israelWallClockToUtc(date, interval.start),
    end: israelWallClockToUtc(date, interval.end),
  }))

  for (const slot of candidateSlots) {
    const slotStart = israelWallClockToUtc(date, slot)
    const slotEnd = new Date(slotStart.getTime() + serviceDurationMinutes * 60_000)

    const bounds = intervalBounds.find((b) => slotStart >= b.start && slotStart < b.end)
    if (!bounds) continue // slot doesn't belong to any interval — never recommended

    const booked = bookedSlots
      .map((b) => ({ start: new Date(b.startTime), end: new Date(b.endTime) }))
      .filter((b) => b.start < bounds.end && b.end > bounds.start)

    // Nearest booked appointment ending at/before this slot, and nearest one
    // starting at/after it, both bounded by this slot's OWN interval —
    // everything else on the day (including other intervals) is irrelevant
    // to whether THIS slot fragments the schedule.
    let prevEnd = bounds.start
    let nextStart = bounds.end
    for (const b of booked) {
      if (b.end <= slotStart && b.end > prevEnd) prevEnd = b.end
      if (b.start >= slotEnd && b.start < nextStart) nextStart = b.start
    }

    const gapBefore = slotStart.getTime() - prevEnd.getTime()
    const gapAfter = nextStart.getTime() - slotEnd.getTime()
    const touchesSomething = gapBefore <= 0 || gapAfter <= 0
    const beforeOk = gapBefore <= 0 || gapBefore >= minMs
    const afterOk = gapAfter <= 0 || gapAfter >= minMs

    if (touchesSomething && beforeOk && afterOk) recommended.add(slot)
  }

  return recommended
}
