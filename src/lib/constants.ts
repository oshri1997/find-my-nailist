// Zero-dependency constants — safe to import from both client and server code
// without pulling in server-only modules (unlike src/lib/admin-auth.ts, which
// also exports request-verification helpers that import next/server).
export const ADMIN_EMAIL = 'oshri19970@gmail.com'
