<div align="center">

# Nailistiot

**The booking platform connecting clients with nail artists across Israel**

[![Release & Deploy](https://github.com/oshri1997/find-my-nailist/actions/workflows/railway.yml/badge.svg)](https://github.com/oshri1997/find-my-nailist/actions/workflows/railway.yml)
[![CI](https://github.com/oshri1997/find-my-nailist/actions/workflows/ci.yml/badge.svg)](https://github.com/oshri1997/find-my-nailist/actions/workflows/ci.yml)
[![Latest Release](https://img.shields.io/github/v/release/oshri1997/find-my-nailist?logo=github&label=release)](https://github.com/oshri1997/find-my-nailist/releases)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Deployed on Railway](https://img.shields.io/badge/deployed%20on-Railway-blueviolet?logo=railway)](https://nailistiot.fun)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js&logoColor=white)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Firebase](https://img.shields.io/badge/Firebase-Firestore-orange?logo=firebase)](https://firebase.google.com)

[**Live App →**](https://nailistiot.fun) &nbsp;·&nbsp; [Report a Bug](https://github.com/oshri1997/find-my-nailist/issues) &nbsp;·&nbsp; [Request a Feature](https://github.com/oshri1997/find-my-nailist/issues)

</div>

---

## Overview

נייליסטיות is a full-stack booking platform for nail artists in Israel. Clients discover artists by location, browse portfolios, and book appointments in a few taps. Nail artists get a public profile page, an appointment dashboard, and automatic email notifications — no native app required.

## Features

- **Discovery** — search nail artists by city or GPS location; filter by service (gel, acrylic, nail art, pedicure…)
- **Smart booking** — 21-day visual date strip, real-time slot availability, one-click appointment request
- **Nailist dashboard** — manage incoming requests, confirm / cancel, track appointment history
- **Email notifications** — Hebrew RTL emails for booking requests and confirmations via Resend
- **Portfolio & map** — photo gallery per nailist; pins on Google Maps in the search view
- **Auth** — Firebase Auth with email/password and Google OAuth

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, TypeScript) |
| Styling | Tailwind CSS + shadcn/ui |
| Database | Firebase Firestore |
| Auth | Firebase Authentication |
| Storage | Firebase Storage |
| Email | Resend |
| Maps | Google Maps JavaScript API |
| Deployment | Railway (Docker, `node server.js`) |
| CI/CD | GitHub Actions + semantic-release |

## Getting Started

### Prerequisites

- Node.js 20+
- Firebase project with Firestore, Auth, and Storage enabled
- [Resend](https://resend.com) account for email
- Google Maps API key *(optional — map view only)*

### Installation

```bash
git clone https://github.com/oshri1997/find-my-nailist
cd find-my-nailist
npm install
cp .env.example .env.local   # then fill in your values
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | ✅ | Firebase project API key |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | ✅ | Firebase Auth domain |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | ✅ | Firebase project ID |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | ✅ | Firebase Storage bucket |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | ✅ | Firebase messaging sender ID |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | ✅ | Firebase app ID |
| `FIREBASE_ADMIN_PROJECT_ID` | ✅ | Service-account project ID (server-side) |
| `FIREBASE_ADMIN_CLIENT_EMAIL` | ✅ | Service-account email |
| `FIREBASE_ADMIN_PRIVATE_KEY` | ✅ | Service-account private key (include `"` quotes) |
| `RESEND_API_KEY` | ✅ | Resend API key for email delivery |
| `NEXT_PUBLIC_APP_URL` | ✅ | Full public URL (e.g. `https://nailistiot.fun`) |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | ❌ | Google Maps key (client-side map view) |
| `GOOGLE_MAPS_API_KEY` | ❌ | Google Maps key (server-side place details) |
| `DEBUG_EMAIL_SECRET` | ❌ | Secret for `GET /api/debug/email` test endpoint |

## CI/CD Pipeline

### On push to `main` (after PR merge)

```
Lint · Type · Test  →  Build  →  Semantic Release  →  Deploy to Railway
```

### On feature branches and pull requests

```
Lint · Type · Test  →  Build
```

Versioning follows [Conventional Commits](https://www.conventionalcommits.org/):

| Commit prefix | Version bump |
|---|---|
| `fix:` | patch — `1.0.x` |
| `feat:` | minor — `1.x.0` |
| `feat!:` / `BREAKING CHANGE` | major — `x.0.0` |
| `chore:`, `ci:`, `docs:` | no release |

The `[skip ci]` tag on semantic-release's version-bump commit prevents infinite pipeline loops.

### Required GitHub Secrets

| Name | Description |
|---|---|
| `RAILWAY_TOKEN` | Railway project token (project → Settings → Tokens) |
| `RAILWAY_PROJECT_ID` | Railway project ID |

## Contributing

1. Fork and create a branch: `git checkout -b feature/my-feature`
2. Commit with conventional commits: `git commit -m "feat: add something"`
3. Open a pull request to `main` — CI runs automatically on the PR

## License

[MIT](LICENSE) © 2025 Oshri Moalem
