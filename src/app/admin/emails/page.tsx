'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Search, Loader2, Mail, MailCheck, Send, AlertCircle, CheckCircle2, X } from 'lucide-react'

interface EmailRecipient {
  id: string
  email: string
  displayName: string
  role: string
  emailVerified: boolean | null
  emailDeliveryStatus: 'BOUNCED' | 'SUPPRESSED' | null
}

interface SendResult {
  sent: { id: string; email: string }[]
  skipped: { id: string; email: string; reason: string }[]
  failed: { id: string; email: string; error: string }[]
}

type Template = 'VERIFICATION' | 'CUSTOM'

const MAX_RECIPIENTS = 100

export default function AdminEmailsPage() {
  const [users, setUsers] = useState<EmailRecipient[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [unverifiedOnly, setUnverifiedOnly] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [selectedRecipients, setSelectedRecipients] = useState<Record<string, EmailRecipient>>({})
  const [template, setTemplate] = useState<Template>('VERIFICATION')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<SendResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [confirmSend, setConfirmSend] = useState(false)
  const [operationId, setOperationId] = useState<string | null>(null)

  const fetchUsers = useCallback(async (signal?: AbortSignal) => {
    setLoading(true)
    const params = new URLSearchParams({ withEmailVerified: '1' })
    if (search) params.set('search', search)
    if (roleFilter) params.set('role', roleFilter)
    try {
      const response = await fetch(`/api/admin/users?${params.toString()}`, { signal })
      const json = await response.json()
      if (!response.ok) throw new Error(json?.error ?? 'טעינת המשתמשים נכשלה')
      setUsers(json.data ?? [])
    } catch (fetchError) {
      if ((fetchError as DOMException).name !== 'AbortError') {
        setError('לא ניתן לטעון את רשימת המשתמשים. נסי שוב.')
      }
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [search, roleFilter])

  useEffect(() => {
    const controller = new AbortController()
    const timer = setTimeout(() => { void fetchUsers(controller.signal) }, search ? 250 : 0)
    return () => { clearTimeout(timer); controller.abort() }
  }, [fetchUsers, search])

  const visible = useMemo(
    () => unverifiedOnly ? users.filter(u => u.emailVerified === false) : users,
    [users, unverifiedOnly]
  )

  const selectedVisible = visible.filter(u => selected.has(u.id))
  const selectableVisible = visible.filter(u => !u.emailDeliveryStatus)
  const selectedSelectableVisible = selectableVisible.filter(u => selected.has(u.id))

  function toggleSelected(user: EmailRecipient) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(user.id)) next.delete(user.id)
      else next.add(user.id)
      return next
    })
    setSelectedRecipients(prev => {
      const next = { ...prev }
      if (next[user.id]) delete next[user.id]
      else next[user.id] = user
      return next
    })
  }

  function toggleSelectAll() {
    const shouldClear = selectedSelectableVisible.length === selectableVisible.length
    setSelected(prev => {
      const next = new Set(prev)
      selectableVisible.forEach(user => shouldClear ? next.delete(user.id) : next.add(user.id))
      return next
    })
    setSelectedRecipients(prev => {
      const next = { ...prev }
      selectableVisible.forEach(user => shouldClear ? delete next[user.id] : next[user.id] = user)
      return next
    })
  }

  async function handleSend() {
    setSending(true)
    setResult(null)
    setError(null)
    const requestId = operationId ?? crypto.randomUUID()
    setOperationId(requestId)
    try {
      const res = await fetch('/api/admin/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template,
          userIds: Array.from(selected),
          operationId: requestId,
          ...(template === 'CUSTOM' ? { subject, message } : {}),
        }),
      })
      const json = await res.json().catch(() => null)
      if (!res.ok) {
        setError(json?.error ?? 'שליחת המיילים נכשלה')
        return
      }

      const sendResult = json.data as SendResult
      setResult(sendResult)
      const retryIds = new Set(sendResult.failed.map(item => item.id))
      if (retryIds.size > 0) {
        setSelected(retryIds)
        setSelectedRecipients(prev => Object.fromEntries(
          Object.entries(prev).filter(([id]) => retryIds.has(id))
        ))
      } else {
        setSelected(new Set())
        setSelectedRecipients({})
        setOperationId(null)
        if (template === 'CUSTOM') { setSubject(''); setMessage('') }
      }
      // A verification send can correct a stale address on the user doc, so
      // refresh rather than leave the list showing pre-send state.
      void fetchUsers()
    } catch {
      setError('לא ניתן לוודא אם המיילים הועברו לשליחה. נסי שוב — הודעה חופשית לא תישלח פעמיים.')
    } finally {
      setSending(false)
    }
  }

  const canSend =
    selected.size > 0 &&
    selected.size <= MAX_RECIPIENTS &&
    (template === 'VERIFICATION' || (subject.trim() !== '' && message.trim() !== ''))
  const selectedList = Array.from(selected)
    .map(id => selectedRecipients[id])
    .filter((user): user is EmailRecipient => Boolean(user))
  const hiddenSelectedCount = selected.size - selectedVisible.length

  return (
    <div className="p-4 md:p-8 space-y-5 md:space-y-6">
      <div>
        <h1 className="text-2xl font-black text-foreground">שליחת מיילים</h1>
        <p className="text-muted-foreground text-sm mt-1">
          בחרי נמענים ושלחי להם מייל אימות נוסף או הודעה מותאמת אישית
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        {/* Recipient picker */}
        <div className="bg-card border border-border rounded-2xl p-4 md:p-5 space-y-4">
          <h2 className="font-black text-foreground">נמענים</h2>

          <div className="flex flex-wrap items-end gap-3">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="חיפוש לפי אימייל / שם..."
                className="w-full pr-10 pl-4 py-2.5 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <select
              value={roleFilter}
              onChange={e => setRoleFilter(e.target.value)}
              aria-label="תפקיד"
              className="px-3 py-2.5 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="">כל התפקידים</option>
              <option value="CLIENT">לקוח</option>
              <option value="NAILIST">נייליסטית</option>
            </select>
          </div>

          <div className="flex items-center justify-between gap-3 flex-wrap">
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={unverifiedOnly}
                onChange={e => setUnverifiedOnly(e.target.checked)}
              />
              רק מיילים שלא אומתו
            </label>
            <button
              onClick={toggleSelectAll}
              disabled={selectableVisible.length === 0}
              className="text-xs font-bold text-primary hover:underline disabled:opacity-40 disabled:no-underline"
            >
              {selectedSelectableVisible.length === selectableVisible.length && selectableVisible.length > 0 ? 'נקה בחירה' : 'בחר הכל'}
            </button>
          </div>

          {selected.size > 0 && (
            <div className="flex items-center justify-between gap-3 rounded-xl bg-primary/5 border border-primary/15 px-3 py-2 text-xs">
              <span className="font-semibold text-foreground">
                נבחרו {selected.size} נמענים{hiddenSelectedCount > 0 ? `, כולל ${hiddenSelectedCount} שאינם מוצגים כרגע` : ''}
              </span>
              <button
                onClick={() => { setSelected(new Set()); setSelectedRecipients({}) }}
                className="font-bold text-primary hover:underline"
              >
                נקה בחירה
              </button>
            </div>
          )}

          <div className="border border-border rounded-xl max-h-[420px] overflow-y-auto divide-y divide-border">
            {loading ? (
              <div className="p-10 flex justify-center">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : visible.length === 0 ? (
              <p className="p-10 text-center text-sm text-muted-foreground">אין תוצאות</p>
            ) : (
              visible.map(u => (
                <label
                  key={u.id}
                  className={`flex items-center gap-3 px-4 py-2.5 transition-colors ${u.emailDeliveryStatus ? 'opacity-60 cursor-not-allowed' : 'hover:bg-muted/20 cursor-pointer'}`}
                >
                  <input
                    type="checkbox"
                    checked={selected.has(u.id)}
                    onChange={() => toggleSelected(u)}
                    disabled={!!u.emailDeliveryStatus}
                    aria-label={`בחר את ${u.email}`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">{u.displayName || '—'}</p>
                    <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                  </div>
                  {u.emailVerified === false && (
                    <span className="px-2 py-0.5 rounded-lg text-[11px] font-semibold border bg-warning/10 text-warning border-warning/20 shrink-0">
                      לא אומת
                    </span>
                  )}
                  {u.emailDeliveryStatus === 'BOUNCED' && (
                    <span className="px-2 py-0.5 rounded-lg text-[11px] font-semibold border bg-destructive/10 text-destructive border-destructive/20 shrink-0">
                      מייל חזר
                    </span>
                  )}
                  {u.emailDeliveryStatus === 'SUPPRESSED' && (
                    <span className="px-2 py-0.5 rounded-lg text-[11px] font-semibold border bg-warning/10 text-warning border-warning/20 shrink-0">
                      חסום לשליחה
                    </span>
                  )}
                </label>
              ))
            )}
          </div>
        </div>

        {/* Composer */}
        <div className="bg-card border border-border rounded-2xl p-4 md:p-5 space-y-4">
          <h2 className="font-black text-foreground">תוכן המייל</h2>

          <div className="grid sm:grid-cols-2 gap-3">
            <button
              onClick={() => setTemplate('VERIFICATION')}
              aria-pressed={template === 'VERIFICATION'}
              className={`flex items-start gap-3 p-3 rounded-xl border text-right transition-all ${
                template === 'VERIFICATION'
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/40'
              }`}
            >
              <MailCheck className={`w-4 h-4 mt-0.5 shrink-0 ${template === 'VERIFICATION' ? 'text-primary' : 'text-muted-foreground'}`} />
              <span>
                <span className="block text-sm font-bold text-foreground">מייל אימות</span>
                <span className="block text-xs text-muted-foreground mt-0.5">
                  שליחה חוזרת של קישור אימות, גם אחרי תיקון כתובת
                </span>
              </span>
            </button>
            <button
              onClick={() => setTemplate('CUSTOM')}
              aria-pressed={template === 'CUSTOM'}
              className={`flex items-start gap-3 p-3 rounded-xl border text-right transition-all ${
                template === 'CUSTOM'
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/40'
              }`}
            >
              <Mail className={`w-4 h-4 mt-0.5 shrink-0 ${template === 'CUSTOM' ? 'text-primary' : 'text-muted-foreground'}`} />
              <span>
                <span className="block text-sm font-bold text-foreground">הודעה מותאמת</span>
                <span className="block text-xs text-muted-foreground mt-0.5">
                  נושא ותוכן חופשי בעיצוב של האתר
                </span>
              </span>
            </button>
          </div>

          {template === 'CUSTOM' ? (
            <>
              <div>
                <label htmlFor="email-subject" className="block text-xs text-muted-foreground mb-1">נושא</label>
                <input
                  id="email-subject"
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  maxLength={150}
                  className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div>
                <label htmlFor="email-message" className="block text-xs text-muted-foreground mb-1">תוכן ההודעה</label>
                <textarea
                  id="email-message"
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  maxLength={5000}
                  rows={9}
                  className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-y"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  המייל נפתח ב״שלום [שם]״ ונחתם בשם צוות נייליסטיות.
                </p>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground bg-muted/30 rounded-xl p-4">
              לכל נמען שנבחר יישלח קישור אימות חדש. נמענים שכבר אימתו את כתובתם ידולגו,
              והכתובת שרשומה באתר תתעדכן לכתובת המעודכנת בחשבון.
            </p>
          )}

          {selected.size > MAX_RECIPIENTS && (
            <p className="text-sm text-destructive font-medium">
              נבחרו {selected.size} נמענים — ניתן לשלוח עד {MAX_RECIPIENTS} בפעולה אחת.
            </p>
          )}

          <button
            onClick={() => setConfirmSend(true)}
            disabled={!canSend || sending}
            className="w-full flex items-center justify-center gap-2 bg-primary text-white rounded-xl py-3 text-sm font-bold hover:bg-primary/90 transition-colors disabled:opacity-40"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            מעבר לאישור שליחה ל-{selected.size} נמענים
          </button>

          {error && (
            <div className="flex items-start gap-3 bg-destructive/5 border border-destructive/20 rounded-xl px-4 py-3">
              <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
              <p className="text-sm text-destructive flex-1">{error}</p>
              <button onClick={() => setError(null)} aria-label="סגירה" className="text-destructive/60 hover:text-destructive">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {result && (
            <div className="space-y-2 bg-muted/30 border border-border rounded-xl px-4 py-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-success" />
                <p className="text-sm font-semibold text-foreground">הועברו לשליחה {result.sent.length} מיילים</p>
                <button onClick={() => setResult(null)} aria-label="סגירה" className="mr-auto text-muted-foreground hover:text-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>
              {result.skipped.length > 0 && (
                <ul className="text-xs text-muted-foreground space-y-0.5">
                  {result.skipped.map(s => <li key={s.id}>דולג — {s.email || s.id}: {s.reason}</li>)}
                </ul>
              )}
              {result.failed.length > 0 && (
                <ul className="text-xs text-destructive space-y-0.5">
                  {result.failed.map(f => <li key={f.id}>נכשל — {f.email || f.id}: {f.error}</li>)}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>

      {confirmSend && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="confirm-email-send-title">
          <button aria-label="סגירת אישור שליחה" onClick={() => !sending && setConfirmSend(false)} className="absolute inset-0 bg-black/50" />
          <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 space-y-4 shadow-xl">
            <h2 id="confirm-email-send-title" className="font-black text-foreground">אישור שליחה</h2>
            <p className="text-sm text-muted-foreground">
              {template === 'VERIFICATION'
                ? `קישור אימות חדש יועבר לשליחה ל-${selected.size} נמענים.`
                : `ההודעה “${subject}” תועבר לשליחה ל-${selected.size} נמענים.`}
            </p>
            <ul className="max-h-40 overflow-y-auto rounded-xl border border-border divide-y divide-border text-xs">
              {selectedList.map(user => <li key={user.id} className="px-3 py-2">{user.displayName || 'ללא שם'} — {user.email}</li>)}
              {selectedList.length < selected.size && <li className="px-3 py-2 text-muted-foreground">ועוד {selected.size - selectedList.length} נמענים</li>}
            </ul>
            <p className="text-xs text-muted-foreground">המערכת תאשר שהבקשה התקבלה לשליחה; מסירה בפועל עשויה להתעדכן מאוחר יותר.</p>
            <div className="flex gap-3">
              <button autoFocus onClick={() => { setConfirmSend(false); void handleSend() }} disabled={sending} className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-bold text-white hover:bg-primary/90 disabled:opacity-40">העבירי לשליחה</button>
              <button onClick={() => setConfirmSend(false)} disabled={sending} className="flex-1 rounded-xl bg-muted py-2.5 text-sm font-bold text-foreground hover:bg-muted/70">ביטול</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
