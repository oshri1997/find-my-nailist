import { evaluateVerificationReadiness } from '@/lib/verification-readiness'

const complete = {
  emailVerified: true, onboardingCompleted: true, businessName: 'Studio', city: 'Tel Aviv', address: '1 Main St',
  phoneNumber: '0501234567', photoUrl: 'https://example.com/photo.jpg', instagramUrl: 'https://instagram.com/studio',
  activeServiceCount: 1, activeWorkingHoursCount: 1, portfolioPhotoCount: 5,
}

describe('evaluateVerificationReadiness', () => {
  it('reports ready only when every factual criterion passes', () => {
    expect(evaluateVerificationReadiness(complete)).toMatchObject({ passedCount: 10, totalCount: 10, isReady: true })
  })

  it('reports each missing requirement and accepts allowed alternatives', () => {
    const result = evaluateVerificationReadiness({
      ...complete, emailVerified: false, businessName: ' ', city: '', address: '', phoneNumber: '', photoUrl: '',
      instagramUrl: '', activeServiceCount: 0, activeWorkingHoursCount: 0, portfolioPhotoCount: 4,
      whatsappPhone: '0509999999', coverPhotoUrl: 'https://example.com/cover.jpg', tiktokUrl: 'https://tiktok.com/@studio',
    })

    expect(result).toMatchObject({ passedCount: 4, totalCount: 10, isReady: false })
    expect(result.checks.filter((check) => !check.passed).map((check) => check.missing)).toEqual([
      'אימות כתובת אימייל', 'שם עסק', 'עיר וכתובת עסק', 'לפחות שירות פעיל אחד', 'לפחות שעת עבודה פעילה אחת', 'הוסיפי עוד 1 תמונה לתיק העבודות',
    ])
  })

  it('states exact remaining portfolio photo count', () => {
    const result = evaluateVerificationReadiness({ ...complete, portfolioPhotoCount: 3 })

    expect(result.checks.find((check) => check.key === 'portfolio')).toMatchObject({
      passed: false,
      missing: 'הוסיפי עוד 2 תמונות לתיק העבודות',
    })
  })
})
