import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FeedbackLauncher } from '@/components/feedback/FeedbackLauncher'
import { uploadFeedbackScreenshot } from '@/lib/firebase/storage'
import { validateFeedbackScreenshot } from '@/lib/feedback-screenshot'

jest.mock('next/navigation', () => ({
  usePathname: () => '/my-appointments',
}))

jest.mock('@/lib/firebase/storage', () => ({
  uploadFeedbackScreenshot: jest.fn(),
}))

jest.mock('@/lib/feedback-screenshot', () => ({
  validateFeedbackScreenshot: jest.fn(() => null),
}))

jest.mock('@/components/auth/auth-provider', () => ({
  useAuth: () => ({ user: { uid: 'user-123' } }),
}))

describe('FeedbackLauncher', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    window.history.replaceState({}, '', '/my-appointments?from=test')
    global.fetch = jest.fn()
  })

  it('opens an accessible studio-note form and adapts its guidance for a bug report', async () => {
    const user = userEvent.setup()
    render(<FeedbackLauncher />)

    await user.click(screen.getByRole('button', { name: 'עזרה ומשוב' }))

    expect(screen.getByRole('dialog', { name: 'מה תרצי לשתף?' })).toBeInTheDocument()
    expect(screen.getByPlaceholderText('מה ניסית לעשות, מה קרה בפועל ומה ציפית שיקרה?')).toBeInTheDocument()
    expect(screen.getAllByRole('radio')).toHaveLength(4)

    await user.click(screen.getByRole('radio', { name: /רעיון/ }))
    expect(screen.getByPlaceholderText('כמה שיותר הקשר יעזור לנו להבין ולטפל מהר.')).toBeInTheDocument()
    expect(screen.queryByPlaceholderText('מה ניסית לעשות, מה קרה בפועל ומה ציפית שיקרה?')).not.toBeInTheDocument()
  })

  it('keeps the feedback form inside the viewport with a dedicated scroll area', async () => {
    const user = userEvent.setup()
    render(<FeedbackLauncher />)

    await user.click(screen.getByRole('button', { name: 'עזרה ומשוב' }))

    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveStyle({ maxHeight: 'calc(100dvh - 1.5rem)' })
    expect(screen.getByTestId('feedback-form-scroll')).toHaveClass('overflow-y-auto')
  })

  it('posts a compact relative page context and confirms with the reference id', async () => {
    const user = userEvent.setup()
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ data: { id: 'feedback-123' } }),
    })
    render(<FeedbackLauncher />)

    await user.click(screen.getByRole('button', { name: 'עזרה ומשוב' }))
    fireEvent.change(screen.getByLabelText('כותרת קצרה'), { target: { value: 'בחירת שעה לא נשמרת' } })
    fireEvent.change(screen.getByLabelText('פרטים'), { target: { value: 'בחרתי שעה, עברתי לשלב הבא והיא נעלמה.' } })
    await user.click(screen.getByRole('button', { name: 'שלחי פנייה' }))

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1))
    expect(global.fetch).toHaveBeenCalledWith('/api/feedback', expect.objectContaining({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }))
    const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body)
    expect(body).toEqual(expect.objectContaining({
      type: 'BUG',
      pageUrl: '/my-appointments?from=test',
      subject: 'בחירת שעה לא נשמרת',
      description: 'בחרתי שעה, עברתי לשלב הבא והיא נעלמה.',
      userAgent: expect.any(String),
    }))
    expect(await screen.findByText('קיבלנו את הפנייה')).toBeInTheDocument()
    expect(screen.getByLabelText('מספר פנייה feedback-123')).toBeInTheDocument()
  })

  it('keeps the report intact and gives a clear retry message when the API rejects it', async () => {
    const user = userEvent.setup()
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 429,
      json: async () => ({ error: 'אפשר לשלוח עד 5 פניות ב־24 שעות. נסי שוב מאוחר יותר.' }),
    })
    render(<FeedbackLauncher />)

    await user.click(screen.getByRole('button', { name: 'עזרה ומשוב' }))
    fireEvent.change(screen.getByLabelText('כותרת קצרה'), { target: { value: 'רעיון קטן' } })
    fireEvent.change(screen.getByLabelText('פרטים'), { target: { value: 'אשמח לקיצור דרך.' } })
    await user.click(screen.getByRole('button', { name: 'שלחי פנייה' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('אפשר לשלוח עד 5 פניות ב־24 שעות')
    expect(screen.getByDisplayValue('רעיון קטן')).toBeInTheDocument()
    expect(screen.getByDisplayValue('אשמח לקיצור דרך.')).toBeInTheDocument()
  })

  it('closes with Escape and restores focus to the launcher', async () => {
    const user = userEvent.setup()
    const onClose = jest.fn()
    render(<FeedbackLauncher onClose={onClose} />)
    const launcher = screen.getByRole('button', { name: 'עזרה ומשוב' })

    await user.click(launcher)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    fireEvent.keyDown(document, { key: 'Escape' })

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(launcher).toHaveFocus()
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('uses a clean, undecorated close icon in the feedback header', async () => {
    const user = userEvent.setup()
    render(<FeedbackLauncher />)

    await user.click(screen.getByRole('button', { name: 'עזרה ומשוב' }))
    const closeButton = document.querySelector('[data-feedback-close]')
    expect(closeButton).toBeInTheDocument()
    expect(closeButton).not.toHaveClass('rounded-xl')
    expect(closeButton).not.toHaveClass('p-2')
  })

  it('uploads one validated screenshot before creating the report and links to history on success', async () => {
    const user = userEvent.setup()
    ;(validateFeedbackScreenshot as jest.Mock).mockReturnValue(null)
    ;(uploadFeedbackScreenshot as jest.Mock).mockResolvedValue({ storageKey: 'feedback/user-123/12345678-1234-1234-1234-123456789012.png' })
    ;(global.fetch as jest.Mock).mockResolvedValue({ ok: true, status: 201, json: async () => ({ data: { id: 'feedback-image' } }) })
    render(<FeedbackLauncher />)
    await user.click(screen.getByRole('button', { name: 'עזרה ומשוב' }))
    fireEvent.change(screen.getByLabelText('כותרת קצרה'), { target: { value: 'צילום תקלה' } })
    fireEvent.change(screen.getByLabelText('פרטים'), { target: { value: 'זה קורה במסך הבחירה.' } })
    const file = new File(['image'], 'bug.png', { type: 'image/png' })
    await user.upload(screen.getByLabelText(/צילום מסך/), file)
    await user.click(screen.getByRole('button', { name: 'שלחי פנייה' }))
    await waitFor(() => expect(uploadFeedbackScreenshot).toHaveBeenCalledWith('user-123', file, expect.any(Function)))
    const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body)
    expect(body.screenshotStorageKey).toMatch(/^feedback\/user-123\//)
    expect(await screen.findByRole('link', { name: 'הפניות שלי' })).toHaveAttribute('href', '/my-feedback')
  })
})
