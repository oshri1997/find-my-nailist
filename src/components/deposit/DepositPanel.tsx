'use client'

import { useState } from 'react'
import { Check, CheckCircle2, Copy, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toBitUrl, formatBitPhoneDisplay } from '@/lib/bit'
import { isMobileDevice } from '@/lib/device'
import type { DepositStatus } from '@/types'

interface DepositPanelProps {
  amount: number
  bitPhone: string
  status: DepositStatus
  onMarkPaid: () => void
  marking: boolean
}

/**
 * Bit deposit instructions + status, shared between the booking-confirmation
 * modal and the client's ongoing appointments list — there is no real
 * payment API behind this yet (see src/lib/bit.ts), so this is deliberately
 * still copy-and-paste instructions, just consistent and revisitable instead
 * of living only in a one-time modal.
 */
export function DepositPanel({ amount, bitPhone, status, onMarkPaid, marking }: DepositPanelProps) {
  const [copiedPhone, setCopiedPhone] = useState(false)
  const [copiedAmount, setCopiedAmount] = useState(false)
  // bit:// only opens anything with the app installed — a dead click on
  // desktop web, so that flow gets plain transfer instructions instead.
  const [isMobile] = useState(() => typeof navigator !== 'undefined' && isMobileDevice(navigator.userAgent))

  async function copyPhone() {
    await navigator.clipboard.writeText(bitPhone)
    setCopiedPhone(true)
    setTimeout(() => setCopiedPhone(false), 2000)
  }

  async function copyAmount() {
    await navigator.clipboard.writeText(String(amount))
    setCopiedAmount(true)
    setTimeout(() => setCopiedAmount(false), 2000)
  }

  if (status === 'NAILIST_CONFIRMED') {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm font-bold text-green-700 dark:border-green-900/50 dark:bg-green-950/40 dark:text-green-400">
        <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
        המקדמה של ₪{amount} התקבלה ואושרה
      </div>
    )
  }

  return (
    <div className="bg-primary/10 border border-primary/20 rounded-2xl p-5 text-right">
      <p className="font-black text-foreground text-sm mb-1">נדרשת מקדמה של ₪{amount} דרך Bit</p>

      {status === 'CLIENT_MARKED_PAID' ? (
        <p className="text-xs text-muted-foreground font-medium">סימנת ששילמת — ממתינה לאישור הנייליסטית</p>
      ) : (
        <>
          {isMobile ? (
            <>
              <p className="text-xs text-muted-foreground mb-3">
                לחצי לפתיחת Bit, והדביקי בתוכה את המספר והסכום שהעתקת כאן. בסיום לחצי על &quot;כבר שילמתי&quot;
              </p>
              <a
                href={toBitUrl(bitPhone, amount)}
                className="flex items-center justify-center gap-2 bg-gradient-to-r from-primary to-primary/70 text-white rounded-xl h-11 font-bold text-sm mb-3"
              >
                פתחי את Bit
              </a>
            </>
          ) : (
            <p className="text-xs text-muted-foreground mb-3">
              פתחי את אפליקציית Bit בטלפון שלך והעבירי ₪{amount} למספר {formatBitPhoneDisplay(bitPhone)}. בסיום לחצי על &quot;כבר שילמתי&quot;
            </p>
          )}

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={copyPhone}
              aria-label="העתקת מספר טלפון לביט"
              className="flex items-center justify-center gap-2 bg-card border border-border rounded-xl h-11 font-bold text-sm text-foreground hover:border-primary/40 transition-colors"
            >
              {copiedPhone ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4 text-muted-foreground" />}
              {formatBitPhoneDisplay(bitPhone)}
            </button>
            <button
              type="button"
              onClick={copyAmount}
              aria-label="העתקת סכום המקדמה"
              className="flex items-center justify-center gap-2 bg-card border border-border rounded-xl h-11 font-bold text-sm text-foreground hover:border-primary/40 transition-colors"
            >
              {copiedAmount ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4 text-muted-foreground" />}
              ₪{amount}
            </button>
          </div>

          <Button
            onClick={onMarkPaid}
            disabled={marking}
            aria-label="כבר שילמתי"
            className="w-full mt-3 bg-card border border-primary/30 text-primary hover:bg-primary/10 rounded-xl h-11 font-bold text-sm"
          >
            {marking ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : 'כבר שילמתי'}
          </Button>
        </>
      )}
    </div>
  )
}
