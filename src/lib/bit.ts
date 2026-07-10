/**
 * Converts an Israeli phone number to a Bit payment deep link.
 *
 * ⚠️ UNVERIFIED: Bit has no published deep-link/merchant API for arbitrary
 * personal recipients — the scheme below is a best-effort guess, not a
 * documented or device-tested contract. Never rely on it alone: any UI using
 * this must always also render `formatBitPhoneDisplay`'s plain phone number
 * with a copy action alongside it, since a failed custom-URL-scheme
 * navigation can't be reliably detected from a web page.
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
