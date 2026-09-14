import { fireEvent, render, screen } from '@testing-library/react'
import EmailRecoveryDemoPage from '@/app/demo/email-recovery/page'

describe('EmailRecoveryDemoPage', () => {
  it('suggests a common-domain correction, then models verification of the corrected address', () => {
    render(<EmailRecoveryDemoPage />)

    expect(screen.getByText(/האם התכוונת/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'השתמשי ב־gmail.com' }))
    expect(screen.getByLabelText('כתובת מייל')).toHaveValue('noa@gmail.com')

    fireEvent.click(screen.getByRole('button', { name: 'שלחי קישור אימות' }))
    expect(screen.getByText('הקישור בדרך')).toBeInTheDocument()
    expect(screen.getByText(/הפרופיל לא מופיע בחיפוש/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'הדמי לחיצה על קישור האימות' }))
    expect(screen.getByText('הכתובת אומתה')).toBeInTheDocument()
    expect(screen.getByText('✓ הפרופיל יכול להופיע בחיפוש')).toBeInTheDocument()
  })

  it('models a bounce as a prompt to replace the address rather than resend to it', () => {
    render(<EmailRecoveryDemoPage />)

    fireEvent.click(screen.getByRole('button', { name: 'הדגימי מצב שבו ההודעה חזרה' }))
    expect(screen.getByText('לא הצלחנו למסור את המייל')).toBeInTheDocument()
    expect(screen.getByText('לא שולחים שוב אל הכתובת שחזרה.')).toBeInTheDocument()
  })
})
