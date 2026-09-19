"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BadgeCheck,
  CalendarDays,
  CircleAlert,
  CircleCheck,
  MailWarning,
  Scissors,
  ShieldCheck,
  Star,
  TrendingUp,
  UserPlus,
  Users,
  XCircle,
} from "lucide-react";
import { APPOINTMENT_STATUS_COLORS } from "@/lib/status-styles";

interface Stats {
  totalUsers: number;
  totalNailists: number;
  totalClients: number;
  bouncedEmailUsers: number;
  suppressedEmailUsers: number;
  emailDeliveryIssueUsers: number;
  activeNailists: number;
  totalAppointments: number;
  appointmentsByStatus: Record<string, number>;
  totalReviews: number;
  avgRating: number;
  newUsersThisWeek: number;
  totalRevenue: number;
  today: {
    newUsers: number;
    newAppointments: number;
    cancelledAppointments: number;
    newReviews: number;
  };
}

const STATUS_HE: Record<string, string> = {
  PENDING: "ממתינות לטיפול",
  CONFIRMED: "מאושרות",
  COMPLETED: "הושלמו",
  CANCELLED: "בוטלו",
  NO_SHOW: "לא הגיעו",
};
const STATUS_ORDER = [
  "PENDING",
  "CONFIRMED",
  "COMPLETED",
  "CANCELLED",
  "NO_SHOW",
];
type Tone = "default" | "success" | "warning" | "danger";
const toneStyles: Record<Tone, { icon: string; value: string; line: string }> =
  {
    default: {
      icon: "bg-primary/10 text-primary",
      value: "text-foreground",
      line: "bg-primary",
    },
    success: {
      icon: "bg-success/10 text-success",
      value: "text-success",
      line: "bg-success",
    },
    warning: {
      icon: "bg-warning/10 text-warning",
      value: "text-warning",
      line: "bg-warning",
    },
    danger: {
      icon: "bg-destructive/10 text-destructive",
      value: "text-destructive",
      line: "bg-destructive",
    },
  };

