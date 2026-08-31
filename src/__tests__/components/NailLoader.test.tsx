import { render, screen } from '@testing-library/react'
import { NailLoader } from '@/components/ui/nail-loader'

describe('NailLoader', () => {
  it('renders the gel layer and brush as separate elements', () => {
    const { container } = render(<NailLoader text="מכינות לך את החוויה" />)

    expect(screen.getByText('מכינות לך את החוויה')).toBeInTheDocument()
    expect(container.querySelector('[data-testid="nail-polish-layer"]')).toBeInTheDocument()
    expect(container.querySelector('[data-testid="nail-polish-brush"]')).toBeInTheDocument()
  })
})
