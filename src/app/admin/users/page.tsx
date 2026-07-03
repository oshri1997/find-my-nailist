'use client'

import { useState, useEffect } from 'react'
import { Search, Trash2, Loader2, User, Scissors } from 'lucide-react'
import { useAuth } from '@/components/auth/auth-provider'

interface AdminUser {
  id: string
  email: string
  displayName: string
  photoUrl: string | null
  role: string
  isAdmin: boolean
  createdAt: string | null
}

const ROLE_COLORS: Record<string, string> = {
  CLIENT: 'bg-blue-50 text-blue-600 border-blue-200',
  NAILIST: 'bg-pink-50 text-primary border-pink-200',
}

export default function AdminUsersPage() {
  const { user: adminUser, refreshRole } = useAuth()
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [deleting, setDeleting] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<AdminUser | null>(null)
  const [changingRole, setChangingRole] = useState<string | null>(null)

  useEffect(() => {
    const q = search ? `?search=${encodeURIComponent(search)}` : ''
    fetch(`/api/admin/users${q}`)
      .then(r => r.json())
      .then(j => { setUsers(j.data ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [search])

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

  const filtered = users.filter(u => {
    const s = search.toLowerCase()
    return !s || u.email.toLowerCase().includes(s) || u.displayName.toLowerCase().includes(s)
  })

  return (
    <div className="p-4 md:p-8 space-y-5 md:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-foreground">ניהול משתמשים</h1>
          <p className="text-muted-foreground text-sm mt-1">{users.length} משתמשים סה״כ</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="חיפוש לפי אימייל / שם..."
          className="w-full pr-10 pl-4 py-2.5 bg-card border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

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
                  <th className="text-right px-5 py-3 font-semibold text-muted-foreground">משתמש</th>
                  <th className="text-right px-5 py-3 font-semibold text-muted-foreground">אימייל</th>
                  <th className="text-right px-5 py-3 font-semibold text-muted-foreground">תפקיד</th>
                  <th className="text-right px-5 py-3 font-semibold text-muted-foreground">הצטרף</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map(u => (
                  <tr key={u.id} className="hover:bg-muted/20 transition-colors">
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
                    <td className="px-5 py-3 text-muted-foreground">
                      {u.createdAt ? new Date(u.createdAt).toLocaleDateString('he-IL') : '—'}
                    </td>
                    <td className="px-5 py-3">
                      {!u.isAdmin && (
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
                      )}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-5 py-12 text-center text-muted-foreground">אין תוצאות</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Confirm delete modal */}
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
    </div>
  )
}
