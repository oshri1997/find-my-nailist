import { render, screen } from '@testing-library/react'
import * as mockReact from 'react'
import { NailLoader } from '@/components/ui/nail-loader'

jest.mock('framer-motion', () => {
  const createMotionElement = (element: string) => {
    const MockMotionElement = (
      { animate, initial, transition, ...props }: { animate?: unknown; initial?: unknown; transition?: unknown },
    ) => {
      void animate
      void transition

      return mockReact.createElement(element, {
        ...props,
        'data-motion-initial': initial === undefined ? undefined : JSON.stringify(initial),
      })
    }

    MockMotionElement.displayName = `motion.${element}`
    return MockMotionElement
  }

  return {
    motion: {
      g: createMotionElement('g'),
      path: createMotionElement('path'),
      rect: createMotionElement('rect'),
    },
    useReducedMotion: () => false,
  }
})

describe('NailLoader', () => {
  it('renders the gel layer and brush as separate elements', () => {
    const { container } = render(<NailLoader text="מכינות לך את החוויה" />)

    expect(screen.getByText('מכינות לך את החוויה')).toBeInTheDocument()
    expect(container.querySelector('[data-testid="nail-polish-layer"]')).toBeInTheDocument()
    expect(container.querySelector('[data-testid="nail-polish-brush"]')).toBeInTheDocument()
  })

  it('gives the polish rect a concrete initial geometry', () => {
    const { container } = render(<NailLoader />)
    const polishRect = container.querySelector('[data-testid="nail-polish-layer"] rect')

    expect(polishRect).toHaveAttribute('y', '152')
    expect(polishRect).toHaveAttribute('height', '0')
    expect(polishRect).toHaveAttribute('data-motion-initial', JSON.stringify({ height: 0 }))
  })
})
