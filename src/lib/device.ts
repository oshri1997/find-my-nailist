// The Bit deep link (bit://) only does anything on a phone with the Bit app
// installed — on desktop web it's a dead click. Detect device type from the
// UA string so the UI can swap the CTA for plain transfer instructions.
export function isMobileDevice(userAgent: string): boolean {
  return /Android|iPhone|iPad|iPod|Mobi/i.test(userAgent)
}
