'use client'

import { useRef, type MouseEvent, type ReactNode } from 'react'
import { motion, useMotionValue, useSpring, useTransform, useReducedMotion } from 'framer-motion'

interface TiltCardProps {
  children: ReactNode
  className?: string
  maxTiltDeg?: number
}

// A lightweight CSS-3D hover tilt (perspective + rotateX/rotateY tracking the
// cursor) — the "Dimensional Layering" style the design skill recommends for
// this kind of product over a full WebGL/Three.js scene, which scores poorly
// on both performance and accessibility for a booking marketplace. Respects
// prefers-reduced-motion by rendering a static, untilted wrapper instead.
export function TiltCard({ children, className = '', maxTiltDeg = 8 }: TiltCardProps) {
  const ref = useRef<HTMLDivElement>(null)
  const prefersReducedMotion = useReducedMotion()

  const pointerX = useMotionValue(0.5)
  const pointerY = useMotionValue(0.5)
  const springConfig = { stiffness: 300, damping: 30, mass: 0.5 }
  const rotateX = useSpring(useTransform(pointerY, [0, 1], [maxTiltDeg, -maxTiltDeg]), springConfig)
  const rotateY = useSpring(useTransform(pointerX, [0, 1], [-maxTiltDeg, maxTiltDeg]), springConfig)

  function handleMouseMove(e: MouseEvent<HTMLDivElement>) {
    const rect = ref.current?.getBoundingClientRect()
    if (!rect) return
    pointerX.set((e.clientX - rect.left) / rect.width)
    pointerY.set((e.clientY - rect.top) / rect.height)
  }

  function handleMouseLeave() {
    pointerX.set(0.5)
    pointerY.set(0.5)
  }

  if (prefersReducedMotion) {
    return <div className={className}>{children}</div>
  }

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ rotateX, rotateY, transformStyle: 'preserve-3d', perspective: 800 }}
      className={className}
    >
      {children}
    </motion.div>
  )
}
