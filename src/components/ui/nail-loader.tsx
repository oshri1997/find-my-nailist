'use client'

import { motion } from 'framer-motion'

interface NailLoaderProps {
  text?: string
  size?: 'sm' | 'md' | 'lg'
}

const CYCLE = { duration: 2.8, times: [0, 0.48, 0.82, 0.94, 1], repeat: Infinity, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] }

/** A compact gel-brush animation used while the app restores its session. */
export function NailLoader({ text = 'טוענת…', size = 'md' }: NailLoaderProps) {
  const scale = size === 'sm' ? 0.68 : size === 'lg' ? 1.14 : 0.9

  return (
    <div className="flex flex-col items-center gap-4" style={{ transform: `scale(${scale})`, transformOrigin: 'center' }}>
      <svg aria-hidden="true" className="h-[224px] w-[184px] overflow-visible" viewBox="0 0 184 224" fill="none">
        <defs>
          <linearGradient id="loader-skin" x1="38" y1="54" x2="142" y2="224" gradientUnits="userSpaceOnUse"><stop stopColor="#F9D9CA" /><stop offset="0.48" stopColor="#F3C5B2" /><stop offset="1" stopColor="#D99D86" /></linearGradient>
          <linearGradient id="loader-nail-bed" x1="92" y1="54" x2="92" y2="166" gradientUnits="userSpaceOnUse"><stop stopColor="#FBEDEA" /><stop offset="1" stopColor="#EFC7BF" /></linearGradient>
          <linearGradient id="loader-gel" x1="54" y1="72" x2="130" y2="164" gradientUnits="userSpaceOnUse"><stop stopColor="#FF7AA6" /><stop offset="0.42" stopColor="#F5175C" /><stop offset="1" stopColor="#9D174D" /></linearGradient>
          <linearGradient id="loader-metal" x1="66" y1="0" x2="118" y2="0" gradientUnits="userSpaceOnUse"><stop stopColor="#303447" /><stop offset="0.48" stopColor="#777F98" /><stop offset="1" stopColor="#303447" /></linearGradient>
          <filter id="loader-shadow" x="20" y="42" width="144" height="200" filterUnits="userSpaceOnUse"><feDropShadow dx="0" dy="12" stdDeviation="12" floodColor="#16050D" floodOpacity="0.4" /></filter>
          <clipPath id="loader-nail-clip"><path d="M54 157V94C54 64 69 48 92 48C115 48 130 64 130 94V157C119 169 65 169 54 157Z" /></clipPath>
        </defs>

        <ellipse cx="92" cy="207" rx="54" ry="10" fill="#F5175C" opacity="0.1" />
        <g filter="url(#loader-shadow)">
          <path d="M35 224V116C35 75 58 51 92 51C126 51 149 75 149 116V224H35Z" fill="url(#loader-skin)" />
          <path d="M47 216V119C47 86 64 66 92 66C120 66 137 86 137 119V216" stroke="#C98771" strokeOpacity="0.26" strokeWidth="1.5" />
          <path d="M54 157V94C54 64 69 48 92 48C115 48 130 64 130 94V157C119 169 65 169 54 157Z" fill="url(#loader-nail-bed)" />
          <path d="M62 153C77 160 107 160 122 153" stroke="#D99A8D" strokeOpacity="0.55" strokeWidth="2" strokeLinecap="round" />
          <g clipPath="url(#loader-nail-clip)" data-testid="nail-polish-layer">
            <motion.rect x="50" width="84" fill="url(#loader-gel)" animate={{ y: [160, 104, 56, 56, 160], height: [0, 58, 106, 106, 0] }} transition={CYCLE} />
            <motion.path d="M68 65C72 86 70 126 68 148" stroke="white" strokeWidth="5" strokeLinecap="round" opacity="0.42" animate={{ pathLength: [0, 0.65, 1, 1, 0], opacity: [0, 0.16, 0.42, 0.42, 0] }} transition={CYCLE} />
          </g>
          <path d="M54 157V94C54 64 69 48 92 48C115 48 130 64 130 94V157C119 169 65 169 54 157Z" stroke="#C77B78" strokeOpacity="0.28" strokeWidth="1.3" />
        </g>
        <motion.g data-testid="nail-polish-brush" animate={{ y: [-50, 54, 54, -50, -50] }} transition={CYCLE}>
          <rect x="62" y="0" width="60" height="38" rx="9" fill="url(#loader-metal)" />
          <rect x="66" y="5" width="52" height="25" rx="6" fill="#8790A8" opacity="0.5" />
          <path d="M72 38H112L105 56H79L72 38Z" fill="#2A2B3A" />
          <rect x="85" y="52" width="14" height="42" rx="3" fill="#F5175C" />
          <rect x="88" y="52" width="3" height="42" rx="1.5" fill="#FFABC4" opacity="0.75" />
          <path d="M80 92H104L101 109C98 115 86 115 83 109L80 92Z" fill="#241D2B" />
          <path d="M84 105H100L97 116C94 120 90 120 87 116L84 105Z" fill="#F5175C" />
          <path d="M89 108H95" stroke="#FFB2C8" strokeWidth="2" strokeLinecap="round" />
        </motion.g>
      </svg>
      {text && <p className="text-sm font-semibold text-primary/85">{text}</p>}
    </div>
  )
}
