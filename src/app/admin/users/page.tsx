'use client'

import { useState, useEffect, useCallback } from 'react'
import { Search, Trash2, Loader2, User, Scissors, Ban, CheckCircle2 } from 'lucide-react'
import { useAuth } from '@/components/auth/auth-provider'

interface AdminUser {
  id: string
  email: string
  displayName: string
  photoUrl: string | null
  role: string
  isAdmin: boolean
  suspended: boolean
  createdAt: string | null
  onboardingCompleted: boolean | null
}

const ROLE_COLORS: Record<string, string> = {
  CLIENT: 'bg-blue-50 text-blue-600 border-blue-200',
  NAILIST: 'bg-pink-50 text-primary border-pink-200',
}

type BulkAction = 'suspend' | 'unsuspend' | 'delete'

export default function AdminUsersPage() {
  const { user: adminUser, refreshRole } = useAuth()
  const [users, setUsers] = useState<AdminUser[]>([])
  const [totalCount, setTotalCount] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [createdFrom, setCreatedFrom] = useState('')
  const [createdTo, setCreatedTo] = useState('')
  const [onboardingFilter, setOnboardingFilter] = useState('')
  const [deleting, setDeleting] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<AdminUser | null>(null)
  const [changingRole, setChangingRole] = useState<string | null>(null)
  const [togglingSuspend, setTogglingSuspend] = useState<string | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [confirmBulk, setConfirmBulk] = useState<BulkAction | null>(null)
  const [bulkRunning, setBulkRunning] = useState(false)

  const hasFilters = !!(search || roleFilter || createdFrom || createdTo || onboardingFilter)

  const fetchUsers = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (roleFilter) params.set('role', roleFilter)
    if (createdFrom) params.set('createdFrom', createdFrom)
    if (createdTo) params.set('createdTo', createdTo)
    if (onboardingFilter) params.set('onboardingStatus', onboardingFilter)
    const q = params.toString() ? `?${params.toString()}` : ''
    fetch(`/api/admin/users${q}`)
      .then(r => r.json())
      .then(j => { setUsers(j.data ?? []); setSelected(new Set()); setLoading(false) })
      .catch(() => setLoading(false))
  }, [search, roleFilter, createdFrom, createdTo, onboardingFilter])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchUsers()
  }, [fetchUsers])

  useEffect(() => {
    // The unfiltered list caps at 200 rows — pull the real uncapped total
    // from the stats endpoint so the header never understates the count.
    fetch('/api/admin/stats')
      .then(r => r.json())
      .then(j => { if (typeof j.data?.totalUsers === 'number') setTotalCount(j.data.totalUsers) })
      .catch(() => {})
  }, [])

  async function handleRoleChange(user: AdminUser, newRole: 'CLIENT' | 'NAILIST') {
    if (user.role === newRole) return
    setChangingRole(user.id)
    const res = await fetch(`/api/admin/users/${user.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: newRole }),
    })
    if (res.ok) {
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, role: newRole } : u))
      if (adminUser?.uid === user.id) {
        await refreshRole()
      }
    }
    setChangingRole(null)
  }

  async function handleDelete(user: AdminUser) {
    setDeleting(user.id)
    setConfirmDelete(null)
    const res = await fetch(`/api/admin/users/${user.id}`, { method: 'DELETE' })
    if (res.ok) {
      setUsers(prev => prev.filter(u => u.id !== user.id))
    }
    setDeleting(null)
  }

  async function handleToggleSuspend(user: AdminUser) {
    setTogglingSuspend(user.id)
    const res = await fetch('/api/admin/users/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: user.suspended ? 'unsuspend' : 'suspend', userIds: [user.id] }),
    })
    if (res.ok) {
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, suspended: !u.suspended } : u))
    }
    setTogglingSuspend(null)
  }

  function toggleSelected(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    const selectable = users.filter(u => !u.isAdmin)
    setSelected(prev =>
      prev.size === selectable.length ? new Set() : new Set(selectable.map(u => u.id))
    )
  }

  async function runBulkAction(action: BulkAction) {
    setBulkRunning(true)
    setConfirmBulk(null)
    const res = await fetch('/api/admin/users/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, userIds: Array.from(selected) }),
    })
    if (res.ok) {
      const { data } = await res.json()
      const succeededIds: string[] = data?.succeeded ?? []
      if (action === 'delete') {
        setUsers(prev => prev.filter(u => !succeededIds.includes(u.id)))
      } else {
        setUsers(prev => prev.map(u => succeededIds.includes(u.id) ? { ...u, suspended: action === 'suspend' } : u))
      }
    }
    setSelected(new Set())
    setBulkRunning(false)
  }

  const selectableCount = users.filter(u => !u.isAdmin).length

  return (
    <div className="p-4 md:p-8 space-y-5 md:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-foreground">ניהול משתמשים</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {hasFilters ? `${users.length} תוצאות` : `${totalCount ?? users.length} משתמשים סה״כ`}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="relative w-full max-w-sm">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="חיפוש לפי אימייל / שם..."
            className="w-full pr-10 pl-4 py-2.5 bg-card border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1">תפקיד</label>
          <select
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value)}
            className="px-3 py-2.5 bg-card border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="">הכל</option>
            <option value="CLIENT">לקוח</option>
            <option value="NAILIST">נייליסטית</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1">נרשם מ-</label>
          <input
            type="date"
            value={createdFrom}
            onChange={e => setCreatedFrom(e.target.value)}
            className="px-3 py-2.5 bg-card border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1">עד</label>
          <input
            type="date"
            value={createdTo}
            onChange={e => setCreatedTo(e.target.value)}
            className="px-3 py-2.5 bg-card border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1">סטטוס onboarding</label>
          <select
            value={onboardingFilter}
            onChange={e => setOnboardingFilter(e.target.value)}
            className="px-3 py-2.5 bg-card border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="">הכל</option>
            <option value="completed">הושלם</option>
            <option value="incomplete">לא הושלם</option>
          </select>
        </div>
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 bg-primary/5 border border-primary/20 rounded-xl px-4 py-3">
          <span className="text-sm font-semibold text-foreground">{selected.size} נבחרו</span>
          <button
            onClick={() => setConfirmBulk('suspend')}
            disabled={bulkRunning}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors disabled:opacity-40"
          >
            <Ban className="w-3.5 h-3.5" />
            השעה
          </button>
          <button
            onClick={() => setConfirmBulk('unsuspend')}
            disabled={bulkRunning}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 transition-colors disabled:opacity-40"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            בטל השעיה
          </button>
          <button
            onClick={() => setConfirmBulk('delete')}
            disabled={bulkRunning}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition-colors disabled:opacity-40"
          >
            <Trash2 className="w-3.5 h-3.5" />
            מחק
          </button>
          {bulkRunning && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
        </div>
      )}

      {/* Table */}
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
                  <th className="px-5 py-3 w-10">
                    <input
                      type="checkbox"
                      checked={selectableCount > 0 && selected.size === selectableCount}
                      onChange={toggleSelectAll}
                      disabled={selectableCount === 0}
                      aria-label="בחר הכל"
                    />
                  </th>
                  <th className="text-right px-5 py-3 font-semibold text-muted-foreground">משתמש</th>
                  <th className="text-right px-5 py-3 font-semibold text-muted-foreground">אימייל</th>
                  <th className="text-right px-5 py-3 font-semibold text-muted-foreground">תפקיד</th>
                  <th className="text-right px-5 py-3 font-semibold text-muted-foreground">סטטוס</th>
                  <th className="text-right px-5 py-3 font-semibold text-muted-foreground">הצטרף</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-5 py-3">
                      <input
                        type="checkbox"
                        checked={selected.has(u.id)}
                        onChange={() => toggleSelected(u.id)}
                        disabled={u.isAdmin}
                        aria-label={`בחר את ${u.email}`}
                      />
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        {u.photoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={u.photoUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                            {u.role === 'NAILIST' ? <Scissors className="w-3.5 h-3.5 text-muted-foreground" /> : <User className="w-3.5 h-3.5 text-muted-foreground" />}
                          </div>
                        )}
                        <span className="font-medium text-foreground">{u.displayName || '—'}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">{u.email}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {u.isAdmin && (
                          <span className="px-2.5 py-1 rounded-lg text-xs font-semibold border bg-purple-50 text-purple-600 border-purple-200">
                            אדמין
                          </span>
                        )}
                        {changingRole === u.id ? (
                          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                        ) : (
                          <>
                            <button
                              onClick={() => handleRoleChange(u, 'NAILIST')}
                              className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                                u.role === 'NAILIST'
                                  ? ROLE_COLORS.NAILIST
                                  : 'bg-muted/40 text-muted-foreground border-border hover:border-pink-300 hover:text-primary'
                              }`}
                            >
                              נייליסטית
                            </button>
                            <button
                              onClick={() => handleRoleChange(u, 'CLIENT')}
                              className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                                u.role === 'CLIENT'
                                  ? ROLE_COLORS.CLIENT
                                  : 'bg-muted/40 text-muted-foreground border-border hover:border-blue-300 hover:text-blue-600'
                              }`}
                            >
                              לקוח
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      {u.suspended ? (
                        <span className="px-2.5 py-1 rounded-lg text-xs font-semibold border bg-red-50 text-red-500 border-red-200">
                          מושעה
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-lg text-xs font-semibold border bg-green-50 text-green-600 border-green-200">
                          פעיל
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">
                      {u.createdAt ? new Date(u.createdAt).toLocaleDateString('he-IL') : '—'}
                    </td>
                    <td className="px-5 py-3">
                      {!u.isAdmin && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleToggleSuspend(u)}
                            disabled={togglingSuspend === u.id}
                            title={u.suspended ? 'בטל השעיה' : 'השעה'}
                            className="p-2 rounded-lg text-muted-foreground hover:text-amber-600 hover:bg-amber-50 transition-colors disabled:opacity-40"
                          >
                            {togglingSuspend === u.id
                              ? <Loader2 className="w-4 h-4 animate-spin" />
                              : u.suspended ? <CheckCircle2 className="w-4 h-4" /> : <Ban className="w-4 h-4" />
                            }
                          </button>
                          <button
                            onClick={() => setConfirmDelete(u)}
                            disabled={deleting === u.id}
                            className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-40"
                          >
                            {deleting === u.id
                              ? <Loader2 className="w-4 h-4 animate-spin" />
                              : <Trash2 className="w-4 h-4" />
                            }
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-muted-foreground">אין תוצאות</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Confirm single delete modal */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-2xl p-6 max-w-sm w-full space-y-4">
            <h3 className="font-black text-foreground">מחיקת משתמש</h3>
            <p className="text-sm text-muted-foreground">
              בטוח למחוק את <strong>{confirmDelete.email}</strong>?
              פעולה זו תמחק את כל הנתונים הקשורים למשתמש ואינה הפיכה.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => handleDelete(confirmDelete)}
                className="flex-1 bg-destructive text-destructive-foreground rounded-xl py-2.5 text-sm font-bold hover:bg-destructive/90 transition-colors"
              >
                מחק
              </button>
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 bg-muted text-foreground rounded-xl py-2.5 text-sm font-bold hover:bg-muted/70 transition-colors"
              >
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm bulk action modal */}
      {confirmBulk && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-2xl p-6 max-w-sm w-full space-y-4">
            <h3 className="font-black text-foreground">
              {confirmBulk === 'delete' ? 'מחיקת משתמשים' : confirmBulk === 'suspend' ? 'השעיית משתמשים' : 'ביטול השעיה'}
            </h3>
            <p className="text-sm text-muted-foreground">
              {confirmBulk === 'delete'
                ? `בטוח למחוק ${selected.size} משתמשים? פעולה זו תמחק את כל הנתונים הקשורים ואינה הפיכה.`
                : confirmBulk === 'suspend'
                  ? `להשעות ${selected.size} משתמשים? הם לא יוכלו להתחבר עד שתבטלי את ההשעיה.`
                  : `לבטל השעיה עבור ${selected.size} משתמשים?`}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => runBulkAction(confirmBulk)}
                className={`flex-1 rounded-xl py-2.5 text-sm font-bold transition-colors ${
                  confirmBulk === 'delete'
                    ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                    : 'bg-primary text-white hover:bg-primary/90'
                }`}
              >
                אישור
              </button>
              <button
                onClick={() => setConfirmBulk(null)}
                className="flex-1 bg-muted text-foreground rounded-xl py-2.5 text-sm font-bold hover:bg-muted/70 transition-colors"
              >
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
