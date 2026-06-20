/**
 * Converts an Israeli phone number to WhatsApp wa.me format.
 * Handles: 0501234567 / 050-123-4567 / +972501234567 / 972501234567
 */
export function toWhatsAppUrl(phone: string, message?: string): string {
  const digits = phone.replace(/\D/g, '')
  // Israeli numbers: starts with 0 → replace with 972
  const international = digits.startsWith('0')
    ? `972${digits.slice(1)}`
    : digits.startsWith('972')
    ? digits
    : digits

  const base = `https://wa.me/${international}`
  return message ? `${base}?text=${encodeURIComponent(message)}` : base
}

export function whatsAppBookingMessage(businessName: string): string {
  return `היי ${businessName}, ראיתי את הפרופיל שלך ב-nailistiot ורציתי לתאם תור 💅`
}
