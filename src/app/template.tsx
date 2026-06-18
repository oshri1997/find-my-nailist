'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { NailLoader } from '@/components/ui/nail-loader'

export default function Template({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 750)
    return () => clearTimeout(t)
  }, [])

  return (
    <>
      <AnimatePresence>
        {loading && (
          <motion.div
            key="nail-loader"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-white/85 backdrop-blur-md"
          >
            <NailLoader size="lg" />
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.15 }}
      >
        {children}
      </motion.div>
    </>
  )
}
