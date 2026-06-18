import type { NextConfig } from 'next'

const FIREBASE_PROJECT = 'find-my-nailist'

const nextConfig: NextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'firebasestorage.googleapis.com' },
      { protocol: 'https', hostname: 'storage.googleapis.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
    ],
  },
  async rewrites() {
    return [
      {
        source: '/__/auth/:path*',
        destination: `https://${FIREBASE_PROJECT}.firebaseapp.com/__/auth/:path*`,
      },
      {
        source: '/__/firebase/:path*',
        destination: `https://${FIREBASE_PROJECT}.firebaseapp.com/__/firebase/:path*`,
      },
    ]
  },
}

export default nextConfig
