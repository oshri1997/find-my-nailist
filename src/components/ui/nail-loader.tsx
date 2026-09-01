'use client'

import { motion, useReducedMotion } from 'framer-motion'

interface NailLoaderProps { text?: string; size?: 'sm' | 'md' | 'lg' }

const cycle = { duration: 2.65, repeat: Infinity, ease: [0.45, 0, 0.2, 1] as [number, number, number, number] }

/** A studio-style manicure gesture: one finger, glassy lacquer, precise brush. */
export function NailLoader({ text = 'טוענת…', size = 'md' }: NailLoaderProps) {
  const scale = size === 'sm' ? 0.72 : size === 'lg' ? 1.12 : 0.9
  const reduceMotion = useReducedMotion()

  return <div className="flex flex-col items-center gap-4" style={{ transform: `scale(${scale})`, transformOrigin: 'center' }}>
    <svg aria-hidden="true" className="h-[204px] w-[176px] overflow-visible" viewBox="0 0 176 204" fill="none">
      <defs>
        <linearGradient id="nail-loader-skin" x1="39" y1="54" x2="136" y2="198" gradientUnits="userSpaceOnUse"><stop stopColor="#F7D9CC" /><stop offset=".55" stopColor="#EBC0B0" /><stop offset="1" stopColor="#C98777" /></linearGradient>
        <linearGradient id="nail-loader-bed" x1="88" y1="55" x2="88" y2="150" gradientUnits="userSpaceOnUse"><stop stopColor="#FFF4F0" /><stop offset="1" stopColor="#F3D4CC" /></linearGradient>
        <linearGradient id="nail-loader-lacquer" x1="54" y1="100" x2="122" y2="154" gradientUnits="userSpaceOnUse"><stop stopColor="#9D174D" /><stop offset=".48" stopColor="#F5175C" /><stop offset="1" stopColor="#FF8DAF" /></linearGradient>
        <linearGradient id="nail-loader-cap" x1="0" y1="0" x2="0" y2="34" gradientUnits="userSpaceOnUse"><stop stopColor="#4A4C5A" /><stop offset="1" stopColor="#171822" /></linearGradient>
        <clipPath id="nail-loader-clip"><path d="M54 147V93C54 63 68 48 88 48C108 48 122 63 122 93V147C112 160 64 160 54 147Z" /></clipPath>
        <filter id="nail-loader-shadow" x="16" y="34" width="144" height="174" filterUnits="userSpaceOnUse"><feDropShadow dx="0" dy="13" stdDeviation="11" floodColor="#5E1839" floodOpacity=".2" /></filter>
      </defs>
      <ellipse cx="88" cy="190" rx="50" ry="9" fill="#F5175C" opacity=".1" />
      <g filter="url(#nail-loader-shadow)">
        <path d="M34 202V116C34 75 55 51 88 51C121 51 142 75 142 116V202H34Z" fill="url(#nail-loader-skin)" />
        <path d="M54 147V93C54 63 68 48 88 48C108 48 122 63 122 93V147C112 160 64 160 54 147Z" fill="url(#nail-loader-bed)" />
        <g clipPath="url(#nail-loader-clip)" data-testid="nail-polish-layer">
          <motion.rect x="49" width="78" fill="url(#nail-loader-lacquer)" animate={reduceMotion ? undefined : { y: [152, 102, 58, 58, 152], height: [0, 50, 96, 96, 0] }} transition={cycle} />
          <motion.path d="M70 66C73 86 71 119 69 139" stroke="#FFF7FA" strokeWidth="4" strokeLinecap="round" animate={reduceMotion ? undefined : { pathLength: [0, .5, 1, 1, 0], opacity: [0, .18, .52, .52, 0] }} transition={cycle} />
        </g>
        <path d="M54 147V93C54 63 68 48 88 48C108 48 122 63 122 93V147C112 160 64 160 54 147Z" stroke="#B66A68" strokeOpacity=".22" strokeWidth="1.2" />
      </g>
      <motion.g data-testid="nail-polish-brush" animate={reduceMotion ? undefined : { y: [35, -13, -13, 35, 35], opacity: [0, 1, 1, 0, 0] }} transition={cycle}>
        <rect x="62" y="0" width="52" height="35" rx="8" fill="url(#nail-loader-cap)" /><rect x="67" y="5" width="42" height="4" rx="2" fill="#A6A9BA" opacity=".55" />
        <path d="M70 35H106L101 52H75L70 35Z" fill="#292A35" /><rect x="82" y="50" width="12" height="37" rx="3" fill="#F5175C" />
        <path d="M77 85H99L97 99C94 105 82 105 79 99L77 85Z" fill="#231E2B" /><path d="M81 97H95L93 108C90 112 86 112 83 108L81 97Z" fill="#F5175C" />
      </motion.g>
      <text x="88" y="202" textAnchor="middle" className="fill-muted-foreground" fontSize="9" fontWeight="700" letterSpacing="1.8">NAILISTIOT</text>
    </svg>
    {text && <p className="text-sm font-semibold text-primary/85">{text}</p>}
  </div>
}
