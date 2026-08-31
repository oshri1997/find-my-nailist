jest.mock('@/lib/firebase/client', () => ({ initFirebase: jest.fn() }))

import { validateFeedbackScreenshot } from '@/lib/firebase/storage'

describe('validateFeedbackScreenshot', () => {
  it('allows only bounded PNG/JPEG/WebP files', () => {
    expect(validateFeedbackScreenshot(new File(['x'], 'a.png', { type: 'image/png' }))).toBeNull()
    expect(validateFeedbackScreenshot(new File(['x'], 'a.gif', { type: 'image/gif' }))).toMatch(/PNG/)
    expect(validateFeedbackScreenshot(new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'a.png', { type: 'image/png' }))).toMatch(/5MB/)
  })
})
