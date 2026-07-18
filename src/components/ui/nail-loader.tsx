'use client'

import { motion } from 'framer-motion'

/*
  NailLoader v3 - Natural Shorter Nail Edition
  Inspired by watermarked_img_2404484961621109400.png
*/

const SPARKLES = [
  { x: -55, y: -25, delay: 0.1, size: 24 },
  { x: 55, y: 10, delay: 0.4, size: 20 },
  { x: -65, y: 15, delay: 0.7, size: 14 },
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

        {/* אפקט זוהר אחורי רך */}
        <div
          className="absolute inset-0 blur-2xl pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(254,215,170,0.2) 0%, transparent 70%)' }}
        />

        {/* נצנצים עדינים מסביב */}
        {SPARKLES.map((s, i) => (
          <motion.div
            key={i}
            className="absolute pointer-events-none drop-shadow-[0_0_4px_rgba(245,23,92,0.5)]"
            style={{ left: `calc(50% + ${s.x}px)`, top: `${80 + s.y}px` }}
            animate={{
              opacity: [0, 0.8, 0],
              scale: [0.5, 1, 0.5],
              rotate: [0, 20, 40],
            }}
            transition={{ duration: 2.4, delay: s.delay, repeat: Infinity, ease: 'easeInOut' }}
          >
            <svg width={s.size} height={s.size} viewBox="0 0 24 24" fill="none">
              <path d="M12 0L14.3 9.7L24 12L14.3 14.3L12 24L9.7 14.3L0 12L9.7 9.7Z" fill={`url(#sparkle-grad-${i})`} />
              <defs>
                <linearGradient id={`sparkle-grad-${i}`} x1="0" y1="0" x2="24" y2="24">
                  <stop offset="0%" stopColor="#fed7aa" />
                  <stop offset="50%" stopColor="#C2542D" />
                  <stop offset="100%" stopColor="#ea580c" />
                </linearGradient>
              </defs>
            </svg>
          </motion.div>
        ))}

        {/* ── האצבע והציפורן (בפרופורציה קצרה וטבעית) ── */}
        <svg
          width="90" height="180" viewBox="0 0 90 180"
          fill="none" className="absolute left-1/2 -translate-x-1/2 bottom-0"
        >
          <defs>
            {/* גוון עור ריאליסטי */}
            <linearGradient id="skin-base" x1="0" y1="0" x2="90" y2="0" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#e2b19d" />
              <stop offset="25%" stopColor="#f5d6ca" />
              <stop offset="75%" stopColor="#f5d6ca" />
              <stop offset="100%" stopColor="#e2b19d" />
            </linearGradient>

            <linearGradient id="skin-shadow" x1="0" y1="0" x2="0" y2="180" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#000000" stopOpacity="0.03" />
              <stop offset="50%" stopColor="#bd8168" stopOpacity="0" />
              <stop offset="100%" stopColor="#bd8168" stopOpacity="0.35" />
            </linearGradient>

            {/* מיטת הציפורן הטבעית */}
            <linearGradient id="nail-bed" x1="45" y1="65" x2="45" y2="135" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#f4e5e2" />
              <stop offset="70%" stopColor="#f3d1cb" />
              <stop offset="100%" stopColor="#eac2ba" />
            </linearGradient>
          </defs>

          {/* גוף האצבע */}
          <path
            d="M12,180 C12,145 12,105 12,85 C12,50 28,38 45,38 C62,38 78,50 78,85 C78,105 78,145 78,180 Z"
            fill="url(#skin-base)"
          />
          <path
            d="M12,180 C12,145 12,105 12,85 C12,50 28,38 45,38 C62,38 78,50 78,85 C78,105 78,145 78,180 Z"
            fill="url(#skin-shadow)"
          />

          {/* קמטוטי פרק אצבע עדינים */}
          <path d="M24,152 Q45,157 66,152" stroke="#cd957f" strokeWidth="1.2" strokeLinecap="round" opacity="0.5" />

          {/* הציפורן הקצרה והטבעית (הנמכנו את החלק העליון מ-32 ל-50) */}
          <path
            d="M19,125 C16,85 22,50 45,50 C68,50 74,85 71,125 C55,134 35,134 19,125 Z"
            fill="url(#nail-bed)"
          />

          {/* סהר הציפורן (Lunula) */}
          <path d="M32,122 C35,116 55,116 58,122 C52,125 38,125 32,122 Z" fill="rgba(255,255,255,0.5)" />

          {/* קו הקוטיקולה התחתון */}
          <path d="M19,125 C35,134 55,134 71,125" stroke="#ba826c" strokeWidth="1.8" strokeLinecap="round" fill="none" opacity="0.45" />
        </svg>

        {/* ── הלק (הצבע - מותאם לציפורן הקצרה) ── */}
        <div
          className="absolute overflow-hidden"
          style={{
            left: '50%',
            transform: 'translateX(-50%)',
            bottom: 55,
            width: 56,
            height: 76, // קוצר מ-94 ל-76 כדי להתאים לציפורן החדשה
            clipPath: 'path("M2,75 C-1,35 2,0 28,0 C54,0 57,35 54,75 C40,84 16,84 2,75 Z")',
          }}
        >
          {/* אפקט האומברה המשודרג */}
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
              background: 'linear-gradient(180deg, #ef4444 0%, #f59e0b 35%, #ea580c 75%, #c2410c 100%)',
              transformOrigin: 'center bottom',
            }}
          >
            {/* ברק (Gloss) קבוע לאורך הלק */}
            <div
              className="absolute inset-0"
              style={{
                background: 'linear-gradient(90deg, rgba(255,255,255,0) 25%, rgba(255,255,255,0.2) 33%, rgba(255,255,255,0) 45%)',
              }}
            />
          </motion.div>
        </div>

        {/* ── טפטפת יוקרתית עם טיפה רטובה ── */}
        <motion.div
          className="absolute left-1/2"
          style={{ x: '-50%', top: 10, zIndex: 10 }} // הזזנו מעט את נקודת ההתחלה להתאמה מושלמת
          animate={{
            y: [-35, 38, 38, -35],
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
              <linearGradient id="chrome-grad" x1="0" y1="0" x2="46" y2="0">
                <stop offset="0%" stopColor="#475569" />
                <stop offset="25%" stopColor="#cbd5e1" />
                <stop offset="50%" stopColor="#ffffff" />
                <stop offset="75%" stopColor="#94a3b8" />
                <stop offset="100%" stopColor="#334155" />
              </linearGradient>

              <linearGradient id="glass-grad" x1="0" y1="0" x2="16" y2="0">
                <stop offset="0%" stopColor="rgba(255,255,255,0.6)" />
                <stop offset="30%" stopColor="rgba(255,255,255,0.2)" />
                <stop offset="70%" stopColor="rgba(255,255,255,0.1)" />
                <stop offset="100%" stopColor="rgba(200,200,250,0.4)" />
              </linearGradient>

              <radialGradient id="drop-gel" cx="45%" cy="35%" r="60%">
                <stop offset="0%" stopColor="#fb923c" />
                <stop offset="40%" stopColor="#ea580c" />
                <stop offset="85%" stopColor="#9a3412" />
                <stop offset="100%" stopColor="#451a03" />
              </radialGradient>
            </defs>

            {/* ידית הכרום */}
            <path d="M8,0 L38,0 C41,0 43,2 43,5 L43,28 C43,31 41,33 38,33 L8,33 C5,33 3,31 3,28 L3,5 C3,2 5,0 8,0 Z" fill="url(#chrome-grad)" />
            <rect x="2" y="24" width="42" height="3" fill="#1e293b" opacity="0.3" />

            {/* בסיס הפיפטה */}
            <path d="M15,33 L31,33 L29,45 L17,45 Z" fill="url(#chrome-grad)" />

            {/* הצינורית השקופה */}
            <rect x="17" y="45" width="12" height="32" fill="url(#glass-grad)" stroke="rgba(255,255,255,0.4)" strokeWidth="0.5" />
            <rect x="19" y="45" width="8" height="32" fill="#ea580c" opacity="0.85" />

            {/* קצה הפיפטה */}
            <path d="M17,77 L21,83 L25,83 L29,77 Z" fill="url(#glass-grad)" />

            {/* הטיפה התלת-ממדית (המבריקה) */}
            <g className="drop-shadow-[0_3px_4px_rgba(0,0,0,0.2)]">
              <path
                d="M23,79 C15,82 13,95 23,95 C33,95 31,82 23,79 Z"
                fill="url(#drop-gel)"
              />
              <ellipse cx="20.5" cy="85.5" rx="2.5" ry="4" fill="#ffffff" transform="rotate(-15 20.5 85.5)" opacity="0.85" />
            </g>
          </svg>
        </motion.div>

      </div>

      {/* טקסט הטעינה המעודכן */}
      {text && (
        <motion.p
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          className="text-sm font-medium text-orange-700/80 tracking-widest uppercase"
        >
          {text}
        </motion.p>
      )}
    </div>
  )
}
