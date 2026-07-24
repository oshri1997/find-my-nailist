// Lenient about formatting (spaces, dashes, parens, +972/972 country code)
// but strict about shape — the digit count must match a real Israeli mobile
// (10 digits, 05X-XXXXXXX) or landline (9 digits, 0X-XXXXXXX) number, so
// obvious garbage (too short, too long, non-numeric) is rejected instead of
// silently accepted.
export function isValidIsraeliPhone(raw: string): boolean {
  const digits = raw.replace(/[\s\-()]/g, '')
  let local = digits
  if (local.startsWith('+972')) local = '0' + local.slice(4)
  else if (local.startsWith('972')) local = '0' + local.slice(3)
  return /^0\d{8,9}$/.test(local)
}

export const PHONE_INVALID_MESSAGE = 'מספר טלפון אינו תקין'
