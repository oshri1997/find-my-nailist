import type { Variants } from 'framer-motion'

const POLISH_EASE = [0.22, 1, 0.36, 1] as const

export const AUTH_TAB_TRANSITION = {
  duration: 0.28,
  ease: POLISH_EASE,
} as const

export function getAuthContentVariants(reducedMotion: boolean): Variants {
  if (reducedMotion) {
    return {
      enter: { opacity: 0 },
      center: { opacity: 1, transition: { duration: 0 } },
      exit: { opacity: 0, transition: { duration: 0 } },
    }
  }

  return {
    enter: { opacity: 0, y: 8, scale: 0.99, filter: 'blur(6px)' },
    center: {
      opacity: 1,
      y: 0,
      scale: 1,
      filter: 'blur(0px)',
      transition: { duration: 0.34, ease: POLISH_EASE },
    },
    exit: {
      opacity: 0,
      y: -4,
      scale: 0.995,
      filter: 'blur(4px)',
      transition: { duration: 0.16, ease: [0.4, 0, 1, 1] },
    },
  }
}
