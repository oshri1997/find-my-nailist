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
    // Scroll-linked/spring/tilt hooks — no real scrolling or pointer physics
    // happens in jsdom, so these resolve to inert motion-value-shaped stubs.
    useScroll: () => ({ scrollYProgress: { get: () => 0, set: jest.fn(), on: jest.fn() } }),
    useTransform: () => ({ get: () => 0, set: jest.fn() }),
    useSpring: (v: unknown) => v,
    useReducedMotion: () => false,
  }
})
