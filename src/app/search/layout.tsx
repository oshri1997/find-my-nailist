import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: "חפשי נייליסטית — ג'ל, מניקור ונייל ארט",
  description: "חפשי נייליסטית מקצועית קרוב אלייך — תל אביב, ירושלים, חיפה, ראשון לציון, פתח תקווה, נתניה, רמת גן ועוד. השווי, קראי ביקורות והזמיני תור בשניות.",
  alternates: { canonical: 'https://nailistiot.fun/search' },
}

export default function SearchLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
