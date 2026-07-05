import type { NextConfig } from 'next'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { withSentryConfig } from '@sentry/nextjs'

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

// Uploads source maps to Sentry at build time (needs SENTRY_AUTH_TOKEN/ORG/
// PROJECT — silently skipped without them, e.g. local dev or a fork's CI, so
// this never blocks a build) and sets up the /monitoring tunnel rewrite that
// instrumentation-client.ts's `tunnel` option routes through.
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: true,
  widenClientFileUpload: true,
  tunnelRoute: '/monitoring',
  sourcemaps: {
    deleteSourcemapsAfterUpload: true,
  },
  webpack: {
    treeshake: { removeDebugLogging: true },
  },
})
