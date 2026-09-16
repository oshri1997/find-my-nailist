import { render as rtlRender, type RenderOptions } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactElement, ReactNode } from 'react'

export * from '@testing-library/react'

/**
 * Drop-in replacement for Testing Library's `render` that supplies the
 * QueryClient the app's Providers give in production. A fresh client per render
 * keeps each test's cache isolated.
 */
export function render(ui: ReactElement, options?: Omit<RenderOptions, 'wrapper'>) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }

  return { queryClient, ...rtlRender(ui, { wrapper: Wrapper, ...options }) }
}
