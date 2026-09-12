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

  it('shows navigation only when both gallery callbacks exist, and disables endpoint controls', () => {
    const onPrevious = jest.fn()
    const onNext = jest.fn()
    const { rerender } = render(
      <ImageLightbox
        src="https://example.com/first.jpg"
        onClose={jest.fn()}
        onPrevious={onPrevious}
        onNext={onNext}
        canGoPrevious={false}
        canGoNext
      />
    )

    expect(screen.getByLabelText('תמונה קודמת')).toBeDisabled()
    fireEvent.click(screen.getByLabelText('תמונה הבאה'))
    fireEvent.keyDown(document, { key: 'ArrowRight' })
    expect(onNext).toHaveBeenCalledTimes(2)
    expect(onPrevious).not.toHaveBeenCalled()

    rerender(<ImageLightbox src="https://example.com/only.jpg" onClose={jest.fn()} />)
    expect(screen.queryByLabelText('תמונה קודמת')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('תמונה הבאה')).not.toBeInTheDocument()
  })

  it('shows noninteractive mobile pagination dots with the current photo active', () => {
    render(
      <ImageLightbox
        src="https://example.com/second.jpg"
        onClose={jest.fn()}
        onPrevious={jest.fn()}
        onNext={jest.fn()}
        currentIndex={1}
        totalImages={3}
      />
    )

    const pagination = screen.getByTestId('lightbox-pagination')
    expect(pagination).toHaveClass('md:hidden')
    expect(pagination.querySelectorAll('button')).toHaveLength(0)
    expect(screen.getByTestId('lightbox-dot-1')).toHaveClass('bg-white')
    expect(screen.getByTestId('lightbox-dot-0')).toHaveClass('bg-white/55')
    expect(screen.getByLabelText('תמונה קודמת')).toHaveClass('hidden', 'md:flex')
  })

  it('swipes left for next and right for previous, but ignores short and vertical gestures', () => {
    const onPrevious = jest.fn()
    const onNext = jest.fn()
    render(
      <ImageLightbox
        src="https://example.com/photo.jpg"
        alt="תמונת החלקה"
        onClose={jest.fn()}
        onPrevious={onPrevious}
        onNext={onNext}
        canGoPrevious
        canGoNext
      />
    )
    const image = screen.getByAltText('תמונת החלקה')

    fireEvent.touchStart(image, { touches: [{ clientX: 200, clientY: 100 }] })
    fireEvent.touchEnd(image, { changedTouches: [{ clientX: 120, clientY: 104 }] })
    fireEvent.touchStart(image, { touches: [{ clientX: 120, clientY: 100 }] })
    fireEvent.touchEnd(image, { changedTouches: [{ clientX: 200, clientY: 104 }] })
    expect(onNext).toHaveBeenCalledTimes(1)
    expect(onPrevious).toHaveBeenCalledTimes(1)

    fireEvent.touchStart(image, { touches: [{ clientX: 200, clientY: 100 }] })
    fireEvent.touchEnd(image, { changedTouches: [{ clientX: 160, clientY: 100 }] })
    fireEvent.touchStart(image, { touches: [{ clientX: 200, clientY: 100 }] })
    fireEvent.touchEnd(image, { changedTouches: [{ clientX: 190, clientY: 220 }] })
    expect(onNext).toHaveBeenCalledTimes(1)
    expect(onPrevious).toHaveBeenCalledTimes(1)
  })

  it('does not navigate past an endpoint when swiped', () => {
    const onPrevious = jest.fn()
    const onNext = jest.fn()
    render(
      <ImageLightbox
        src="https://example.com/first.jpg"
        alt="תמונה ראשונה"
        onClose={jest.fn()}
        onPrevious={onPrevious}
        onNext={onNext}
        canGoPrevious={false}
        canGoNext
      />
    )
    const image = screen.getByAltText('תמונה ראשונה')

    fireEvent.touchStart(image, { touches: [{ clientX: 100, clientY: 100 }] })
    fireEvent.touchEnd(image, { changedTouches: [{ clientX: 180, clientY: 100 }] })
    fireEvent.touchStart(image, { touches: [{ clientX: 180, clientY: 100 }] })
    fireEvent.touchEnd(image, { changedTouches: [{ clientX: 100, clientY: 100 }] })
    expect(onPrevious).not.toHaveBeenCalled()
    expect(onNext).toHaveBeenCalledTimes(1)
  })
})
