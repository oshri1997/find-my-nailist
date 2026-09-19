import { render, waitFor } from '@testing-library/react'
import { ProductTour } from '@/components/onboarding/product-tour'
import { driver } from 'driver.js'

let mockPathname = '/search'
const mockUseAuth = jest.fn()
const mockDrive = jest.fn()
const mockDestroy = jest.fn()

jest.mock('next/navigation', () => ({ usePathname: () => mockPathname }))
jest.mock('driver.js', () => ({ driver: jest.fn() }))
jest.mock('@/components/auth/auth-provider', () => ({ useAuth: () => mockUseAuth() }))

const mockDriver = driver as jest.Mock
type TourConfig = { steps: Array<{ popover?: { title?: string } }>; onDestroyed: () => void }

const baseAuth = {
  user: { uid: 'user-1' },
  role: 'CLIENT',
  loading: false,
  onboardingCompleted: true,
  verificationReminderActive: false,
  setProductTourActive: jest.fn(),
}

beforeEach(() => {
  jest.clearAllMocks()
  mockDriver.mockReturnValue({ drive: mockDrive, destroy: mockDestroy })
  window.localStorage.clear()
  mockPathname = '/search'
  mockUseAuth.mockReturnValue(baseAuth)
})

describe('ProductTour', () => {
  it('starts a short client guide after completed onboarding and marks it complete when closed', async () => {
    render(<ProductTour />)

    await waitFor(() => expect(mockDriver).toHaveBeenCalledTimes(1))
    expect(mockDrive).toHaveBeenCalledTimes(1)

    const config = (mockDriver.mock.calls as unknown as Array<[TourConfig]>)[0][0]
    expect(config.steps).toHaveLength(3)
    expect(config.steps[0].popover?.title).toBe('כך קובעות תור')

    config.onDestroyed()
    expect(window.localStorage.getItem('nailistiot:product-tour:v1:user-1')).toBe('completed')
    expect(baseAuth.setProductTourActive).toHaveBeenLastCalledWith(false)
  })

  it('does not interrupt a user who already completed the guide', async () => {
    window.localStorage.setItem('nailistiot:product-tour:v1:user-1', 'completed')
    render(<ProductTour />)

    await new Promise(resolve => setTimeout(resolve, 500))
    expect(mockDriver).not.toHaveBeenCalled()
  })

  it('uses the nailist explanation on the dashboard', async () => {
    mockPathname = '/dashboard/nailist'
    mockUseAuth.mockReturnValue({ ...baseAuth, role: 'NAILIST' })
    render(<ProductTour />)

    await waitFor(() => expect(mockDriver).toHaveBeenCalledTimes(1))
    const config = (mockDriver.mock.calls as unknown as Array<[TourConfig]>)[0][0]
    expect(config.steps[1].popover?.title).toBe('כאן מופיעות בקשות ותורים')
  })
})
