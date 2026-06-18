'use client'

import { motion } from 'framer-motion'

const sparkles = [
  { x: -38, y: -15, delay: 0.2, size: 9 },
  { x: 38, y: -18, delay: 0.55, size: 7 },
  { x: -28, y: 30, delay: 0.85, size: 8 },
  { x: 32, y: 26, delay: 0.35, size: 6 },
  { x: 2,  y: -34, delay: 0.7,  size: 10 },
]

interface NailLoaderProps {
  text?: string
  size?: 'sm' | 'md' | 'lg'
}

export function NailLoader({ text = 'טוענת...', size = 'md' }: NailLoaderProps) {
  const scale = size === 'sm' ? 0.65 : size === 'lg' ? 1.3 : 1

  return (
    <div
      className="flex flex-col items-center gap-6"
      style={{ transform: `scale(${scale})`, transformOrigin: 'center top' }}
    >
      {/* ── main scene ── */}
      <div className="relative" style={{ width: 120, height: 210 }}>

        {/* sparkles around the nail */}
        {sparkles.map((s, i) => (
          <motion.div
            key={i}
            className="absolute pointer-events-none"
            style={{ left: `calc(50% + ${s.x}px)`, top: `calc(50% + ${s.y - 20}px)` }}
            animate={{ opacity: [0, 1, 0], scale: [0, 1.3, 0], rotate: [0, 180, 360] }}
            transition={{ duration: 1.8, delay: s.delay, repeat: Infinity, repeatDelay: 0.5 }}
          >
            <svg width={s.size} height={s.size} viewBox="0 0 10 10" fill="none">
              <path d="M5 0L6 4L10 5L6 6L5 10L4 6L0 5L4 4Z" fill="url(#sp-g)" />
              <defs>
                <linearGradient id="sp-g" x1="0" y1="0" x2="10" y2="10">
                  <stop offset="0%" stopColor="hsl(326,100%,65%)" />
                  <stop offset="100%" stopColor="hsl(271,91%,65%)" />
                </linearGradient>
              </defs>
            </svg>
          </motion.div>
        ))}

        {/* ── SVG finger ── */}
        {/*
          Coordinate reference (viewBox 0 0 76 195):
          • Fingertip peak  : (38, 10)
          • Nail left/right : x=12 / x=64  at y≈68
          • Cuticle arch    : M12,68  Q38,58  64,68
          • Knuckle 1       : y≈125
          • Knuckle 2       : y≈150
          • Finger base     : y=192
        */}
        <svg
          width="76"
          height="195"
          viewBox="0 0 76 195"
          fill="none"
          className="absolute"
          style={{ left: 22, top: 8 }}
        >
          <defs>
            {/* Side-to-side skin shading */}
            <linearGradient id="skin-lr" x1="0" y1="0" x2="76" y2="0" gradientUnits="userSpaceOnUse">
              <stop offset="0%"   stopColor="hsl(12,52%,74%)" />
              <stop offset="22%"  stopColor="hsl(12,40%,86%)" />
              <stop offset="78%"  stopColor="hsl(12,40%,86%)" />
              <stop offset="100%" stopColor="hsl(12,52%,74%)" />
            </linearGradient>

            {/* Top-to-bottom soft shading on body */}
            <linearGradient id="skin-tb" x1="0" y1="0" x2="0" y2="195" gradientUnits="userSpaceOnUse">
              <stop offset="0%"   stopColor="hsl(12,38%,89%)" stopOpacity="0.9" />
              <stop offset="40%"  stopColor="hsl(12,38%,89%)" stopOpacity="0" />
              <stop offset="70%"  stopColor="hsl(12,45%,80%)" stopOpacity="0" />
              <stop offset="100%" stopColor="hsl(12,48%,78%)" stopOpacity="0.5" />
            </linearGradient>

            {/* Nail base colour */}
            <linearGradient id="nail-bg" x1="12" y1="10" x2="64" y2="68" gradientUnits="userSpaceOnUse">
              <stop offset="0%"   stopColor="hsl(0,0%,97%)" />
              <stop offset="100%" stopColor="hsl(0,0%,92%)" />
            </linearGradient>

            {/* Clip the paint to the exact nail shape */}
            <clipPath id="nail-clip">
              <path d="M12,68 Q12,18 38,10 Q64,18 64,68 Q38,58 12,68 Z" />
            </clipPath>
          </defs>

          {/* ── finger body ── */}
          <path
            d="M10,192 Q10,194 38,194 Q66,194 66,192
               L66,70
               Q66,16 38,10
               Q10,16 10,70
               Z"
            fill="url(#skin-lr)"
          />
          {/* overlay top-to-bottom gradient for depth */}
          <path
            d="M10,192 Q10,194 38,194 Q66,194 66,192
               L66,70
               Q66,16 38,10
               Q10,16 10,70
               Z"
            fill="url(#skin-tb)"
          />

          {/* ── left & right edge shadows ── */}
          <path d="M10,192 L10,70 Q10,16 38,10"
            stroke="hsl(12,50%,68%)" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <path d="M66,70 L66,192 Q66,194 38,194"
            stroke="hsl(12,50%,68%)" strokeWidth="2.5" fill="none" strokeLinecap="round" />

          {/* ── knuckle folds ── */}
          <path d="M16,125 Q38,132 60,125"
            stroke="hsl(12,44%,73%)" strokeWidth="1.8" strokeLinecap="round" fill="none" opacity="0.75" />
          <path d="M14,150 Q38,157 62,150"
            stroke="hsl(12,44%,73%)" strokeWidth="1.8" strokeLinecap="round" fill="none" opacity="0.55" />
          {/* subtle secondary line under each knuckle */}
          <path d="M17,130 Q38,136 59,130"
            stroke="hsl(12,44%,73%)" strokeWidth="1" strokeLinecap="round" fill="none" opacity="0.35" />

          {/* ── nail plate background ── */}
          <path
            d="M12,68 Q12,18 38,10 Q64,18 64,68 Q38,58 12,68 Z"
            fill="url(#nail-bg)"
          />

          {/* ── cuticle arch ── */}
          <path d="M12,68 Q38,58 64,68"
            stroke="hsl(12,46%,72%)" strokeWidth="1.8" strokeLinecap="round" fill="none" />

          {/* ── nail border (subtle) ── */}
          <path
            d="M12,68 Q12,18 38,10 Q64,18 64,68"
            stroke="hsl(12,35%,80%)" strokeWidth="1" fill="none" opacity="0.8" />
        </svg>

        {/* ── animated paint fill (div clipped to nail shape) ── */}
        {/*
          The nail SVG path in container coords:
            left edge at x = 22+12 = 34,  top y = 8+10 = 18
            right edge at x = 22+64 = 86
            cuticle y    = 8+68 = 76
          We place the div at (34, 18), size 52 × 58
          and re-express the nail path relative to that origin:
            M0,58 Q0,8 26,0 Q52,8 52,58 Q26,48 0,58 Z
        */}
        <div
          className="absolute overflow-hidden"
          style={{
            left: 34, top: 18,
            width: 52, height: 60,
            clipPath: 'path("M0,58 Q0,8 26,0 Q52,8 52,58 Q26,48 0,58 Z")',
          }}
        >
          {/* paint sweep */}
          <motion.div
            animate={{ scaleX: [0, 1, 1, 0] }}
            transition={{
              duration: 2.2,
              times: [0, 0.44, 0.64, 1],
              repeat: Infinity,
              repeatDelay: 0.35,
              ease: [0.4, 0, 0.2, 1],
            }}
            style={{
              position: 'absolute', inset: 0,
              background:
                'linear-gradient(135deg, hsl(326,100%,62%) 0%, hsl(295,85%,62%) 40%, hsl(271,91%,65%) 70%, hsl(250,95%,68%) 100%)',
              transformOrigin: 'right center',
            }}
          />
          {/* gloss sweep */}
          <motion.div
            animate={{ x: ['-140%', '240%'] }}
            transition={{
              duration: 1.9, repeat: Infinity,
              repeatDelay: 0.35, delay: 0.55,
              ease: [0.4, 0, 0.6, 1],
            }}
            style={{
              position: 'absolute', inset: 0,
              width: '32%',
              background:
                'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.52) 50%, transparent 100%)',
              transform: 'skewX(-12deg)',
            }}
          />
        </div>

        {/* ── nail-polish brush ── */}
        <motion.div
          className="absolute"
          style={{ left: 'calc(50% - 10px)', top: -10 }}
          animate={{ x: [30, -30, 30], opacity: [0, 1, 1, 0] }}
          transition={{
            duration: 2.2,
            times: [0, 0.07, 0.93, 1],
            repeat: Infinity,
            repeatDelay: 0.35,
            ease: [0.4, 0, 0.2, 1],
          }}
        >
          <svg width="22" height="56" viewBox="0 0 22 56" fill="none">
            {/* cap */}
            <rect x="7" y="0" width="8" height="4" rx="2" fill="#b0b0bc" />
            {/* handle */}
            <rect x="8.5" y="3" width="5" height="30" rx="2" fill="#d4d4de" />
            {/* ferrule */}
            <rect x="7.5" y="32" width="7" height="5" rx="1.5" fill="#a8a8b8" />
            {/* bristles – tapered */}
            <path d="M7.5,37 Q11,56 14.5,37 Z" fill="url(#br-g)" />
            <defs>
              <linearGradient id="br-g" x1="7.5" y1="37" x2="14.5" y2="56" gradientUnits="userSpaceOnUse">
                <stop offset="0%"   stopColor="hsl(326,100%,60%)" />
                <stop offset="100%" stopColor="hsl(271,91%,65%)" />
              </linearGradient>
            </defs>
          </svg>
        </motion.div>
      </div>

      {/* label */}
      {text && (
        <motion.p
          animate={{ opacity: [0.35, 1, 0.35] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
          className="text-sm font-bold text-gray-400 tracking-wide"
        >
          {text}
        </motion.p>
      )}
    </div>
  )
}
