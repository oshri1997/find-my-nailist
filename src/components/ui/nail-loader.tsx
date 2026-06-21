'use client'

import { motion } from 'framer-motion'

/*
  Container (120 × 165 px):
  • SVG finger placed at left=22, top=10 → size 76×145
  • Nail in SVG coords: tip at (38,10), cuticle arch at y=68
  • Nail in container coords: tip y=20, cuticle y=78
  • Paint div: left=34, top=20, w=52, h=58 — clipped to nail shape
  • Brush: bristle tip length ≈ 20px (from y=35 to y=55 in brush SVG)
    • Brush div at top=23 → bristle starts at container y = 23+55 = 78 (cuticle) ✓
    • Animating y from 0 → -58 moves bristle to container y = 78-58 = 20 (tip) ✓
*/

const SPARKLES = [
  { x: -48, y: -28, delay: 0.10, size: 13 },
  { x:  46, y: -30, delay: 0.40, size: 10 },
  { x: -38, y:  12, delay: 0.75, size: 11 },
  { x:  42, y:   8, delay: 0.25, size: 8  },
  { x:   2, y: -46, delay: 0.60, size: 14 },
  { x: -56, y:  -8, delay: 0.90, size: 8  },
  { x:  54, y:  -6, delay: 0.15, size: 9  },
  { x:  20, y: -38, delay: 0.50, size: 10 },
]

const SPARKLE_COLORS = [
  '#f472b6', '#e879f9', '#c084fc', '#a78bfa',
  '#818cf8', '#f9a8d4', '#d946ef', '#8b5cf6',
]

interface NailLoaderProps {
  text?: string
  size?: 'sm' | 'md' | 'lg'
}

