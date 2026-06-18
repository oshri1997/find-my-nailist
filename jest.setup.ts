import '@testing-library/jest-dom'

// framer-motion has no animations in test environment — render children directly
jest.mock('framer-motion', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require('react')
  const motion = new Proxy(
    {},
    {
      get: (_: unknown, tag: string) =>
        // eslint-disable-next-line react/display-name
        React.forwardRef(({ children, ...props }: Record<string, unknown>, ref: unknown) =>
          React.createElement(tag as string, { ...props, ref }, children)
        ),
    }
  )
  return {
    __esModule: true,
    motion,
    AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
    useAnimation: () => ({ start: jest.fn() }),
    useInView: () => true,
    useMotionValue: (v: unknown) => ({ get: () => v, set: jest.fn() }),
  }
})
