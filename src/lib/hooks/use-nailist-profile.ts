'use client'

import { useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { NailistProfile } from '@/types'

export const NAILIST_PROFILE_QUERY_KEY = ['me', 'nailist-profile'] as const

// GET /api/me/nailist-profile is not a pure read — it back-fills photoUrl and
// auto-creates a missing profile — so every duplicate call is a potential write,
// not just a wasted Firestore read. Hence a long stale window plus explicit
// invalidation from the mutation sites rather than the 60s global default.
const PROFILE_STALE_TIME = 5 * 60 * 1000

export class NailistProfileRequestError extends Error {
  constructor(readonly status: number) {
    super(`/api/me/nailist-profile responded ${status}`)
    this.name = 'NailistProfileRequestError'
  }
}

export function isUnauthorized(error: unknown): boolean {
  return error instanceof NailistProfileRequestError && error.status === 401
}

/**
 * Shared, deduplicated access to the signed-in nailist's own profile.
 *
 * Callers that render under the same QueryClient share one in-flight request and
 * one cache entry, so the dashboard layout and whichever dashboard page is open
 * no longer issue the same request twice per navigation.
 */
export function useNailistProfile<T = NailistProfile>(options?: { enabled?: boolean }) {
  return useQuery<T | null, NailistProfileRequestError>({
    queryKey: NAILIST_PROFILE_QUERY_KEY,
    enabled: options?.enabled ?? true,
    staleTime: PROFILE_STALE_TIME,
    // A 401 means the session is gone; retrying it three times (the library
    // default) would multiply exactly the traffic this hook exists to remove.
    retry: false,
    queryFn: async () => {
      const res = await fetch('/api/me/nailist-profile')
      if (!res.ok) throw new NailistProfileRequestError(res.status)
      const { data } = await res.json()
      return (data ?? null) as T | null
    },
  })
}

/**
 * Applies a just-saved change to the cached profile so every consumer reflects it
 * immediately, with no extra round trip.
 */
export function usePatchNailistProfileCache() {
  const queryClient = useQueryClient()
  return useCallback(
    (patch: Partial<NailistProfile>) => {
      queryClient.setQueryData<NailistProfile | null>(NAILIST_PROFILE_QUERY_KEY, (current) =>
        current ? { ...current, ...patch } : current
      )
    },
    [queryClient]
  )
}

/** Drops the cached profile so the next read reflects a just-saved change. */
export function useInvalidateNailistProfile() {
  const queryClient = useQueryClient()
  return useCallback(
    () => queryClient.invalidateQueries({ queryKey: NAILIST_PROFILE_QUERY_KEY }),
    [queryClient]
  )
}
