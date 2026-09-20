import { announcementRichBodySchema } from '@/lib/announcement-body'
import type { Announcement, AnnouncementAudience, AnnouncementBody, AnnouncementPriority, AnnouncementStatus, UserRole } from '@/types'

// Only these two roles ever see announcements — an ADMIN account publishes
// them, it does not consume them, and a signed-in user with no role yet
// (mid sign-up) has nothing to match against.
export function announcementAudienceForRole(role: UserRole | null | undefined): AnnouncementAudience | null {
  if (role === 'NAILIST') return 'NAILIST'
  if (role === 'CLIENT') return 'CLIENT'
  return null
}

function toIso(value: unknown): string {
  if (value && typeof value === 'object' && 'toDate' in value && typeof (value as { toDate: unknown }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate().toISOString()
  }
  return ''
}

function toAnnouncementBody(value: unknown): AnnouncementBody {
  if (typeof value === 'string') return value
  const parsed = announcementRichBodySchema.safeParse(value)
  return parsed.success ? parsed.data : ''
}

export function serializeAnnouncement(id: string, data: Record<string, unknown>): Announcement {
  return {
    id,
    title: typeof data.title === 'string' ? data.title : '',
    body: toAnnouncementBody(data.body),
    audience: data.audience as AnnouncementAudience,
    priority: data.priority as AnnouncementPriority,
    status: data.status as AnnouncementStatus,
    publishedAt: toIso(data.publishedAt),
    createdBy: typeof data.createdBy === 'string' ? data.createdBy : '',
    createdAt: toIso(data.createdAt),
    updatedAt: toIso(data.updatedAt),
  }
}
