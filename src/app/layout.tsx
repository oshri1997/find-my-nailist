import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/providers'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Find My Nailist | Discover Nail Technicians Near You',
  description:
    'Book appointments with talented nail technicians near you. Browse portfolios, compare prices, and schedule your next nail appointment.',
  keywords: ['nail technician', 'nail salon', 'nail art', 'gel nails', 'booking'],
  openGraph: {
    title: 'Find My Nailist',
    description: 'Discover and book nail technicians near you',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
