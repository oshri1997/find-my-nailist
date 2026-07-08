'use client'

import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'

interface ImageLightboxProps {
  src: string
  alt?: string
  onClose: () => void
}

// Facebook-style photo viewer: click a thumbnail to open it full-size,
// click the backdrop or the X (or press Escape) to close.
export function ImageLightbox({ src, alt, onClose }: ImageLightboxProps) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-[300] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 cursor-zoom-out"
      >
        <button
          onClick={onClose}
          aria-label="סגירה"
          className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>
        <motion.img
          initial={{ scale: 0.92, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.92, opacity: 0 }}
          transition={{ duration: 0.18 }}
          src={src}
          alt={alt ?? ''}
          onClick={(e) => e.stopPropagation()}
          className="max-w-full max-h-full rounded-xl object-contain shadow-2xl cursor-auto"
        />
      </motion.div>
    </AnimatePresence>,
    document.body
  )
}
