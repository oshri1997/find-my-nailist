'use client'

import Link from 'next/link'

const DASHBOARD_HREF: Record<'NAILIST' | 'CLIENT', string> = {
  NAILIST: '/dashboard/nailist',
  CLIENT: '/search',
}

const ROLE_LABEL: Record<'NAILIST' | 'CLIENT', string> = {
  NAILIST: 'נייליסטית',
  CLIENT: 'לקוחה',
}

export function AlreadyRegisteredModal({ role, onClose }: { role: 'NAILIST' | 'CLIENT' | null; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4" onClick={onClose}>
      <div
        className="bg-card border border-border rounded-2xl p-6 max-w-sm w-full space-y-4 text-center"
        dir="rtl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-black text-foreground text-lg">
          {role ? `את כבר רשומה כ${ROLE_LABEL[role]}!` : 'את כבר מחוברת!'}
        </h3>
        <p className="text-sm text-muted-foreground">אין צורך להירשם שוב עם אותו חשבון.</p>
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 bg-muted text-foreground rounded-xl py-2.5 text-sm font-bold hover:bg-muted/70 transition-colors"
          >
            סגירה
          </button>
          <Link
            href={role ? DASHBOARD_HREF[role] : '/'}
            onClick={onClose}
            className="flex-1 bg-primary text-primary-foreground rounded-xl py-2.5 text-sm font-bold hover:bg-primary/90 transition-colors flex items-center justify-center"
          >
            {role === 'NAILIST' ? 'לדשבורד שלי' : role === 'CLIENT' ? 'לחיפוש נייליסטיות' : 'לדף הבית'}
          </Link>
        </div>
      </div>
    </div>
  )
}
