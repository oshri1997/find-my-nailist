'use client'

import { useAuth } from '@/components/auth/auth-provider'
import { NailLoader } from '@/components/ui/nail-loader'
import { cn } from '@/lib/utils'

interface PageLoaderProps {
  /** Hebrew copy under the animation. Defaults to the NailLoader's own text. */
  text?: string
  className?: string
}

/**
 * The one approved way for a page to render a full-screen loading state.
 *
 * AuthProvider already covers the whole viewport with a single branded loader
 * while Firebase restores the account. A page that renders its own loader at
 * that same moment puts a second spinner on screen for one wait — so this one
 * stands down until the global layer is gone and only page data is left to
 * load. Pages should never hand-roll a full-screen loader instead of this.
 */
export function PageLoader({ text, className }: PageLoaderProps) {
  const { loading: authLoading } = useAuth()

  if (authLoading) return null

  return (
    <div className={cn('min-h-screen flex items-center justify-center bg-background', className)}>
      <NailLoader size="lg" text={text} />
    </div>
  )
}
