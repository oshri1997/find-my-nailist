'use client'

import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'

interface ImageLightboxProps {
  src: string
  alt?: string
  onClose: () => void
  onPrevious?: () => void
  onNext?: () => void
  canGoPrevious?: boolean
  canGoNext?: boolean
  currentIndex?: number
  totalImages?: number
}

// Facebook-style photo viewer: click a thumbnail to open it full-size,
// click the backdrop or the X (or press Escape) to close.
export function ImageLightbox({
  src,
  alt,
  onClose,
  onPrevious,
  onNext,
  canGoPrevious = false,
  canGoNext = false,
  currentIndex = 0,
  totalImages = 1,
}: ImageLightboxProps) {
  const showNavigation = Boolean(onPrevious && onNext)
  const touchStart = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft' && canGoPrevious) onPrevious?.()
      if (e.key === 'ArrowRight' && canGoNext) onNext?.()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [canGoNext, canGoPrevious, onClose, onNext, onPrevious])

  function handleTouchStart(event: React.TouchEvent<HTMLImageElement>) {
    const touch = event.touches[0]
    if (touch) touchStart.current = { x: touch.clientX, y: touch.clientY }
  }

  function handleTouchEnd(event: React.TouchEvent<HTMLImageElement>) {
    const start = touchStart.current
    touchStart.current = null
    const touch = event.changedTouches[0]
    if (!start || !touch) return

    const deltaX = touch.clientX - start.x
    const deltaY = touch.clientY - start.y
    if (Math.abs(deltaX) < 50 || Math.abs(deltaX) <= Math.abs(deltaY)) return

    if (deltaX < 0 && canGoNext) onNext?.()
    if (deltaX > 0 && canGoPrevious) onPrevious?.()
  }

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-[300] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 cursor-zoom-out"
        >
        {showNavigation && (
          <>
            <button
              type="button"
              onClick={(event) => { event.stopPropagation(); onPrevious?.() }}
              disabled={!canGoPrevious}
              aria-label="תמונה קודמת"
              className="absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/15 hover:bg-white/25 disabled:opacity-40 disabled:cursor-not-allowed hidden md:flex items-center justify-center text-white transition-colors"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <button
              type="button"
              onClick={(event) => { event.stopPropagation(); onNext?.() }}
              disabled={!canGoNext}
              aria-label="תמונה הבאה"
              className="absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/15 hover:bg-white/25 disabled:opacity-40 disabled:cursor-not-allowed hidden md:flex items-center justify-center text-white transition-colors"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </>
        )}
        <button
          type="button"
          onClick={onClose}
          aria-label="סגירה"
          className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>
        {totalImages > 1 && (
          <div
            aria-hidden="true"
            dir="ltr"
            data-testid="lightbox-pagination"
            className="pointer-events-none absolute bottom-7 left-1/2 -translate-x-1/2 flex items-center gap-1.5 md:hidden"
          >
            {Array.from({ length: totalImages }, (_, index) => (
              <span
                key={index}
                data-testid={`lightbox-dot-${index}`}
                className={`h-1.5 rounded-full transition-all ${index === currentIndex ? 'w-4 bg-white' : 'w-1.5 bg-white/55'}`}
              />
            ))}
          </div>
        )}
        <motion.img
          initial={{ scale: 0.92, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.92, opacity: 0 }}
          transition={{ duration: 0.18 }}
          src={src}
          alt={alt ?? ''}
          onClick={(e) => e.stopPropagation()}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          className="max-w-full max-h-full rounded-xl object-contain shadow-2xl cursor-auto"
        />
      </motion.div>
    </AnimatePresence>,
    document.body
  )
}
