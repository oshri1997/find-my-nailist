import { render, waitFor, act } from '@testing-library/react'
import { ProductTour } from '@/components/onboarding/product-tour'
import { driver } from 'driver.js'
import type { Config, PopoverDOM } from 'driver.js'

let mockPathname = '/search'
const mockUseAuth = jest.fn()
const mockDrive = jest.fn()
const mockDestroy = jest.fn()
const mockRefresh = jest.fn()
const mockMoveNext = jest.fn()
const mockMovePrevious = jest.fn()
const mockSetSteps = jest.fn()
let active = true

jest.mock('next/navigation', () => ({ usePathname: () => mockPathname }))
jest.mock('driver.js', () => ({ driver: jest.fn() }))
jest.mock('@/components/auth/auth-provider', () => ({ useAuth: () => mockUseAuth() }))

const mockDriver = driver as jest.Mock

const setProductTourActive = jest.fn()
const baseAuth = {
  user: { uid: 'user-1' },
  role: 'CLIENT',
  loading: false,
  onboardingCompleted: true,
  verificationReminderActive: false,
  setProductTourActive,
}

function lastConfig(): Config {
  const calls = mockDriver.mock.calls as unknown as Array<[Config]>
  return calls[calls.length - 1][0]
}

/** A stand-in for the popover DOM driver.js builds and hands to onPopoverRender. */
function fakePopover(): PopoverDOM {
  const wrapper = document.createElement('div')
  const progress = document.createElement('span')
  const footer = document.createElement('div')
  footer.appendChild(progress)
  wrapper.appendChild(footer)
  return {
    wrapper,
    footer,
    progress,
    arrow: document.createElement('div'),
    title: document.createElement('div'),
    description: document.createElement('div'),
    previousButton: document.createElement('button'),
    nextButton: document.createElement('button'),
    closeButton: document.createElement('button'),
    footerButtons: document.createElement('div'),
  }
}

beforeEach(() => {
  jest.clearAllMocks()
  active = true
  mockDriver.mockReturnValue({
    drive: mockDrive,
    destroy: mockDestroy,
    refresh: mockRefresh,
    moveNext: mockMoveNext,
    movePrevious: mockMovePrevious,
    setSteps: mockSetSteps,
    isActive: () => active,
    getActiveIndex: () => 1,
  })
  window.localStorage.clear()
  mockPathname = '/search'
  mockUseAuth.mockReturnValue(baseAuth)
})

