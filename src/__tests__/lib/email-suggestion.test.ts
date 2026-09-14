import { suggestEmailCorrection } from '@/lib/email-suggestion'

describe('suggestEmailCorrection', () => {
  it('suggests a correction for a common domain typo', () => {
    expect(suggestEmailCorrection('noa@gmail.cim')).toBe('noa@gmail.com')
    expect(suggestEmailCorrection('noa@walla.coq')).toBe('noa@walla.com')
  })

  it('does not alter an exact or unknown domain', () => {
    expect(suggestEmailCorrection('noa@walla.co.il')).toBeNull()
    expect(suggestEmailCorrection('noa@my-studio.example')).toBeNull()
  })
})
