'use client'

import { useState, useEffect } from 'react'
import { Loader2, History } from 'lucide-react'

interface AuditLogEntry {
  id: string
  actorEmail: string
  action: string
  targetType: string
  targetId: string
  metadata: Record<string, unknown>
  createdAt: string | null
}

const ACTION_LABELS: Record<string, string> = {
  USER_ROLE_CHANGE: 'שינוי תפקיד',
  USER_DELETE: 'מחיקת משתמש',
  USER_SUSPEND: 'השעיית משתמש',
  USER_UNSUSPEND: 'ביטול השעיה',
  REVIEW_DELETE: 'מחיקת ביקורת',
  NAILIST_TOGGLE_ACTIVE: 'שינוי סטטוס נייליסטית',
  NAILIST_TOGGLE_VERIFIED: 'שינוי אימות נייליסטית',
}

function describe(entry: AuditLogEntry): string {
  const m = entry.metadata
  switch (entry.action) {
    case 'USER_ROLE_CHANGE':
      return `${m.targetEmail ?? entry.targetId}: ${m.oldRole ?? '—'} ← ${m.newRole ?? '—'}`
    case 'USER_DELETE':
      return `${m.email ?? entry.targetId}${m.role ? ` (${m.role})` : ''}`
    case 'USER_SUSPEND':
    case 'USER_UNSUSPEND':
      return `${m.email ?? entry.targetId}`
    case 'REVIEW_DELETE':
      return `דירוג ${m.rating ?? '—'} מאת ${m.clientDisplayName || 'לקוחה'}`
    case 'NAILIST_TOGGLE_ACTIVE':
      return m.isActive ? 'הופעלה' : 'הושבתה'
    case 'NAILIST_TOGGLE_VERIFIED':
      return m.isVerified ? 'אומתה' : 'בוטל אימות'
    default:
      return entry.targetId
  }
}

export default function AdminAuditLogPage() {
  const [entries, setEntries] = useState<AuditLogEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/audit-log')
      .then(r => r.json())
      .then(j => { setEntries(j.data ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  return (
    <div className="p-4 md:p-8 space-y-5 md:space-y-6">
      <div>
        <h1 className="text-2xl font-black text-foreground flex items-center gap-2">
          <History className="w-5 h-5" />
          יומן פעולות אדמין
        </h1>
        <p className="text-muted-foreground text-sm mt-1">200 הפעולות האחרונות</p>
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-right px-5 py-3 font-semibold text-muted-foreground">מבצע/ת</th>
                  <th className="text-right px-5 py-3 font-semibold text-muted-foreground">פעולה</th>
                  <th className="text-right px-5 py-3 font-semibold text-muted-foreground">פרטים</th>
                  <th className="text-right px-5 py-3 font-semibold text-muted-foreground">תאריך</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {entries.map(e => (
                  <tr key={e.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-5 py-3 font-medium text-foreground">{e.actorEmail || '—'}</td>
                    <td className="px-5 py-3 text-foreground">{ACTION_LABELS[e.action] ?? e.action}</td>
                    <td className="px-5 py-3 text-muted-foreground max-w-md truncate">{describe(e)}</td>
                    <td className="px-5 py-3 text-muted-foreground whitespace-nowrap">
                      {e.createdAt ? new Date(e.createdAt).toLocaleString('he-IL') : '—'}
                    </td>
                  </tr>
                ))}
                {entries.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-5 py-12 text-center text-muted-foreground">אין פעולות עדיין</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
