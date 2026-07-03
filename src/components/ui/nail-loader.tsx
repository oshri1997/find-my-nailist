'use client'

import { motion } from 'framer-motion'

/*
  NailLoader v2 - Premium 3D Realism Edition
  Inspired by watermarked_img_1159717097582209269.png
*/

const SPARKLES = [
  { x: -55, y: -25, delay: 0.1, size: 24 }, // כוכב גדול משמאל
  { x: 55, y: 10, delay: 0.4, size: 20 },   // כוכב בינוני מימין
  { x: -65, y: 15, delay: 0.7, size: 14 },  // כוכבים קטנים מסביב
  { x: 45, y: -30, delay: 0.25, size: 12 },
  { x: -35, y: 35, delay: 0.9, size: 6 },
  { x: 35, y: -10, delay: 0.5, size: 6 },
]

interface NailLoaderProps {
  text?: string
  size?: 'sm' | 'md' | 'lg'
}

export function NailLoader({ text = 'טוענת...', size = 'md' }: NailLoaderProps) {
  const scale = size === 'sm' ? 0.7 : size === 'lg' ? 1.3 : 1

  return (
    <div
      className="flex flex-col items-center gap-6"
      style={{ transform: `scale(${scale})`, transformOrigin: 'center top' }}
    >
      <div className="relative select-none" style={{ width: 160, height: 200 }}>

        {/* ── אשליות רקע וצלליות רכות ── */}
        <div
          className="absolute inset-0 blur-2xl pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(251,207,232,0.3) 0%, transparent 70%)' }}
        />

        {/* ── נצנצים יוקרתיים (Sparkles) ── */}
        {SPARKLES.map((s, i) => (
          <motion.div
            key={i}
            className="absolute pointer-events-none drop-shadow-[0_0_4px_rgba(236,72,153,0.6)]"
            style={{ left: `calc(50% + ${s.x}px)`, top: `${70 + s.y}px` }}
            animate={{
              opacity: [0, 0.9, 0],
              scale: [0.4, 1.1, 0.4],
              rotate: [0, 15, 30],
            }}
            transition={{ duration: 2.2, delay: s.delay, repeat: Infinity, ease: 'easeInOut' }}
          >
            <svg width={s.size} height={s.size} viewBox="0 0 24 24" fill="none">
              {/* כוכב 4 קצוות חד וריאליסטי */}
              <path d="M12 0L14.3 9.7L24 12L14.3 14.3L12 24L9.7 14.3L0 12L9.7 9.7Z" fill={`url(#sparkle-grad-${i})`} />
              <defs>
                <linearGradient id={`sparkle-grad-${i}`} x1="0" y1="0" x2="24" y2="24">
                  <stop offset="0%" stopColor="#fbcfe8" />
                  <stop offset="50%" stopColor="#ec4899" />
                  <stop offset="100%" stopColor="#db2777" />
                </linearGradient>
              </defs>
            </svg>
          </motion.div>
        ))}

        {/* ── האצבע והציפורן ── */}
        <svg
          width="90" height="180" viewBox="0 0 90 180"
          fill="none" className="absolute left-1/2 -translate-x-1/2 bottom-0"
        >
          <defs>
            {/* גרדיאנט עור ריאליסטי תלת מימדי */}
            <linearGradient id="skin-base" x1="0" y1="0" x2="90" y2="0" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#e2b19d" />
              <stop offset="25%" stopColor="#f5d6ca" />
              <stop offset="75%" stopColor="#f5d6ca" />
              <stop offset="100%" stopColor="#e2b19d" />
            </linearGradient>

            <linearGradient id="skin-shadow" x1="0" y1="0" x2="0" y2="180" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#000000" stopOpacity="0.05" />
              <stop offset="40%" stopColor="#000000" stopOpacity="0" />
              <stop offset="100%" stopColor="#bd8168" stopOpacity="0.4" />
            </linearGradient>

            {/* בסיס הציפורן הטבעית */}
            <linearGradient id="nail-bed" x1="45" y1="50" x2="45" y2="130" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#fbfbfc" />
              <stop offset="15%" stopColor="#f4e5e2" />
              <stop offset="85%" stopColor="#f3d1cb" />
              <stop offset="100%" stopColor="#eac2ba" />
            </linearGradient>
          </defs>

          {/* גוף האצבע */}
          <path
            d="M12,180 C12,140 10,95 10,75 C10,35 30,22 45,22 C60,22 80,35 80,75 C80,95 78,140 78,180 Z"
            fill="url(#skin-base)"
          />
          <path
            d="M12,180 C12,140 10,95 10,75 C10,35 30,22 45,22 C60,22 80,35 80,75 C80,95 78,140 78,180 Z"
            fill="url(#skin-shadow)"
          />

          {/* קמטוטים באצבע (ריאליזם רך) */}
          <path d="M22,150 Q45,156 68,150" stroke="#cd957f" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
          <path d="M25,155 Q45,160 65,155" stroke="#cd957f" strokeWidth="1" strokeLinecap="round" opacity="0.4" />

          {/* הציפורן עצמה */}
          <path
            d="M18,125 C15,70 20,32 45,32 C70,32 75,70 72,125 C55,134 35,134 18,125 Z"
            fill="url(#nail-bed)"
          />

          {/* הסהר הלבן בבסיס הציפורן (Lunula) */}
          <path d="M30,121 C33,114 57,114 60,121 C53,124 37,124 30,121 Z" fill="rgba(255,255,255,0.55)" />

          {/* קו הקוטיקולה (הצללה מעל הציפורן) */}
          <path d="M18,125 C35,134 55,134 72,125" stroke="#ba826c" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.5" />
        </svg>

        {/* ── הלק (הצבע הגדל על הציפורן) ── */}
        <div
          className="absolute overflow-hidden"
          style={{
            left: '50%',
            transform: 'translateX(-50%)',
            bottom: 55, // ממוקם בדיוק מעל בסיס הציפורן
            width: 58,
            height: 94,
            clipPath: 'path("M3,93 C0,38 2,0 29,0 C56,0 58,38 55,93 C40,102 18,102 3,93 Z")',
          }}
        >
          {/* גרדיאנט הציפורן - אומברה יוקרתי */}
          <motion.div
            animate={{ scaleY: [0, 1, 1, 0] }}
            transition={{
              duration: 3.2,
              times: [0, 0.45, 0.75, 1],
              repeat: Infinity,
              ease: [0.4, 0, 0.2, 1],
            }}
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(180deg, #d946ef 0%, #a855f7 40%, #db2777 85%, #be185d 100%)',
              transformOrigin: 'center bottom',
            }}
          >
            {/* אפקט מבריק (Gloss 3D) קבוע על הלק */}
            <div
              className="absolute inset-0"
              style={{
                background: 'linear-gradient(90deg, rgba(255,255,255,0) 20%, rgba(255,255,255,0.25) 30%, rgba(255,255,255,0) 45%)',
              }}
            />
          </motion.div>
        </div>

        {/* ── טפטפת כרום יוקרתית עם טיפת ג'ל תלת מימדית ── */}
        <motion.div
          className="absolute left-1/2"
          style={{ x: '-50%', top: -10, zIndex: 10 }}
          animate={{
            y: [-35, 42, 42, -35],
            scale: [0.95, 1, 1.02, 0.95],
          }}
          transition={{
            duration: 3.2,
            times: [0, 0.43, 0.72, 1],
            repeat: Infinity,
            ease: [0.42, 0, 0.58, 1],
          }}
        >
          <svg width="46" height="95" viewBox="0 0 46 95" fill="none">
            <defs>
              {/* גרדיאנט מתכת כרום מטאלי */}
              <linearGradient id="chrome-grad" x1="0" y1="0" x2="46" y2="0">
                <stop offset="0%" stopColor="#475569" />
                <stop offset="25%" stopColor="#cbd5e1" />
                <stop offset="50%" stopColor="#ffffff" />
                <stop offset="75%" stopColor="#94a3b8" />
                <stop offset="100%" stopColor="#334155" />
              </linearGradient>

              {/* גרדיאנט זכוכית שקופה לפיפטה */}
              <linearGradient id="glass-grad" x1="0" y1="0" x2="16" y2="0">
                <stop offset="0%" stopColor="rgba(255,255,255,0.6)" />
                <stop offset="30%" stopColor="rgba(255,255,255,0.2)" />
                <stop offset="70%" stopColor="rgba(255,255,255,0.1)" />
                <stop offset="100%" stopColor="rgba(200,200,250,0.4)" />
              </linearGradient>

              {/* ג'ל ורוד מבריק ותלת מימדי בטיפה */}
              <radialGradient id="drop-gel" cx="45%" cy="35%" r="60%">
                <stop offset="0%" stopColor="#f472b6" />
                <stop offset="40%" stopColor="#db2777" />
                <stop offset="85%" stopColor="#9d174d" />
                <stop offset="100%" stopColor="#4c0519" />
              </radialGradient>
            </defs>

            {/* ידית מתכת עליונה */}
            <path d="M8,0 L38,0 C41,0 43,2 43,5 L43,28 C43,31 41,33 38,33 L8,33 C5,33 3,31 3,28 L3,5 C3,2 5,0 8,0 Z" fill="url(#chrome-grad)" />
            <rect x="2" y="24" width="42" height="3" fill="#1e293b" opacity="0.3" />

            {/* חיבור פיפטת הזכוכית */}
            <path d="M15,33 L31,33 L29,45 L17,45 Z" fill="url(#chrome-grad)" />

            {/* צינורית זכוכית שקופה */}
            <rect x="17" y="45" width="12" height="32" fill="url(#glass-grad)" stroke="rgba(255,255,255,0.4)" strokeWidth="0.5" />
            {/* צבע הלק שנמצא בתוך הזכוכית */}
            <rect x="19" y="45" width="8" height="32" fill="#db2777" opacity="0.85" />

            {/* קצה הפיפטה הצר */}
            <path d="M17,77 L21,83 L25,83 L29,77 Z" fill="url(#glass-grad)" />

            {/* טיפת ה ג'ל ה רטובה והשמנה (Liquid Drop Art) */}
            <g className="drop-shadow-[0_3px_5px_rgba(0,0,0,0.25)]">
              {/* מבנה הטיפה הנוזלית */}
              <path
                d="M23,79 C15,82 13,95 23,95 C33,95 31,82 23,79 Z"
                fill="url(#drop-gel)"
              />
              {/* נקודת אור לבנה חזקה לברק של נוזל ריאליסטי */}
              <ellipse cx="20.5" cy="85.5" rx="2.5" ry="4" fill="#ffffff" transform="rotate(-15 20.5 85.5)" opacity="0.85" />
            </g>
          </svg>
        </motion.div>

      </div>

      {/* ── טקסט טעינה יוקרתי ── */}
      {text && (
        <motion.p
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          className="text-sm font-medium text-pink-700/80 tracking-widest uppercase font-sans"
        >
          {text}
        </motion.p>
      )}
    </div>
  )
}
