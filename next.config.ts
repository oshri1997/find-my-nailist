import type { NextConfig } from 'next'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const { version } = JSON.parse(
  readFileSync(resolve(__dirname, 'package.json'), 'utf-8')
) as { version: string }

const nextConfig: NextConfig = {
  serverExternalPackages: [
    'firebase-admin',
    '@google-cloud/storage',
    '@google-cloud/firestore',
    'google-gax',
    '@grpc/grpc-js',
  ],
  env: {
    NEXT_PUBLIC_APP_VERSION: version,
  },
  output: 'standalone',
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'firebasestorage.googleapis.com' },
      { protocol: 'https', hostname: 'storage.googleapis.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin-allow-popups',
          },
        ],
      },
    ]
  },
}

export default nextConfig