function Metric({
  label,
  value,
  detail,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: number | string;
  detail: string;
  icon: React.ElementType;
  tone?: Tone;
}) {
  const style = toneStyles[tone];
  return (
    <div className="relative overflow-hidden border border-border bg-card px-4 py-4 md:px-5 md:py-5">
      <div className={`absolute inset-y-0 right-0 w-1 ${style.line}`} />
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-foreground">{label}</p>
          <p
            className={`mt-2 text-3xl font-black tracking-tight ${style.value}`}
          >
            {value}
          </p>
        </div>
        <div
          className={`flex h-9 w-9 items-center justify-center rounded-xl ${style.icon}`}
        >
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">{detail}</p>
    </div>
  );
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;
    fetch("/api/admin/stats")
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body?.error ?? "טעינת הנתונים נכשלה");
        return body;
      })
      .then((body) => {
        if (active) setStats(body.data);
      })
      .catch(() => {
        if (active) setFailed(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [refreshKey]);

  function retryLoadingStats() {
    setLoading(true);
    setFailed(false);
    setRefreshKey((key) => key + 1);
  }

  const attention = useMemo(() => {
    if (!stats) return [];
    const deliveryIssues =
      stats.emailDeliveryIssueUsers ?? stats.bouncedEmailUsers;
    const pendingAppointments = stats.appointmentsByStatus.PENDING ?? 0;
    const inactiveNailists = Math.max(
      0,
      stats.totalNailists - stats.activeNailists,
    );
    return [
      {
        count: deliveryIssues,
        title: "כתובות מייל דורשות טיפול",
        detail:
          deliveryIssues === 1
            ? "מייל אחד חזר או נחסם לשליחה."
            : `${deliveryIssues} מיילים חזרו או נחסמו לשליחה.`,
        icon: MailWarning,
        tone: "danger" as const,
      },
      {
        count: pendingAppointments,
        title: "הזמנות ממתינות להחלטה",
        detail:
          pendingAppointments === 1
            ? "הזמנה אחת עדיין מחכה לטיפול."
            : `${pendingAppointments} הזמנות עדיין מחכות לטיפול.`,
        icon: CalendarDays,
        tone: "warning" as const,
      },
      {
        count: inactiveNailists,
        title: "נייליסטיות עדיין לא פעילות",
        detail:
          inactiveNailists === 1
            ? "פרופיל אחד טרם פעיל בחיפוש."
            : `${inactiveNailists} פרופילים טרם פעילים בחיפוש.`,
        icon: Scissors,
        tone: "warning" as const,
      },
    ].filter((item) => item.count > 0);
  }, [stats]);

  if (loading) {
    return (
      <div className="p-4 md:p-8" aria-label="טוענת נתוני דשבורד">
        <div className="animate-pulse space-y-4">
          <div className="h-20 max-w-xl bg-muted" />
          <div className="grid gap-px border border-border bg-border md:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-32 bg-card" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!stats || failed) {
    return (
      <div className="p-4 md:p-8">
        <section className="max-w-lg border-s-4 border-destructive bg-card p-6">
          <CircleAlert className="h-5 w-5 text-destructive" />
          <h1 className="mt-4 text-xl font-black text-foreground">
            אי אפשר להציג את תמונת המצב
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            הנתונים לא נטענו, ולכן לא מוצגים ערכים חלקיים או ישנים.
          </p>
          <button
            onClick={retryLoadingStats}
            className="mt-5 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            נסי לטעון שוב
          </button>
        </section>
      </div>
    );
  }

  const statusMaximum = Math.max(
    ...STATUS_ORDER.map((status) => stats.appointmentsByStatus[status] ?? 0),
    1,
  );
  const deliveryIssues =
    stats.emailDeliveryIssueUsers ?? stats.bouncedEmailUsers;

  return (
    <div className="space-y-5 p-4 md:space-y-7 md:p-8">
      <header className="border-b border-border pb-5 md:pb-6">
        <div className="flex items-start gap-3">
          <div className="mt-1 flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold text-primary">בקרת מערכת</p>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-foreground md:text-3xl">
              דשבורד ניהול
            </h1>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
              קודם חריגות והחלטות, אחר כך מדדים. כל המספרים מתעדכנים מהמערכת
              בזמן הטעינה.
            </p>
          </div>
        </div>
      </header>

      <section
        aria-labelledby="attention-title"
        className="border border-border bg-card"
      >
        <div className="flex items-center justify-between gap-4 border-b border-border px-4 py-3 md:px-5">
          <div>
            <h2 id="attention-title" className="font-black text-foreground">
              מה דורש תשומת לב עכשיו
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              אין כאן קיצורי דרך מסוכנים — הפעולות נשארות במסכים הייעודיים עם
              הבדיקות המתאימות.
            </p>
          </div>
          <CircleAlert
            className={`h-5 w-5 shrink-0 ${attention.length > 0 ? "text-warning" : "text-success"}`}
          />
        </div>
        {attention.length > 0 ? (
          <div
            className="grid divide-y divide-border md:grid-cols-3 md:divide-x md:divide-y-0"
            dir="rtl"
          >
            {attention.map((item) => {
              const Icon = item.icon;
              const style = toneStyles[item.tone];
              return (
                <div key={item.title} className="flex gap-3 px-4 py-4 md:px-5">
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${style.icon}`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className={`text-2xl font-black ${style.value}`}>
                      {item.count}
                    </p>
                    <p className="mt-0.5 text-sm font-bold text-foreground">
                      {item.title}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      {item.detail}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex items-center gap-3 px-4 py-5 md:px-5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-success/10 text-success">
              <CircleCheck className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">
                אין חריגות שמחייבות טיפול מיידי
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                בדקי את המדדים למטה לפני שעוברים לניהול השוטף.
              </p>
            </div>
          </div>
        )}
      </section>

      <section aria-labelledby="today-title">
        <div className="mb-3 flex items-baseline justify-between gap-4">
          <h2 id="today-title" className="font-black text-foreground">
            היום במערכת
          </h2>
          <p className="text-xs text-muted-foreground">
            פעולות שנוצרו או השתנו היום
          </p>
        </div>
        <div className="grid gap-px overflow-hidden border border-border bg-border sm:grid-cols-2 xl:grid-cols-4">
          <Metric
            label="משתמשים חדשים"
            value={stats.today.newUsers}
            detail="נרשמו היום"
            icon={UserPlus}
          />
          <Metric
            label="הזמנות חדשות"
            value={stats.today.newAppointments}
            detail="נפתחו היום"
            icon={CalendarDays}
          />
          <Metric
            label="ביטולים"
            value={stats.today.cancelledAppointments}
            detail="עודכנו כמבוטלות היום"
            icon={XCircle}
            tone={stats.today.cancelledAppointments > 0 ? "danger" : "default"}
          />
          <Metric
            label="ביקורות חדשות"
            value={stats.today.newReviews}
            detail="התקבלו היום"
            icon={Star}
          />
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.85fr)]">
        <section
          aria-labelledby="appointments-title"
          className="border border-border bg-card"
        >
          <div className="border-b border-border px-4 py-4 md:px-5">
            <h2 id="appointments-title" className="font-black text-foreground">
              מצב ההזמנות
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              התפלגות מלאה, כדי לזהות עומס או ביטולים לפני שהם הופכים לבעיה.
            </p>
          </div>
          <div className="divide-y divide-border">
            {STATUS_ORDER.map((status) => {
              const count = stats.appointmentsByStatus[status] ?? 0;
              const width = `${Math.max(count > 0 ? 6 : 0, Math.round((count / statusMaximum) * 100))}%`;
              return (
                <div
                  key={status}
                  className="grid grid-cols-[minmax(112px,0.7fr)_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 md:px-5"
                >
                  <span className="text-sm font-semibold text-foreground">
                    {STATUS_HE[status]}
                  </span>
                  <div
                    className="h-2 overflow-hidden rounded-full bg-muted"
                    aria-hidden="true"
                  >
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width }}
                    />
                  </div>
                  <span
                    className={`rounded-lg border px-2 py-1 text-xs font-black ${APPOINTMENT_STATUS_COLORS[status]}`}
                  >
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
        <section
          aria-labelledby="health-title"
          className="border border-border bg-card"
        >
          <div className="border-b border-border px-4 py-4 md:px-5">
            <h2 id="health-title" className="font-black text-foreground">
              בריאות עסקית
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              מדדים שמחזקים אמון וצמיחה לאורך זמן.
            </p>
          </div>
          <div className="grid divide-y divide-border">
            <div className="flex items-center justify-between gap-4 px-4 py-4 md:px-5">
              <div>
                <p className="text-sm font-semibold text-foreground">
                  נייליסטיות פעילות
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  מתוך {stats.totalNailists} חשבונות, פעילות ומאומתות במייל
                </p>
              </div>
              <p className="text-2xl font-black text-success">
                {stats.activeNailists}
              </p>
            </div>
            <div className="flex items-center justify-between gap-4 px-4 py-4 md:px-5">
              <div>
                <p className="text-sm font-semibold text-foreground">
                  מסירת מיילים
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {stats.suppressedEmailUsers} חסומים, {stats.bouncedEmailUsers}{" "}
                  חזרו
                </p>
              </div>
              <p
                className={`text-2xl font-black ${deliveryIssues > 0 ? "text-destructive" : "text-success"}`}
              >
                {deliveryIssues}
              </p>
            </div>
            <div className="flex items-center justify-between gap-4 px-4 py-4 md:px-5">
              <div>
                <p className="text-sm font-semibold text-foreground">
                  דירוג ממוצע
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  על בסיס {stats.totalReviews} ביקורות
                </p>
              </div>
              <p className="text-2xl font-black text-foreground">
                ★ {stats.avgRating}
              </p>
            </div>
          </div>
        </section>
      </div>

      <section aria-labelledby="scope-title">
        <div className="mb-3 flex items-baseline justify-between gap-4">
          <h2 id="scope-title" className="font-black text-foreground">
            תמונת מצב מצטברת
          </h2>
          <p className="text-xs text-muted-foreground">
            מדדי היקף, לא מדדי פעולה מיידית
          </p>
        </div>
        <div className="grid gap-px overflow-hidden border border-border bg-border sm:grid-cols-2 xl:grid-cols-4">
          <Metric
            label="כל המשתמשים"
            value={stats.totalUsers.toLocaleString()}
            detail={`${stats.totalClients.toLocaleString()} לקוחות`}
            icon={Users}
          />
          <Metric
            label="משתמשים חדשים השבוע"
            value={stats.newUsersThisWeek}
            detail="נרשמו בשבעת הימים האחרונים"
            icon={TrendingUp}
          />
          <Metric
            label="הזמנות בסך הכול"
            value={stats.totalAppointments.toLocaleString()}
            detail="בכל סטטוס"
            icon={BadgeCheck}
          />
          <Metric
            label="הכנסות מהושלמו"
            value={`₪${stats.totalRevenue.toLocaleString()}`}
            detail="הזמנות במצב הושלם"
            icon={TrendingUp}
            tone="success"
          />
        </div>
      </section>
    </div>
  );
}
