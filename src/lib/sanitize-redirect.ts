// Only ever redirect to a same-origin relative path — a bare "https://..." or
// "//evil.com" (protocol-relative) value here would otherwise send a user who
// just authenticated straight to an attacker's page (open redirect).
export function sanitizeRedirect(path: string | null): string {
  if (!path || !path.startsWith('/') || path.startsWith('//') || path.startsWith('/\\')) return ''
  return path
}
