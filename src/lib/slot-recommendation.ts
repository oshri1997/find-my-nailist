import { israelWallClockToUtc } from './booking-utils'

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
 *   1. it's adjacent to an existing appointment or a shift boundary on at
 *      least one side (booking it consolidates busy time rather than
 *      opening a fresh isolated island of free time in the middle of the
 *      day), AND
 *   2. it doesn't leave a too-small sliver — one no active service could
 *      ever fill — on the OTHER side.
 * On a mostly-empty day this naturally surfaces just the first/last slot of
 * the shift; the more fragmented the day already is, the more slots
 * qualify, which is exactly when steering the client matters most.
 */
export function getRecommendedSlots(params: {
  date: string // "YYYY-MM-DD"
  shiftStartTime: string // "HH:MM"
  shiftEndTime: string
  bookedSlots: RecommendationBookedSlot[]
  candidateSlots: string[] // "HH:MM" — already filtered to bookable (non-past, non-overlapping) slots
  serviceDurationMinutes: number
  minServiceDurationMinutes: number // smallest active service duration — null/0 disables recommendations entirely
}): Set<string> {
  const {
    date, shiftStartTime, shiftEndTime, bookedSlots,
    candidateSlots, serviceDurationMinutes, minServiceDurationMinutes,
  } = params

  const recommended = new Set<string>()
  if (!minServiceDurationMinutes || minServiceDurationMinutes <= 0) return recommended

  const shiftStart = israelWallClockToUtc(date, shiftStartTime)
  const shiftEnd = israelWallClockToUtc(date, shiftEndTime)
  const minMs = minServiceDurationMinutes * 60_000

  const booked = bookedSlots
    .map((b) => ({ start: new Date(b.startTime), end: new Date(b.endTime) }))
    .filter((b) => b.start < shiftEnd && b.end > shiftStart)

  for (const slot of candidateSlots) {
    const slotStart = israelWallClockToUtc(date, slot)
    const slotEnd = new Date(slotStart.getTime() + serviceDurationMinutes * 60_000)

    // Nearest booked appointment ending at/before this slot, and nearest one
    // starting at/after it — everything else on the day is irrelevant to
    // whether THIS slot fragments the schedule.
    let prevEnd = shiftStart
    let nextStart = shiftEnd
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
