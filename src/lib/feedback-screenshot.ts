// Browser-safe validation shared by the feedback form and uploader. This file
// deliberately has no Firebase imports so merely opening the form does not
// initialize the SDK (or require fetch in non-browser test environments).
export const FEEDBACK_SCREENSHOT_MAX_BYTES = 5 * 1024 * 1024
const FEEDBACK_SCREENSHOT_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp'])

export function validateFeedbackScreenshot(file: File): string | null {
  if (!FEEDBACK_SCREENSHOT_TYPES.has(file.type)) return 'אפשר לצרף רק PNG, JPEG או WebP.'
  if (file.size > FEEDBACK_SCREENSHOT_MAX_BYTES) return 'גודל התמונה המקסימלי הוא 5MB.'
  return null
}
