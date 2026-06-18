'use client'

import { motion } from 'framer-motion'

const sparklePositions = [
  { x: -28, y: -10, delay: 0.3 },
  { x: 28, y: -14, delay: 0.5 },
  { x: -20, y: 20, delay: 0.7 },
  { x: 24, y: 18, delay: 0.2 },
  { x: 0, y: -24, delay: 0.9 },
]

interface NailLoaderProps {
  text?: string
  size?: 'sm' | 'md' | 'lg'
}

export function NailLoader({ text = 'טוענת...', size = 'md' }: NailLoaderProps) {
  const scale = size === 'sm' ? 0.7 : size === 'lg' ? 1.4 : 1

  return (
    <div className="flex flex-col items-center justify-center gap-5" style={{ transform: `scale(${scale})` }}>
      <div className="relative flex items-center justify-center">
        {/* Sparkles */}
        {sparklePositions.map((pos, i) => (
          <motion.div
            key={i}
            className="absolute"
            style={{ left: `calc(50% + ${pos.x}px)`, top: `calc(50% + ${pos.y}px)` }}
            initial={{ opacity: 0, scale: 0 }}
            animate={{
              opacity: [0, 1, 0],
              scale: [0, 1.2, 0],
              rotate: [0, 180, 360],
            }}
            transition={{
              duration: 1.6,
              delay: pos.delay,
              repeat: Infinity,
              repeatDelay: 0.4,
            }}
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path
                d="M5 0L5.8 3.9L9.5 5L5.8 6.1L5 10L4.2 6.1L0.5 5L4.2 3.9L5 0Z"
                fill="url(#sparkle-grad)"
              />
              <defs>
                <linearGradient id="sparkle-grad" x1="0" y1="0" x2="10" y2="10">
                  <stop offset="0%" stopColor="hsl(326,100%,65%)" />
                  <stop offset="100%" stopColor="hsl(271,91%,65%)" />
                </linearGradient>
              </defs>
            </svg>
          </motion.div>
        ))}

        {/* Finger + Nail assembly */}
        <div className="w-14 flex flex-col items-center">
          {/* Cuticle area */}
          <div className="w-10 h-2 bg-gradient-to-b from-rose-200 to-rose-100 rounded-t-full" />

          {/* Nail */}
          <div className="relative w-12 h-14 rounded-t-[45%] overflow-hidden bg-gray-100 border-2 border-gray-200 shadow-inner">
            {/* Paint fill - sweeps right to left */}
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: [0, 1, 1, 0] }}
              transition={{
                duration: 2,
                times: [0, 0.5, 0.7, 1],
                repeat: Infinity,
                repeatDelay: 0.2,
                ease: 'easeInOut',
              }}
              className="absolute inset-0"
              style={{
                background: 'linear-gradient(135deg, hsl(326,100%,60%) 0%, hsl(271,91%,65%) 60%, hsl(250,95%,68%) 100%)',
                transformOrigin: 'right center',
              }}
            />

            {/* Gloss/shine sweep */}
            <motion.div
              animate={{ x: ['-120%', '220%'] }}
              transition={{
                duration: 1.8,
                repeat: Infinity,
                repeatDelay: 0.4,
                ease: 'easeInOut',
                delay: 0.5,
              }}
              className="absolute inset-0 w-1/3 skew-x-[-15deg]"
              style={{
                background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.45) 50%, transparent 100%)',
              }}
            />
          </div>

          {/* Finger body */}
          <div
            className="w-12 h-16 border-x-2 border-b-0 border-gray-200"
            style={{
              background: 'linear-gradient(180deg, hsl(350,80%,88%) 0%, hsl(350,70%,82%) 100%)',
              borderRadius: '0 0 40% 40%',
            }}
          />
          {/* Knuckle highlight */}
          <div
            className="w-14 h-3 -mt-1"
            style={{
              background: 'linear-gradient(180deg, hsl(350,70%,80%) 0%, hsl(350,65%,78%) 100%)',
              borderRadius: '0 0 50% 50%',
            }}
          />
        </div>

        {/* Brush */}
        <motion.div
          animate={{
            x: [22, -22, 22],
            rotate: [-30, -30, -30],
            opacity: [0, 1, 1, 0],
          }}
          transition={{
            duration: 2,
            times: [0, 0.1, 0.9, 1],
            repeat: Infinity,
            repeatDelay: 0.2,
            ease: 'easeInOut',
          }}
          className="absolute -top-2"
          style={{ transformOrigin: 'bottom center' }}
        >
          <svg width="20" height="44" viewBox="0 0 20 44" fill="none">
            {/* Brush handle */}
            <rect x="8" y="0" width="4" height="28" rx="2" fill="#d1d5db" />
            {/* Ferrule */}
            <rect x="7" y="26" width="6" height="5" rx="1" fill="#9ca3af" />
            {/* Bristles */}
            <path d="M7 31 Q10 44 13 31 Z" fill="url(#brush-grad)" />
            <defs>
              <linearGradient id="brush-grad" x1="7" y1="31" x2="13" y2="44" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="hsl(326,100%,60%)" />
                <stop offset="100%" stopColor="hsl(271,91%,65%)" />
              </linearGradient>
            </defs>
          </svg>
        </motion.div>
      </div>

      {/* Label */}
      {text && (
        <motion.p
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
          className="text-sm font-bold text-gray-400 tracking-wide"
        >
          {text}
        </motion.p>
      )}
    </div>
  )
}
