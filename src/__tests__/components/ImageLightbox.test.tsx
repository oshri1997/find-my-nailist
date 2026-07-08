/**
 * Facebook-style photo viewer: click a thumbnail to open it full-size,
 * click the backdrop, the X button, or press Escape to close.
 */
import { render, screen, fireEvent } from '@testing-library/react'
import { ImageLightbox } from '@/components/ui/image-lightbox'

describe('ImageLightbox', () => {
  it('renders the full-size image', () => {
    render(<ImageLightbox src="https://example.com/big.jpg" alt="תמונה" onClose={jest.fn()} />)
    const img = screen.getByAltText('תמונה') as HTMLImageElement
    expect(img.src).toBe('https://example.com/big.jpg')
  })

  it('calls onClose when the backdrop is clicked', () => {
    const onClose = jest.fn()
    render(<ImageLightbox src="https://example.com/big.jpg" onClose={onClose} />)
    fireEvent.click(screen.getByLabelText('סגירה').parentElement!)
    expect(onClose).toHaveBeenCalled()
  })

  it('calls onClose when the X button is clicked', () => {
    const onClose = jest.fn()
    render(<ImageLightbox src="https://example.com/big.jpg" onClose={onClose} />)
    fireEvent.click(screen.getByLabelText('סגירה'))
    expect(onClose).toHaveBeenCalled()
  })

  it('does not call onClose when the image itself is clicked (stopPropagation)', () => {
    const onClose = jest.fn()
    render(<ImageLightbox src="https://example.com/big.jpg" alt="תמונה" onClose={onClose} />)
    fireEvent.click(screen.getByAltText('תמונה'))
    expect(onClose).not.toHaveBeenCalled()
  })

  it('calls onClose when Escape is pressed', () => {
    const onClose = jest.fn()
    render(<ImageLightbox src="https://example.com/big.jpg" onClose={onClose} />)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalled()
  })
})
