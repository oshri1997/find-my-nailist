/**
 * Converts an Israeli phone number to a Bit deep link.
 *
 * Confirmed on a real device: `bit://` is a registered scheme and this does
 * open the Bit app, but the `phone`/`amount` path+query aren't a documented
 * contract, so the app does NOT pre-fill the recipient or amount from them —
 * pre-filling a P2P transfer like this requires a registered "Bit for
 * business" merchant integration, which is out of scope (see the deposit
 * feature's design notes). Treat this link purely as a shortcut that saves
 * hunting for the app; the UI must always also render
 * `formatBitPhoneDisplay`'s plain phone number AND the amount with copy
 * actions alongside it, since the client still has to paste both in herself.
 */
export function toBitUrl(phone: string, amount?: number): string {
  const digits = phone.replace(/\D/g, '')
  const international = digits.startsWith('0')
    ? `972${digits.slice(1)}`
    : digits.startsWith('972')
    ? digits
    : digits

  const params = amount ? `?amount=${amount}` : ''
  return `bit://pay/${international}${params}`
}

/**
 * Presentation-only formatting for the copy-fallback UI, e.g. 050-123-4567.
 * Handles the same Israeli phone shapes as toBitUrl (leading 0, or 972).
 */
export function formatBitPhoneDisplay(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  const local = digits.startsWith('972') ? `0${digits.slice(3)}` : digits
  if (local.length !== 10) return phone
  return `${local.slice(0, 3)}-${local.slice(3, 6)}-${local.slice(6)}`
}