describe('ProductTour', () => {
  it('starts the client guide after completed onboarding, on its own route', async () => {
    render(<ProductTour />)

    await waitFor(() => expect(mockDriver).toHaveBeenCalledTimes(1))
    expect(mockDrive).toHaveBeenCalledTimes(1)
    expect(setProductTourActive).toHaveBeenCalledWith(true)

    const config = lastConfig()
    expect(config.steps).toHaveLength(4)
    expect(config.steps?.[0].popover?.title).toBe('איך זה עובד?')
    expect(config.steps?.[3].element).toBe('[data-tour="client-appointments"]')
  })

  it('does not interrupt a user who already completed the guide', async () => {
    window.localStorage.setItem('nailistiot:product-tour:v3:user-1', 'completed')
    render(<ProductTour />)

    await new Promise(resolve => setTimeout(resolve, 700))
    expect(mockDriver).not.toHaveBeenCalled()
  })

  it('uses the nailist explanation on the dashboard', async () => {
    mockPathname = '/dashboard/nailist'
    mockUseAuth.mockReturnValue({ ...baseAuth, role: 'NAILIST' })
    render(<ProductTour />)

    await waitFor(() => expect(mockDriver).toHaveBeenCalledTimes(1))
    const config = lastConfig()
    expect(config.steps).toHaveLength(8)
    expect(config.steps?.[2].popover?.title).toBe('ניהול התורים שלך')
  })

  it('never leaves a step pointing at an anchor that has not rendered', async () => {
    render(<ProductTour />)
    await waitFor(() => expect(mockDriver).toHaveBeenCalledTimes(1))

    const config = lastConfig()
    expect(config.skipMissingElement).toBe(true)
    expect(config.waitForElement).toBeGreaterThan(0)
  })

  it('treats a stray click on the backdrop as "next", not as ending the guide', async () => {
    render(<ProductTour />)
    await waitFor(() => expect(mockDriver).toHaveBeenCalledTimes(1))

    const config = lastConfig()
    expect(config.overlayClickBehavior).toBe('nextStep')
    // The highlighted anchors are navigation links; a click would leave the page.
    expect(config.disableActiveInteraction).toBe(true)
  })

  it('does not count a route change mid-tour as having seen the guide', async () => {
    render(<ProductTour />)
    await waitFor(() => expect(mockDriver).toHaveBeenCalledTimes(1))

    // React unmounting the component also destroys the driver — that is not
    // the user saying "I have seen this".
    lastConfig().onDestroyed?.(undefined, {}, {} as never)

    expect(window.localStorage.getItem('nailistiot:product-tour:v3:user-1')).toBeNull()
    expect(setProductTourActive).toHaveBeenLastCalledWith(false)
  })

  it('remembers the guide once the user finishes or dismisses it', async () => {
    render(<ProductTour />)
    await waitFor(() => expect(mockDriver).toHaveBeenCalledTimes(1))
    const config = lastConfig()

    config.onDestroyStarted?.(undefined, {}, {} as never)
    expect(mockDestroy).toHaveBeenCalled()

    config.onDestroyed?.(undefined, {}, {} as never)
    expect(window.localStorage.getItem('nailistiot:product-tour:v3:user-1')).toBe('completed')
  })

  it('adds a named skip control and dialog semantics to the popover', async () => {
    render(<ProductTour />)
    await waitFor(() => expect(mockDriver).toHaveBeenCalledTimes(1))

    const config = lastConfig()
    const popover = fakePopover()
    config.onPopoverRender?.(popover, { config, index: 0 } as never)

    expect(popover.wrapper).toHaveAttribute('dir', 'rtl')
    expect(popover.wrapper).toHaveAttribute('role', 'dialog')
    expect(popover.closeButton).toHaveAttribute('aria-label', 'סגירת הסיור')

    const skip = popover.footer.querySelector('.nailistiot-tour-skip') as HTMLButtonElement
    expect(skip).not.toBeNull()
    expect(skip.textContent).toBe('דילוג על הסיור')

    skip.click()
    expect(mockDestroy).toHaveBeenCalled()
  })

  it('drops the skip control on the last step, where "סיימתי" is the way out', async () => {
    render(<ProductTour />)
    await waitFor(() => expect(mockDriver).toHaveBeenCalledTimes(1))

    const config = lastConfig()
    const popover = fakePopover()
    config.onPopoverRender?.(popover, { config, index: (config.steps?.length ?? 1) - 1 } as never)

    expect(popover.footer.querySelector('.nailistiot-tour-skip')).toBeNull()
    expect(popover.wrapper).toHaveAttribute('role', 'dialog')
  })

  it('maps the arrow keys the way an RTL page reads them', async () => {
    render(<ProductTour />)
    await waitFor(() => expect(mockDriver).toHaveBeenCalledTimes(1))

    // driver.js binds ArrowRight to "next" on its own window listener. In a
    // right-to-left page forward is to the LEFT, and this must be the only
    // handler that acts on the key.
    const driverOwnHandler = jest.fn()
    window.addEventListener('keyup', driverOwnHandler)

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keyup', { key: 'ArrowLeft', bubbles: true, cancelable: true }))
    })
    expect(mockMoveNext).toHaveBeenCalledTimes(1)

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keyup', { key: 'ArrowRight', bubbles: true, cancelable: true }))
    })
    expect(mockMovePrevious).toHaveBeenCalledTimes(1)
    expect(driverOwnHandler).not.toHaveBeenCalled()

    window.removeEventListener('keyup', driverOwnHandler)
  })

  it('re-measures the spotlight when the viewport changes', async () => {
    render(<ProductTour />)
    await waitFor(() => expect(mockDriver).toHaveBeenCalledTimes(1))

    await act(async () => {
      window.dispatchEvent(new Event('resize'))
      await new Promise(resolve => requestAnimationFrame(() => resolve(null)))
    })

    expect(mockRefresh).toHaveBeenCalled()
  })
})
