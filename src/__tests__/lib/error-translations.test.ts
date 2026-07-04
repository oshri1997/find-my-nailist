import { translateBookingError } from '@/components/booking/BookingModal'
import { translateReviewError } from '@/components/reviews/ReviewModal'

describe('translateBookingError', () => {
  it('translates known English API errors to Hebrew', () => {
    expect(translateBookingError('Service not found')).toBe('השירות המבוקש לא נמצא או שהוסר')
    expect(translateBookingError('Forbidden')).toBe('אין הרשאה לבצע פעולה זו')
    expect(translateBookingError('Unauthorized')).toBe('יש להתחבר מחדש כדי להזמין תור')
  })

  it('passes through an already-Hebrew message unchanged', () => {
    expect(translateBookingError('יש לאמת את כתובת המייל לפני קביעת תור')).toBe(
      'יש לאמת את כתובת המייל לפני קביעת תור'
    )
  })

  it('falls back to a generic Hebrew message for a non-string error (e.g. a zod issues array)', () => {
    expect(translateBookingError([{ message: 'Invalid' }])).toBe('שגיאה בהזמנה, נסי שוב')
    expect(translateBookingError(undefined)).toBe('שגיאה בהזמנה, נסי שוב')
  })
})

describe('translateReviewError', () => {
  it('translates known English API errors to Hebrew', () => {
    expect(translateReviewError('Forbidden')).toBe('אין הרשאה לבצע פעולה זו')
    expect(translateReviewError('Invalid or incomplete appointment')).toBe('לא ניתן לשלוח ביקורת עבור תור זה')
    expect(translateReviewError('Review already submitted for this appointment')).toBe('כבר שלחת ביקורת לתור הזה')
  })

  it('falls back to a generic Hebrew message for a non-string error', () => {
    expect(translateReviewError([{ message: 'Invalid' }])).toBe('שגיאה בשליחת הביקורת')
  })
})
