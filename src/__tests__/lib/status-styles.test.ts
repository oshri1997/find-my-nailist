/**
 * Locks the shared status-chip palette contract: every appointment/deposit
 * status has an entry, and every colored entry carries dark-mode variants —
 * the whole reason this module exists (the palette was previously duplicated
 * across five pages with drift and no dark styling).
 */
import { APPOINTMENT_STATUS_COLORS, DEPOSIT_STATUS_COLORS } from '@/lib/status-styles'

describe('APPOINTMENT_STATUS_COLORS', () => {
  it('covers every appointment status', () => {
    expect(Object.keys(APPOINTMENT_STATUS_COLORS).sort()).toEqual(
      ['CANCELLED', 'COMPLETED', 'CONFIRMED', 'NO_SHOW', 'PENDING'].sort()
    )
  })

  it('every colored chip has dark-mode variants (NO_SHOW uses theme tokens, exempt)', () => {
    for (const [status, classes] of Object.entries(APPOINTMENT_STATUS_COLORS)) {
      if (status === 'NO_SHOW') continue
      expect(classes).toContain('dark:')
    }
  })
})

describe('DEPOSIT_STATUS_COLORS', () => {
  it('covers every deposit status with dark-capable classes', () => {
    expect(Object.keys(DEPOSIT_STATUS_COLORS).sort()).toEqual(
      ['AWAITING_PAYMENT', 'CLIENT_MARKED_PAID', 'NAILIST_CONFIRMED'].sort()
    )
    for (const classes of Object.values(DEPOSIT_STATUS_COLORS)) {
      expect(classes).toContain('dark:')
    }
  })
})
