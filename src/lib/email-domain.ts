import { promises as dns } from 'node:dns'

export type EmailDomainValidation =
  | { status: 'valid' }
  | { status: 'invalid'; reason: 'domain-not-found' | 'does-not-accept-mail' }
  | { status: 'unavailable' }

function codeOf(error: unknown): string | undefined {
  return (error as { code?: string } | undefined)?.code
}

function isNoData(code: string | undefined) {
  return code === 'ENODATA' || code === 'ENOTFOUND'
}

/**
 * DNS cannot prove that a mailbox exists. It can only rule out domains that
 * do not exist or explicitly cannot receive mail. Ownership is proved later
 * by Firebase's verification link.
 */
export async function validateEmailDomain(email: string): Promise<EmailDomainValidation> {
  const domain = email.trim().toLowerCase().split('@')[1]
  if (!domain) return { status: 'invalid', reason: 'domain-not-found' }

  let mxMissing = false
  try {
    const mxRecords = await dns.resolveMx(domain)
    if (mxRecords.some((record) => record.exchange === '.')) {
      return { status: 'invalid', reason: 'does-not-accept-mail' }
    }
    if (mxRecords.length > 0) return { status: 'valid' }
    mxMissing = true
  } catch (error) {
    const code = codeOf(error)
    if (!isNoData(code)) return { status: 'unavailable' }
    mxMissing = true
  }

  // RFC 5321 allows an A/AAAA record to act as an implicit MX when MX is
  // absent, so a missing MX record alone must not reject a valid domain.
  const addresses = await Promise.allSettled([dns.resolve4(domain), dns.resolve6(domain)])
  if (addresses.some((result) => result.status === 'fulfilled' && result.value.length > 0)) {
    return { status: 'valid' }
  }

  const codes = addresses
    .filter((result): result is PromiseRejectedResult => result.status === 'rejected')
    .map((result) => codeOf(result.reason))

  if (codes.some((code) => !isNoData(code))) return { status: 'unavailable' }
  return mxMissing
    ? { status: 'invalid', reason: 'domain-not-found' }
    : { status: 'unavailable' }
}
