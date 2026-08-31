'use client'

import { motion, useReducedMotion } from 'framer-motion'

interface NailLoaderProps { text?: string; size?: 'sm' | 'md' | 'lg' }

const cycle = { duration: 2.5, repeat: Infinity, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] }

/** A restrained lacquer-stroke loader: studio tool, not an illustrated hand. */
export function NailLoader({ text = 'טוענת…', size = 'md' }: NailLoaderProps) {
  const scale = size === 'sm' ? 0.72 : size === 'lg' ? 1.12 : 0.9
  const reduceMotion = useReducedMotion()
  const animate = reduceMotion ? undefined : { pathLength: [0, 1, 1, 0], opacity: [0, 1, 1, 0] }

  return <div className="flex flex-col items-center gap-4" style={{ transform: `scale(${scale})`, transformOrigin: 'center' }}>
    <svg aria-hidden="true" className="h-[164px] w-[232px] overflow-visible" viewBox="0 0 232 164" fill="none">
      <defs>
        <linearGradient id="lacquer-loader-stroke" x1="45" y1="94" x2="186" y2="94" gradientUnits="userSpaceOnUse"><stop stopColor="#9D174D" /><stop offset=".48" stopColor="#F5175C" /><stop offset="1" stopColor="#FF9AB8" /></linearGradient>
        <linearGradient id="lacquer-loader-metal" x1="0" y1="0" x2="0" y2="38" gradientUnits="userSpaceOnUse"><stop stopColor="#353744" /><stop offset="1" stopColor="#14151C" /></linearGradient>
        <filter id="lacquer-loader-glow" x="20" y="54" width="192" height="84" filterUnits="userSpaceOnUse"><feGaussianBlur stdDeviation="10" /></filter>
      </defs>
      <rect x="36" y="58" width="160" height="72" rx="18" className="fill-foreground/[0.035] dark:fill-white/[0.045]" />
      <path d="M58 106H174" className="stroke-foreground/10 dark:stroke-white/10" strokeWidth="1" />
      <path d="M66 82H166" className="stroke-foreground/10 dark:stroke-white/10" strokeWidth="1" strokeDasharray="3 5" />
      <g data-testid="nail-polish-layer">
        <motion.path d="M52 96C71 87 88 101 108 95C127 89 145 101 180 92" stroke="url(#lacquer-loader-stroke)" strokeWidth="14" strokeLinecap="round" filter="url(#lacquer-loader-glow)" opacity=".24" animate={reduceMotion ? undefined : { pathLength: [0, 1, 1, 0] }} transition={cycle} />
        <motion.path d="M52 96C71 87 88 101 108 95C127 89 145 101 180 92" stroke="url(#lacquer-loader-stroke)" strokeWidth="9" strokeLinecap="round" animate={animate} transition={cycle} />
        <motion.path d="M60 94C81 88 94 98 111 93" stroke="#FFE6EE" strokeWidth="1.5" strokeLinecap="round" opacity=".8" animate={reduceMotion ? undefined : { pathLength: [0, 1, 1, 0] }} transition={cycle} />
      </g>
      <motion.g data-testid="nail-polish-brush" animate={reduceMotion ? undefined : { x: [-42, 94, 94, -42], y: [-6, 2, 2, -6], opacity: [0, 1, 1, 0] }} transition={cycle}>
        <rect x="44" y="18" width="30" height="37" rx="7" fill="url(#lacquer-loader-metal)" />
        <rect x="49" y="23" width="20" height="4" rx="2" fill="#8E93A5" opacity=".6" />
        <path d="M49 55H69L66 69H52L49 55Z" fill="#252630" /><path d="M53 69H65L69 88C66 94 52 94 49 88L53 69Z" fill="#F5175C" />
        <path d="M55 72H58L60 88" stroke="#FFB5CA" strokeWidth="1.6" strokeLinecap="round" opacity=".85" />
      </motion.g>
      <text x="116" y="151" textAnchor="middle" className="fill-muted-foreground" fontSize="10" fontWeight="700" letterSpacing="2">NAILISTIOT</text>
    </svg>
    {text && <p className="text-sm font-semibold text-primary/85">{text}</p>}
  </div>
}
