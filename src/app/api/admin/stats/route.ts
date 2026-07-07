import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase/admin'
import { COLLECTIONS } from '@/lib/firebase/collections'
import { verifyAdmin, adminUnauthorized } from '@/lib/admin-auth'
import { israelWallClockToUtc, todayInIsrael } from '@/lib/booking-utils'

export async function GET(request: NextRequest) {
  if (!await verifyAdmin(request)) return adminUnauthorized()

  const db = adminDb()

  const [usersSnap, nailistsSnap, appointmentsSnap, reviewsSnap] = await Promise.all([
    db.collection(COLLECTIONS.USERS).get(),
    db.collection(COLLECTIONS.NAILIST_PROFILES).get(),
    db.collection(COLLECTIONS.APPOINTMENTS).get(),
    db.collection(COLLECTIONS.REVIEWS).get(),
  ])

  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  const appointmentsByStatus: Record<string, number> = {
    PENDING: 0, CONFIRMED: 0, COMPLETED: 0, CANCELLED: 0, NO_SHOW: 0,
  }
  appointmentsSnap.docs.forEach(d => {
    const s = d.data().status as string
    if (s in appointmentsByStatus) appointmentsByStatus[s]++
  })

  const newUsersThisWeek = usersSnap.docs.filter(d => {
    const created = d.data().createdAt?.toDate?.()
    return created && created >= weekAgo
  }).length

  const totalNailistUsers = usersSnap.docs.filter(d => d.data().role === 'NAILIST').length
  const totalClientUsers = usersSnap.docs.filter(d => d.data().role === 'CLIENT').length
  const activeNailists = nailistsSnap.docs.filter(d => d.data().isActive === true).length

  let totalRevenue = 0
  appointmentsSnap.docs.forEach(d => {
    const data = d.data()
    if (data.status === 'COMPLETED' && data.price) totalRevenue += data.price
  })

  const totalRating = reviewsSnap.docs.reduce((sum, d) => sum + (d.data().rating ?? 0), 0)
  const avgRating = reviewsSnap.size > 0 ? totalRating / reviewsSnap.size : 0

  // "What happened today" — reuses the snapshots already fetched above, no
  // extra Firestore reads. Bookings/cancellations count by when the action
  // happened today (createdAt/updatedAt), not by the appointment's own
  // scheduled time.
  const startOfTodayIsrael = israelWallClockToUtc(todayInIsrael(), '00:00')
  const newUsersToday = usersSnap.docs.filter(d => {
    const created = d.data().createdAt?.toDate?.()
    return created && created >= startOfTodayIsrael
  }).length
  const newAppointmentsToday = appointmentsSnap.docs.filter(d => {
    const created = d.data().createdAt?.toDate?.()
    return created && created >= startOfTodayIsrael
  }).length
  const cancelledAppointmentsToday = appointmentsSnap.docs.filter(d => {
    const data = d.data()
    if (data.status !== 'CANCELLED') return false
    const updated = data.updatedAt?.toDate?.()
    return updated && updated >= startOfTodayIsrael
  }).length
  const newReviewsToday = reviewsSnap.docs.filter(d => {
    const created = d.data().createdAt?.toDate?.()
    return created && created >= startOfTodayIsrael
  }).length

  return NextResponse.json({
    data: {
      totalUsers: usersSnap.size,
      totalNailists: totalNailistUsers,
      totalNailistProfiles: nailistsSnap.size,
      totalClients: totalClientUsers,
      activeNailists,
      totalAppointments: appointmentsSnap.size,
      appointmentsByStatus,
      totalReviews: reviewsSnap.size,
      avgRating: Math.round(avgRating * 10) / 10,
      newUsersThisWeek,
      totalRevenue,
      today: {
        newUsers: newUsersToday,
        newAppointments: newAppointmentsToday,
        cancelledAppointments: cancelledAppointmentsToday,
        newReviews: newReviewsToday,
      },
    },
  })
}
