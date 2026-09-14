jest.mock('node:dns', () => ({
  promises: {
    resolveMx: jest.fn(),
    resolve4: jest.fn(),
    resolve6: jest.fn(),
  },
}))

import { promises as dns } from 'node:dns'
import { validateEmailDomain } from '@/lib/email-domain'

const mockedDns = dns as jest.Mocked<typeof dns>

describe('validateEmailDomain', () => {
  beforeEach(() => jest.resetAllMocks())

  it('accepts a domain with an MX record', async () => {
    mockedDns.resolveMx.mockResolvedValue([{ exchange: 'mx.example.com', priority: 10 }])

    await expect(validateEmailDomain('noa@example.com')).resolves.toEqual({ status: 'valid' })
  })

  it('rejects a domain that does not exist', async () => {
    const notFound = Object.assign(new Error('not found'), { code: 'ENOTFOUND' })
    mockedDns.resolveMx.mockRejectedValue(notFound)
    mockedDns.resolve4.mockRejectedValue(notFound)
    mockedDns.resolve6.mockRejectedValue(notFound)

    await expect(validateEmailDomain('noa@gmail.cimasdasd')).resolves.toEqual({
      status: 'invalid', reason: 'domain-not-found',
    })
  })

  it('accepts a domain with no MX when its A record is a valid implicit MX fallback', async () => {
    const noData = Object.assign(new Error('no data'), { code: 'ENODATA' })
    mockedDns.resolveMx.mockRejectedValue(noData)
    mockedDns.resolve4.mockResolvedValue(['203.0.113.10'])
    mockedDns.resolve6.mockRejectedValue(noData)

    await expect(validateEmailDomain('noa@business.example')).resolves.toEqual({ status: 'valid' })
  })
})