export function NailLoader({ text = 'טוענת...', size = 'md' }: NailLoaderProps) {
  const scale = size === 'sm' ? 0.65 : size === 'lg' ? 1.3 : 1

  return (
    <div
      className="flex flex-col items-center gap-5"
      style={{ transform: `scale(${scale})`, transformOrigin: 'center top' }}
    >
      <div className="relative" style={{ width: 120, height: 165 }}>

        {/* sparkles */}
        {SPARKLES.map((s, i) => (
          <motion.div
            key={i}
            className="absolute pointer-events-none"
            style={{ left: `calc(50% + ${s.x}px)`, top: `${50 + s.y}px` }}
            animate={{ opacity: [0, 1, 0], scale: [0, 1.5, 0], rotate: [0, 180, 360] }}
            transition={{ duration: 1.9, delay: s.delay, repeat: Infinity, repeatDelay: 0.8 }}
          >
            <svg width={s.size} height={s.size} viewBox="0 0 10 10" fill="none">
              <path d="M5 0L6 4L10 5L6 6L5 10L4 6L0 5L4 4Z" fill={SPARKLE_COLORS[i]} />
            </svg>
          </motion.div>
        ))}

        {/* ── finger SVG — shorter (145 px tall vs original 195 px) ── */}
        <svg
          width="76" height="145" viewBox="0 0 76 145"
          fill="none" className="absolute" style={{ left: 22, top: 10 }}
        >
          <defs>
            {/* left-right skin shading */}
            <linearGradient id="nl-lr" x1="0" y1="0" x2="76" y2="0" gradientUnits="userSpaceOnUse">
              <stop offset="0%"   stopColor="hsl(14,50%,73%)" />
              <stop offset="20%"  stopColor="hsl(14,38%,88%)" />
              <stop offset="80%"  stopColor="hsl(14,38%,88%)" />
              <stop offset="100%" stopColor="hsl(14,50%,73%)" />
            </linearGradient>
            {/* top-bottom depth */}
            <linearGradient id="nl-tb" x1="0" y1="0" x2="0" y2="145" gradientUnits="userSpaceOnUse">
              <stop offset="0%"   stopColor="hsl(14,36%,93%)" stopOpacity="0.9" />
              <stop offset="35%"  stopColor="hsl(14,36%,93%)" stopOpacity="0"   />
              <stop offset="80%"  stopColor="hsl(14,44%,80%)" stopOpacity="0"   />
              <stop offset="100%" stopColor="hsl(14,48%,76%)" stopOpacity="0.55" />
            </linearGradient>
            {/* nail plate base */}
            <linearGradient id="nl-nail" x1="38" y1="10" x2="38" y2="68" gradientUnits="userSpaceOnUse">
              <stop offset="0%"   stopColor="#fafafa" />
              <stop offset="100%" stopColor="#ebebeb" />
            </linearGradient>
            {/* nail left-side highlight */}
            <linearGradient id="nl-hi" x1="18" y1="12" x2="40" y2="44" gradientUnits="userSpaceOnUse">
              <stop offset="0%"   stopColor="rgba(255,255,255,0.92)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0)"    />
            </linearGradient>
          </defs>

          {/* finger body */}
          <path
            d="M10,142 Q10,144 38,144 Q66,144 66,142 L66,70 Q66,16 38,10 Q10,16 10,70 Z"
            fill="url(#nl-lr)"
          />
          {/* depth overlay */}
          <path
            d="M10,142 Q10,144 38,144 Q66,144 66,142 L66,70 Q66,16 38,10 Q10,16 10,70 Z"
            fill="url(#nl-tb)"
          />

          {/* edge shadows */}
          <path d="M10,142 L10,70 Q10,16 38,10"
            stroke="hsl(14,46%,67%)" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <path d="M66,70 L66,142 Q66,144 38,144"
            stroke="hsl(14,46%,67%)" strokeWidth="2.5" fill="none" strokeLinecap="round" />

          {/* knuckle folds — repositioned for shorter finger */}
          <path d="M16,92 Q38,99 60,92"
            stroke="hsl(14,42%,72%)" strokeWidth="1.8" strokeLinecap="round" fill="none" opacity="0.75" />
          <path d="M17,97 Q38,103 59,97"
            stroke="hsl(14,42%,72%)" strokeWidth="1"   strokeLinecap="round" fill="none" opacity="0.35" />
          <path d="M14,116 Q38,123 62,116"
            stroke="hsl(14,42%,72%)" strokeWidth="1.8" strokeLinecap="round" fill="none" opacity="0.55" />

          {/* nail plate */}
          <path
            d="M12,68 Q12,18 38,10 Q64,18 64,68 Q38,58 12,68 Z"
            fill="url(#nl-nail)"
          />

          {/* lunula — white crescent at base of nail */}
          <ellipse cx="38" cy="63" rx="18" ry="9" fill="rgba(255,255,255,0.60)" />

          {/* left-side specular highlight */}
          <path
            d="M18,60 Q16,22 38,12 Q48,17 50,32 Q36,27 18,60 Z"
            fill="url(#nl-hi)" opacity="0.75"
          />

          {/* cuticle arch */}
          <path d="M12,68 Q38,58 64,68"
            stroke="hsl(14,44%,70%)" strokeWidth="1.8" strokeLinecap="round" fill="none" />

          {/* nail border */}
          <path
            d="M12,68 Q12,18 38,10 Q64,18 64,68"
            stroke="rgba(195,175,185,0.5)" strokeWidth="1" fill="none" />
        </svg>

        {/* ── paint fill — grows from cuticle (bottom) up to tip ── */}
        <div
          className="absolute overflow-hidden"
          style={{
            left: 34, top: 20, width: 52, height: 58,
            clipPath: 'path("M0,58 Q0,8 26,0 Q52,8 52,58 Q26,48 0,58 Z")',
          }}
        >
          {/* main colour — 0deg = bottom→top */}
          <motion.div
            animate={{ scaleY: [0, 1, 1, 0] }}
            transition={{
              duration: 2.8,
              times: [0, 0.42, 0.65, 1],
              repeat: Infinity, repeatDelay: 0.35,
              ease: [0.4, 0, 0.2, 1],
            }}
            style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(0deg, hsl(326,100%,60%) 0%, hsl(300,88%,58%) 38%, hsl(271,91%,62%) 70%, hsl(248,95%,65%) 100%)',
              transformOrigin: 'center bottom',
            }}
          />
          {/* gloss band sweeps upward */}
          <motion.div
            animate={{ y: ['115%', '-40%'] }}
            transition={{
              duration: 2.0, repeat: Infinity, repeatDelay: 0.4, delay: 0.65,
              ease: [0.4, 0, 0.6, 1],
            }}
            style={{
              position: 'absolute', left: 0, right: 0,
              height: '36%',
              background: 'linear-gradient(180deg, transparent 0%, rgba(255,255,255,0.50) 50%, transparent 100%)',
            }}
          />
        </div>

        {/* ── brush — strokes bottom (cuticle) → top (tip) ── */}
        <motion.div
          className="absolute"
          style={{ left: 'calc(50% - 11px)', top: 23 }}
          animate={{
            y:       [0,    0,    -58,  -58,  0  ],
            opacity: [0,    1,    1,    0,    0  ],
          }}
          transition={{
            duration: 2.8,
            times:    [0, 0.03, 0.43, 0.47, 1],
            repeat: Infinity, repeatDelay: 0.35,
            ease: [0.4, 0, 0.2, 1],
          }}
        >
          <svg width="22" height="56" viewBox="0 0 22 56" fill="none">
            {/* cap */}
            <rect x="7" y="0" width="8" height="4" rx="2" fill="#b4b4c4" />
            {/* handle */}
            <rect x="8.5" y="3" width="5" height="28" rx="2.5" fill="#dcdce8" />
            {/* sheen on handle */}
            <rect x="9.5" y="5" width="1.5" height="23" rx="0.75" fill="rgba(255,255,255,0.65)" />
            {/* ferrule */}
            <rect x="7.5" y="30" width="7" height="5" rx="2" fill="#a8a8bc" />
            {/* bristles */}
            <path d="M8,35 Q11,55 14,35 Z" fill="url(#nl-br)" />
            <defs>
              <linearGradient id="nl-br" x1="8" y1="35" x2="14" y2="55" gradientUnits="userSpaceOnUse">
                <stop offset="0%"   stopColor="hsl(326,100%,58%)" />
                <stop offset="100%" stopColor="hsl(271,91%,63%)"  />
              </linearGradient>
            </defs>
          </svg>
        </motion.div>

      </div>

      {text && (
        <motion.p
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
          className="text-sm font-bold text-muted-foreground tracking-wide"
        >
          {text}
        </motion.p>
      )}
    </div>
  )
}
