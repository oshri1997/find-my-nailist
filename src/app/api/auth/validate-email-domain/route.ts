import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { validateEmailDomain } from '@/lib/email-domain'

export const runtime = 'nodejs'

const schema = z.object({ email: z.string().trim().email() })

export async function POST(request: NextRequest) {
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'כתובת אימייל לא תקינה' }, { status: 400 })

  const result = await validateEmailDomain(parsed.data.email)
  if (result.status === 'valid') return NextResponse.json({ valid: true })
  if (result.status === 'unavailable') {
    return NextResponse.json({ valid: false, reason: 'unavailable' }, { status: 503 })
  }
  return NextResponse.json({ valid: false, reason: result.reason })
}
