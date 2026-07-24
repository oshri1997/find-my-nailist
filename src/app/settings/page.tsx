'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Loader2, AlertCircle, CheckCircle2, Camera, Lock, Trash2, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/components/auth/auth-provider'
import { isValidIsraeliPhone, PHONE_INVALID_MESSAGE } from '@/lib/phone'

const MIN_PASSWORD_LENGTH = 8

function initials(name: string) {
  return (name || '?').slice(0, 1).toUpperCase()
}

function friendlyReauthError(err: unknown): string {
  const code = (err as { code?: string })?.code ?? ''
  const map: Record<string, string> = {
    'auth/wrong-password': 'הסיסמה שגויה',
    'auth/invalid-credential': 'הסיסמה שגויה',
    'auth/too-many-requests': 'יותר מדי ניסיונות — נסי שוב מאוחר יותר',
    'auth/popup-closed-by-user': 'החלון נסגר לפני סיום האימות',
    'auth/network-request-failed': 'בעיית חיבור — בדקי את האינטרנט',
  }
  return map[code] ?? 'שגיאת אימות — נסי שוב'
}

export default function SettingsPage() {
  const { user, role, loading: authLoading, signOut } = useAuth()
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [profileId, setProfileId] = useState<string | null>(null)
  const [hasPassword, setHasPassword] = useState(false)

  // Profile photo
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [photoUploading, setPhotoUploading] = useState(false)
  const [photoError, setPhotoError] = useState('')
  const photoInputRef = useRef<HTMLInputElement>(null)

  // Personal info (clients only — nailists manage business identity in
  // their own dashboard settings)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileSaved, setProfileSaved] = useState(false)
  const [profileError, setProfileError] = useState('')

  // Change password
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [showPasswords, setShowPasswords] = useState(false)
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordSaved, setPasswordSaved] = useState(false)
  const [passwordError, setPasswordError] = useState('')

  // Delete account
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deletePassword, setDeletePassword] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  useEffect(() => {
    if (authLoading) return
    if (!user) { router.replace('/login'); return }

    import('@/lib/firebase/auth-helpers').then(({ hasPasswordProvider }) => {
      setHasPassword(hasPasswordProvider(user))
    })

    if (role === 'NAILIST') {
      fetch('/api/me/nailist-profile')
        .then((r) => (r.ok ? r.json() : null))
        .then((json) => {
          const data = json?.data
          if (data) { setProfileId(data.id); setPhotoUrl(data.photoUrl ?? null) }
        })
        .catch(() => {})
        .finally(() => setLoading(false))
    } else {
      fetch('/api/me/client-profile')
        .then((r) => (r.ok ? r.json() : null))
        .then((json) => {
          const data = json?.data
          if (data) {
            setPhotoUrl(data.photoUrl ?? null)
            setFirstName(data.firstName ?? '')
            setLastName(data.lastName ?? '')
            setPhone(data.phoneNumber ?? '')
          }
        })
        .catch(() => {})
        .finally(() => setLoading(false))
    }
  }, [user, authLoading, role, router])

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !user) return

    if (file.size > 5 * 1024 * 1024) {
      setPhotoError('הקובץ גדול מדי — מקסימום 5MB')
      return
    }

    setPhotoError('')
    setPhotoUploading(true)
    try {
      const { uploadProfilePhoto } = await import('@/lib/firebase/storage')
      const { url } = await uploadProfilePhoto(user.uid, file)

      const res = role === 'NAILIST'
        ? await fetch(`/api/nailists/${profileId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ photoUrl: url }),
          })
        : await fetch('/api/me/client-profile', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ photoUrl: url }),
          })
      if (!res.ok) throw new Error()
      setPhotoUrl(url)
    } catch {
      setPhotoError('שגיאה בהעלאת התמונה — נסי שוב')
    } finally {
      setPhotoUploading(false)
      if (photoInputRef.current) photoInputRef.current.value = ''
    }
  }

  async function handleProfileSave(e: React.FormEvent) {
    e.preventDefault()
    setProfileError('')
    if (!firstName.trim() || !lastName.trim()) {
      setProfileError('יש להזין שם פרטי ושם משפחה')
      return
    }
    if (!isValidIsraeliPhone(phone)) {
      // the phone field already shows its own inline error — no need to repeat it
      return
    }
    setProfileSaving(true)
    try {
      const res = await fetch('/api/me/client-profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName: firstName.trim(), lastName: lastName.trim(), phoneNumber: phone.trim() }),
      })
      if (!res.ok) throw new Error()
      setProfileSaved(true)
      setTimeout(() => setProfileSaved(false), 3000)
    } catch {
      setProfileError('שגיאה בשמירה — נסי שוב')
    } finally {
      setProfileSaving(false)
    }
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault()
    setPasswordError('')

    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setPasswordError(`הסיסמה חייבת להכיל לפחות ${MIN_PASSWORD_LENGTH} תווים`)
      return
    }
    if (newPassword !== confirmNewPassword) {
      setPasswordError('הסיסמאות אינן תואמות')
      return
    }

    setPasswordSaving(true)
    try {
      const { changePassword } = await import('@/lib/firebase/auth-helpers')
      await changePassword(currentPassword, newPassword)
      setPasswordSaved(true)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmNewPassword('')
      setTimeout(() => setPasswordSaved(false), 3000)
    } catch (err) {
      setPasswordError(friendlyReauthError(err))
    } finally {
      setPasswordSaving(false)
    }
  }

  async function handleDeleteAccount() {
    setDeleteError('')
    setDeleting(true)
    try {
      const { reauthenticateWithPassword, reauthenticateWithGoogle } = await import('@/lib/firebase/auth-helpers')
      if (hasPassword) {
        await reauthenticateWithPassword(deletePassword)
      } else {
        await reauthenticateWithGoogle()
      }
    } catch (err) {
      setDeleteError(friendlyReauthError(err))
      setDeleting(false)
      return
    }

    try {
      const res = await fetch('/api/me/account', { method: 'DELETE' })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || 'שגיאה במחיקת החשבון')
      }
      await signOut()
      router.push('/')
    } catch (err) {
      setDeleteError((err as { message?: string })?.message || 'שגיאה במחיקת החשבון')
    } finally {
      setDeleting(false)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="p-8 flex items-center gap-3 text-muted-foreground font-medium">
        <Loader2 className="h-5 w-5 animate-spin" />
        טוענת הגדרות...
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto" dir="rtl">
      <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="text-3xl font-black text-foreground mb-1">הגדרות חשבון</h1>
        <p className="text-muted-foreground font-medium">נהלי את פרטי החשבון שלך</p>
      </motion.div>

      {/* Profile photo */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="bg-card rounded-3xl border border-border p-6 shadow-sm flex items-center gap-4 mb-6">
        <div className="relative shrink-0">
          <div className="w-20 h-20 rounded-full bg-muted overflow-hidden flex items-center justify-center border-2 border-border">
            {photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photoUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-xl font-black text-muted-foreground">{initials(firstName)}</span>
            )}
          </div>
          <button
            type="button"
            onClick={() => photoInputRef.current?.click()}
            disabled={photoUploading}
            className="absolute -bottom-1 -left-1 w-8 h-8 rounded-full bg-gradient-to-r from-primary to-primary/70 text-white flex items-center justify-center shadow-lg border-2 border-card disabled:opacity-60"
          >
            {photoUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
          </button>
          <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
        </div>
        <div>
          <h2 className="font-black text-foreground text-base">תמונת פרופיל</h2>
          <p className="text-sm text-muted-foreground font-medium">התמונה שמוצגת לצד שמך באתר</p>
          {photoError && (
            <p className="text-xs text-red-500 font-semibold mt-1 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {photoError}
            </p>
          )}
        </div>
      </motion.div>

      {/* Personal info — clients only */}
      {role !== 'NAILIST' && (
        <motion.form
          onSubmit={handleProfileSave}
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="bg-card rounded-3xl border border-border p-6 shadow-sm space-y-4 mb-6"
        >
          <h2 className="font-black text-muted-foreground text-sm uppercase tracking-wider">פרטים אישיים</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-bold text-muted-foreground block mb-1.5" htmlFor="settingsFirstName">שם פרטי</label>
              <Input id="settingsFirstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} className="rounded-xl border-border focus:border-primary h-11" />
            </div>
            <div>
              <label className="text-sm font-bold text-muted-foreground block mb-1.5" htmlFor="settingsLastName">שם משפחה</label>
              <Input id="settingsLastName" value={lastName} onChange={(e) => setLastName(e.target.value)} className="rounded-xl border-border focus:border-primary h-11" />
            </div>
          </div>
          <div>
            <label className="text-sm font-bold text-muted-foreground block mb-1.5" htmlFor="settingsPhone">טלפון</label>
            <Input
              id="settingsPhone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              type="tel"
              dir="ltr"
              className={`rounded-xl h-11 ${
                phone.trim() && !isValidIsraeliPhone(phone) ? 'border-red-400 focus:border-red-400' : 'border-border focus:border-primary'
              }`}
            />
            {phone.trim() && !isValidIsraeliPhone(phone) && (
              <p className="text-xs text-red-500 font-semibold mt-1">{PHONE_INVALID_MESSAGE}</p>
            )}
          </div>
          {profileError && (
            <p className="text-sm text-red-500 font-semibold flex items-center gap-1.5">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {profileError}
            </p>
          )}
          <div className="flex items-center gap-3">
            <Button
              type="submit"
              disabled={profileSaving}
              className="bg-gradient-to-r from-primary to-primary/70 hover:from-primary hover:to-primary/80 border-0 rounded-xl h-11 px-6 font-black gap-2 disabled:opacity-60"
            >
              {profileSaving && <Loader2 className="h-4 w-4 animate-spin" />}
              {profileSaving ? 'שומרת...' : 'שמרי שינויים'}
            </Button>
            {profileSaved && (
              <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-1.5 text-green-600 font-bold text-sm">
                <CheckCircle2 className="h-4 w-4" />
                נשמר בהצלחה!
              </motion.div>
            )}
          </div>
        </motion.form>
      )}

      {/* Change password — only for accounts that actually have one */}
      {hasPassword ? (
        <motion.form
          onSubmit={handlePasswordChange}
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-card rounded-3xl border border-border p-6 shadow-sm space-y-4 mb-6"
        >
          <h2 className="font-black text-muted-foreground text-sm uppercase tracking-wider flex items-center gap-2">
            <Lock className="h-3.5 w-3.5" />
            שינוי סיסמה
          </h2>
          <div>
            <label className="text-sm font-bold text-muted-foreground block mb-1.5" htmlFor="settingsCurrentPassword">סיסמה נוכחית</label>
            <div className="relative">
              <Input
                id="settingsCurrentPassword"
                type={showPasswords ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="rounded-xl border-border focus:border-primary h-11 pl-10"
              />
              <button
                type="button"
                onClick={() => setShowPasswords((v) => !v)}
                aria-label={showPasswords ? 'הסתירי סיסמאות' : 'הציגי סיסמאות'}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground"
              >
                {showPasswords ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-bold text-muted-foreground block mb-1.5" htmlFor="settingsNewPassword">סיסמה חדשה</label>
              <Input
                id="settingsNewPassword"
                type={showPasswords ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder={`לפחות ${MIN_PASSWORD_LENGTH} תווים`}
                className="rounded-xl border-border focus:border-primary h-11"
              />
            </div>
            <div>
              <label className="text-sm font-bold text-muted-foreground block mb-1.5" htmlFor="settingsConfirmNewPassword">אימות סיסמה חדשה</label>
              <Input
                id="settingsConfirmNewPassword"
                type={showPasswords ? 'text' : 'password'}
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                className="rounded-xl border-border focus:border-primary h-11"
              />
            </div>
          </div>
          {passwordError && (
            <p className="text-sm text-red-500 font-semibold flex items-center gap-1.5">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {passwordError}
            </p>
          )}
          <div className="flex items-center gap-3">
            <Button
              type="submit"
              disabled={passwordSaving}
              className="bg-gradient-to-r from-primary to-primary/70 hover:from-primary hover:to-primary/80 border-0 rounded-xl h-11 px-6 font-black gap-2 disabled:opacity-60"
            >
              {passwordSaving && <Loader2 className="h-4 w-4 animate-spin" />}
              {passwordSaving ? 'מעדכנת...' : 'עדכני סיסמה'}
            </Button>
            {passwordSaved && (
              <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-1.5 text-green-600 font-bold text-sm">
                <CheckCircle2 className="h-4 w-4" />
                הסיסמה עודכנה!
              </motion.div>
            )}
          </div>
        </motion.form>
      ) : (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-card rounded-3xl border border-border p-6 shadow-sm mb-6">
          <h2 className="font-black text-muted-foreground text-sm uppercase tracking-wider flex items-center gap-2 mb-1">
            <Lock className="h-3.5 w-3.5" />
            שינוי סיסמה
          </h2>
          <p className="text-sm text-muted-foreground font-medium">החשבון שלך מחובר דרך Google — אין סיסמה לשינוי כאן.</p>
        </motion.div>
      )}

      {/* Danger zone — delete account */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
        className="bg-card rounded-3xl border border-red-200 dark:border-red-900/40 p-6 shadow-sm space-y-4">
        <h2 className="font-black text-red-500 text-sm uppercase tracking-wider flex items-center gap-2">
          <Trash2 className="h-3.5 w-3.5" />
          אזור מסוכן
        </h2>
        <p className="text-sm text-muted-foreground font-medium">
          מחיקת החשבון היא פעולה סופית — כל הנתונים שלך (פרופיל, תורים, מועדפים) יימחקו לצמיתות ולא ניתן לשחזר אותם.
        </p>

        {!showDeleteConfirm ? (
          <Button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            variant="outline"
            className="rounded-xl h-11 px-6 font-bold border-red-300 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 gap-2"
          >
            <Trash2 className="h-4 w-4" />
            מחקי את החשבון שלי
          </Button>
        ) : (
          <div className="space-y-3 pt-2 border-t border-red-100 dark:border-red-900/30">
            {hasPassword && (
              <div>
                <label className="text-sm font-bold text-muted-foreground block mb-1.5" htmlFor="settingsDeletePassword">הזיני סיסמה לאישור</label>
                <Input
                  id="settingsDeletePassword"
                  type="password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  className="rounded-xl border-border focus:border-red-400 h-11"
                />
              </div>
            )}
            {deleteError && (
              <p className="text-sm text-red-500 font-semibold flex items-center gap-1.5">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {deleteError}
              </p>
            )}
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => { setShowDeleteConfirm(false); setDeletePassword(''); setDeleteError('') }}
                disabled={deleting}
                className="rounded-xl h-11 px-6 font-bold border-border"
              >
                ביטול
              </Button>
              <Button
                type="button"
                onClick={handleDeleteAccount}
                disabled={deleting || (hasPassword && !deletePassword)}
                className="bg-red-500 hover:bg-red-600 text-white border-0 rounded-xl h-11 px-6 font-black gap-2 disabled:opacity-60"
              >
                {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
                {deleting ? 'מוחקת...' : 'כן, מחקי לצמיתות'}
              </Button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  )
}
