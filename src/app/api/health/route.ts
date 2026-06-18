import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'find-my-nailist',
    timestamp: new Date().toISOString(),
  })
}
