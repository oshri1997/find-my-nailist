'use client'

import { useMemo, useState } from 'react'
import { BadgeCheck, Check, CircleAlert, Mail, RotateCcw, Send, ShieldCheck, Sparkles, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const COMMON_DOMAINS = [
  'gmail.com',
  'walla.co.il',
  'hotmail.com',
  'outlook.com',
  'icloud.com',
  'yahoo.com',
  'nailistiot.fun',
]

type Stage = 'entry' | 'bounce' | 'pending' | 'verified'

function levenshtein(first: string, second: string): number {
  const row = Array.from({ length: second.length + 1 }, (_, index) => index)

  for (let firstIndex = 1; firstIndex <= first.length; firstIndex += 1) {
    let previous = row[0]
    row[0] = firstIndex
    for (let secondIndex = 1; secondIndex <= second.length; secondIndex += 1) {
      const current = row[secondIndex]
      row[secondIndex] = Math.min(
        row[secondIndex] + 1,
        row[secondIndex - 1] + 1,
        previous + (first[firstIndex - 1] === second[secondIndex - 1] ? 0 : 1)
      )
      previous = current
    }
  }

  return row[second.length]
}

function suggestedDomain(email: string): string | null {
  const domain = email.trim().toLowerCase().split('@')[1]
  if (!domain) return null
  return COMMON_DOMAINS.find((candidate) => levenshtein(domain, candidate) <= 2) ?? null
}

export default function EmailRecoveryDemoPage() {
  const [email, setEmail] = useState('noa@gmail.cim')
  const [stage, setStage] = useState<Stage>('entry')
  const suggestion = useMemo(() => suggestedDomain(email), [email])
  const correctedEmail = suggestion ? `${email.slice(0, email.lastIndexOf('@') + 1)}${suggestion}` : email

  function resetDemo() {
    setEmail('noa@gmail.cim')
    setStage('entry')
  }

  const message = {
    entry: 'הקלידי כתובת. המערכת מזהה טעות נפוצה ומבקשת אישור לפני ההרשמה.',
    bounce: 'ספק הדיוור דיווח שהכתובת אינה ניתנת למסירה. לא נשלח אליה שוב.',
    pending: 'קישור אימות נשלח לכתובת המתוקנת. החשבון עדיין לא פעיל בחיפוש.',
    verified: 'הכתובת אומתה. אותו חשבון ואותו פרופיל נשארו, והחשבון יכול להופיע בחיפוש.',
  }[stage]

  return (
    <main className="min-h-screen bg-[#120d12] px-4 py-10 text-zinc-100 sm:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-rose-200/15 pb-5">
          <div>
            <p className="mb-1 text-sm font-bold text-rose-300">דמו אינטראקטיבי</p>
            <h1 className="text-3xl font-black tracking-tight sm:text-4xl">כשהמייל הוקלד בטעות</h1>
          </div>
          <Button variant="outline" onClick={resetDemo} className="border-rose-200/30 bg-transparent text-zinc-100 hover:bg-white/10 hover:text-white">
            <RotateCcw className="ml-2 h-4 w-4" /> התחילי מחדש
          </Button>
        </div>

        <div className="grid gap-5 lg:grid-cols-[1.25fr_.75fr]">
          <section className="overflow-hidden rounded-3xl border border-rose-200/15 bg-[#211820] shadow-[0_24px_70px_rgba(0,0,0,.3)]">
            <div className="border-b border-rose-200/15 bg-[#2b1e29] px-6 py-4">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-rose-500 text-white"><Mail className="h-5 w-5" /></span>
                <div>
                  <h2 className="font-extrabold">אימות כתובת מייל</h2>
                  <p className="text-sm text-zinc-400">כך הנייליסטית רואה את התהליך</p>
                </div>
              </div>
            </div>

            <div className="p-6 sm:p-8">
              {stage === 'entry' && (
                <div className="space-y-5">
                  <div>
                    <h3 className="text-2xl font-black">לאמת לפני שממשיכות</h3>
                    <p className="mt-2 leading-6 text-zinc-400">המייל דרוש כדי לפרסם את העסק ולקבל תורים.</p>
                  </div>
                  <label className="block text-sm font-bold text-zinc-300" htmlFor="demo-email">כתובת מייל</label>
                  <Input
                    id="demo-email"
                    dir="ltr"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="h-12 border-zinc-600 bg-[#151217] text-left text-base text-white placeholder:text-zinc-600"
                  />
                  {suggestion && (
                    <div className="rounded-2xl border border-amber-300/35 bg-amber-300/10 p-4" role="status">
                      <div className="flex items-start gap-3">
                        <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
                        <div>
                          <p className="font-bold text-amber-100">האם התכוונת ל־<span dir="ltr">{correctedEmail}</span>?</p>
                          <p className="mt-1 text-sm leading-5 text-amber-100/70">מצאנו דמיון לדומיין מוכר. אפשר לבחור בתיקון או להשאיר את מה שהוקלד.</p>
                          <button type="button" onClick={() => setEmail(correctedEmail)} className="mt-3 rounded-lg bg-amber-200 px-3 py-2 text-sm font-extrabold text-[#281d08] hover:bg-amber-100">
                            השתמשי ב־{suggestion}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                  <Button onClick={() => setStage('pending')} disabled={!email.includes('@')} className="h-12 w-full text-base font-extrabold">
                    <Send className="ml-2 h-4 w-4" /> שלחי קישור אימות
                  </Button>
                  <button type="button" onClick={() => setStage('bounce')} className="block w-full text-center text-sm font-bold text-zinc-500 underline-offset-4 hover:text-rose-300 hover:underline">
                    הדגימי מצב שבו ההודעה חזרה
                  </button>
                </div>
              )}

              {stage === 'bounce' && (
                <div className="space-y-6">
                  <div className="flex gap-4 rounded-2xl border border-rose-400/35 bg-rose-500/10 p-5">
                    <XCircle className="h-7 w-7 shrink-0 text-rose-400" />
                    <div>
                      <h3 className="text-xl font-black text-rose-100">לא הצלחנו למסור את המייל</h3>
                      <p className="mt-1 leading-6 text-rose-100/70">נראה שהכתובת אינה תקינה. עדכני אותה ונשלח קישור חדש.</p>
                    </div>
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-bold text-zinc-300" htmlFor="bounce-email">כתובת חדשה</label>
                    <Input id="bounce-email" dir="ltr" value={email} onChange={(event) => setEmail(event.target.value)} className="h-12 border-zinc-600 bg-[#151217] text-left text-base text-white" />
                  </div>
                  <Button onClick={() => setStage('pending')} disabled={!email.includes('@')} className="h-12 w-full text-base font-extrabold">
                    <Send className="ml-2 h-4 w-4" /> עדכני ושלחי קישור חדש
                  </Button>
                  <p className="text-center text-sm text-zinc-500">לא שולחים שוב אל הכתובת שחזרה.</p>
                </div>
              )}

              {stage === 'pending' && (
                <div className="space-y-6 text-center">
                  <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-rose-500/15 text-rose-300"><Mail className="h-8 w-8" /></span>
                  <div>
                    <h3 className="text-2xl font-black">הקישור בדרך</h3>
                    <p className="mt-2 leading-6 text-zinc-400">שלחנו קישור אימות אל <span dir="ltr" className="font-bold text-zinc-200">{email}</span>.</p>
                  </div>
                  <div className="rounded-2xl bg-[#151217] p-4 text-right text-sm leading-6 text-zinc-400">
                    עד שהקישור נלחץ, הפרופיל לא מופיע בחיפוש ואי אפשר לקבל תורים. זה מונע חשבון פעיל עם כתובת לא נגישה.
                  </div>
                  <Button onClick={() => setStage('verified')} className="h-12 w-full text-base font-extrabold">
                    <Check className="ml-2 h-5 w-5" /> הדמי לחיצה על קישור האימות
                  </Button>
                </div>
              )}

              {stage === 'verified' && (
                <div className="space-y-6 text-center">
                  <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-400/15 text-emerald-300"><BadgeCheck className="h-9 w-9" /></span>
                  <div>
                    <h3 className="text-2xl font-black">הכתובת אומתה</h3>
                    <p className="mt-2 leading-6 text-zinc-400">החשבון של נועה נשאר אותו חשבון. רק כתובת המייל עודכנה.</p>
                  </div>
                  <div className="grid gap-3 text-right sm:grid-cols-2">
                    <div className="rounded-2xl border border-emerald-300/20 bg-emerald-400/10 p-4 text-sm font-bold text-emerald-100">✓ הפרופיל יכול להופיע בחיפוש</div>
                    <div className="rounded-2xl border border-emerald-300/20 bg-emerald-400/10 p-4 text-sm font-bold text-emerald-100">✓ אפשר לקבל תורים</div>
                  </div>
                  <Button variant="outline" onClick={resetDemo} className="h-12 w-full border-zinc-600 bg-transparent text-zinc-100 hover:bg-white/10 hover:text-white">נסי שוב</Button>
                </div>
              )}
            </div>
          </section>

          <aside className="rounded-3xl border border-rose-200/15 bg-[#1b151b] p-6">
            <h2 className="text-lg font-black">מה קורה מאחורי הקלעים</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-400">{message}</p>
            <ol className="mt-7 space-y-5 border-r border-zinc-700 pr-5">
              <li className={stage === 'entry' ? 'text-rose-200' : 'text-zinc-400'}><span className="font-black">1. מזהים טעות נפוצה</span><p className="mt-1 text-sm leading-5 text-zinc-500">הצעה בלבד, ללא שינוי אוטומטי.</p></li>
              <li className={stage === 'bounce' ? 'text-rose-200' : 'text-zinc-400'}><span className="font-black">2. עוצרים משלוחים לכתובת שחזרה</span><p className="mt-1 text-sm leading-5 text-zinc-500">הספק מדווח על bounce והמשתמשת מתקנת.</p></li>
              <li className={stage === 'pending' ? 'text-rose-200' : 'text-zinc-400'}><span className="font-black">3. מאמתים את הכתובת החדשה</span><p className="mt-1 text-sm leading-5 text-zinc-500">הפרופיל ממתין ואינו זמין בחיפוש.</p></li>
              <li className={stage === 'verified' ? 'text-emerald-200' : 'text-zinc-400'}><span className="font-black">4. מפעילים את החשבון</span><p className="mt-1 text-sm leading-5 text-zinc-500">אותו UID, אותו פרופיל, כתובת מאומתת.</p></li>
            </ol>
            <div className="mt-8 flex items-start gap-3 rounded-2xl bg-[#151217] p-4 text-sm leading-6 text-zinc-400">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" />
              לא יוצרים חשבון חדש ולא מאבדים פרופיל, שירותים או תורים.
            </div>
            <div className="mt-4 flex items-start gap-3 rounded-2xl bg-[#151217] p-4 text-sm leading-6 text-zinc-400">
              <CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
              בדיקת הדומיין מצמצמת טעויות, אך הקלקה על קישור האימות היא ההוכחה האמיתית שהכתובת שייכת לה.
            </div>
          </aside>
        </div>
      </div>
    </main>
  )
}
