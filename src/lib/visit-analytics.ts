export const VISIT_SOURCES = ['google', 'direct', 'other'] as const

export type VisitSource = (typeof VISIT_SOURCES)[number]

export function classifyVisitSource(referrer: string): VisitSource {
  if (!referrer) return 'direct'

  try {
    const hostname = new URL(referrer).hostname.toLowerCase()
    return /(^|\.)google\./.test(hostname)
      ? 'google'
      : 'other'
  } catch {
    return 'other'
  }
}
