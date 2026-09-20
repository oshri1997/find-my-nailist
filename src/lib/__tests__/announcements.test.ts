import { announcementAudienceForRole, serializeAnnouncement } from '@/lib/announcements'

describe('announcementAudienceForRole', () => {
  it('maps NAILIST and CLIENT to themselves', () => {
    expect(announcementAudienceForRole('NAILIST')).toBe('NAILIST')
    expect(announcementAudienceForRole('CLIENT')).toBe('CLIENT')
  })

  it('never returns an audience for an admin or missing role — admins publish, they never consume', () => {
    expect(announcementAudienceForRole('ADMIN')).toBeNull()
    expect(announcementAudienceForRole(null)).toBeNull()
    expect(announcementAudienceForRole(undefined)).toBeNull()
  })
})

describe('serializeAnnouncement', () => {
  it('converts Firestore Timestamps to ISO strings and defaults missing text fields', () => {
    const fakeTimestamp = (date: string) => ({ toDate: () => new Date(date) })
    const result = serializeAnnouncement('ann-1', {
      title: 'שעות עבודה מפוצלות',
      body: 'אפשר להגדיר כמה חלונות זמינות ביום',
      audience: 'ALL',
      priority: 'MAJOR',
      status: 'PUBLISHED',
      publishedAt: fakeTimestamp('2026-09-18T10:00:00.000Z'),
      createdBy: 'admin-uid',
      createdAt: fakeTimestamp('2026-09-18T09:00:00.000Z'),
      updatedAt: fakeTimestamp('2026-09-18T09:00:00.000Z'),
    })

    expect(result).toEqual({
      id: 'ann-1',
      title: 'שעות עבודה מפוצלות',
      body: 'אפשר להגדיר כמה חלונות זמינות ביום',
      audience: 'ALL',
      priority: 'MAJOR',
      status: 'PUBLISHED',
      publishedAt: '2026-09-18T10:00:00.000Z',
      createdBy: 'admin-uid',
      createdAt: '2026-09-18T09:00:00.000Z',
      updatedAt: '2026-09-18T09:00:00.000Z',
    })
  })

  it('falls back to empty strings for a malformed document rather than throwing', () => {
    const result = serializeAnnouncement('ann-2', {})
    expect(result.title).toBe('')
    expect(result.body).toBe('')
    expect(result.createdBy).toBe('')
    expect(result.publishedAt).toBe('')
  })

  it('passes a well-formed rich body doc through unchanged', () => {
    const richBody = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'תוכן עשיר' }] }] }
    const result = serializeAnnouncement('ann-3', { title: 'כותרת', body: richBody })
    expect(result.body).toEqual(richBody)
  })

  it('falls back to an empty string for a malformed rich body rather than trusting untyped Firestore data', () => {
    const result = serializeAnnouncement('ann-4', { title: 'כותרת', body: { type: 'not-a-doc' } })
    expect(result.body).toBe('')
  })
})
