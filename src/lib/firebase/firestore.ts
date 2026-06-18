import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
  type Firestore,
} from 'firebase/firestore'
import { distanceBetween, geohashQueryBounds, type Geopoint } from 'geofire-common'
import { db as _db } from './client'
import { COLLECTIONS } from './collections'
import type {
  UserDoc,
  NailistProfileDoc,
  ServiceDoc,
  AppointmentDoc,
  ReviewDoc,
  WorkingHoursDoc,
  PortfolioPhotoDoc,
  NailistProfile,
} from '@/types'

function requireDb(): Firestore {
  if (!_db) throw new Error('Firestore is not initialized. Check your Firebase env vars.')
  return _db
}

// ── Users ──────────────────────────────────────────────────────────────────

export async function getUser(uid: string) {
  const db = requireDb()
  const snap = await getDoc(doc(db, COLLECTIONS.USERS, uid))
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as UserDoc & { id: string }) : null
}

export async function upsertUser(uid: string, data: Partial<UserDoc>) {
  const db = requireDb()
  const ref = doc(db, COLLECTIONS.USERS, uid)
  const snap = await getDoc(ref)
  if (snap.exists()) {
    await updateDoc(ref, { ...data, updatedAt: serverTimestamp() })
  } else {
    await setDoc(ref, { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() })
  }
}

// ── Nailist Profiles ───────────────────────────────────────────────────────

export async function getNailistProfile(id: string) {
  const db = requireDb()
  const snap = await getDoc(doc(db, COLLECTIONS.NAILIST_PROFILES, id))
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as NailistProfileDoc & { id: string }) : null
}

export async function getNailistProfileByUserId(userId: string) {
  const db = requireDb()
  const q = query(
    collection(db, COLLECTIONS.NAILIST_PROFILES),
    where('userId', '==', userId),
    limit(1)
  )
  const snap = await getDocs(q)
  if (snap.empty) return null
  const d = snap.docs[0]
  return { id: d.id, ...d.data() } as NailistProfileDoc & { id: string }
}

export async function updateNailistProfile(id: string, data: Partial<NailistProfileDoc>) {
  const db = requireDb()
  await updateDoc(doc(db, COLLECTIONS.NAILIST_PROFILES, id), {
    ...data,
    updatedAt: serverTimestamp(),
  })
}

// Geolocation search using geohash
export async function searchNailistsByLocation(
  center: [number, number],
  radiusKm: number,
  pageSize = 12
): Promise<NailistProfile[]> {
  const db = requireDb()
  const geopoint: Geopoint = [center[0], center[1]]
  const bounds = geohashQueryBounds(geopoint, radiusKm * 1000)

  const snapshots = await Promise.all(
    bounds.map(([start, end]) =>
      getDocs(
        query(
          collection(db, COLLECTIONS.NAILIST_PROFILES),
          where('isActive', '==', true),
          where('geohash', '>=', start),
          where('geohash', '<=', end),
          orderBy('geohash'),
          limit(pageSize)
        )
      )
    )
  )

  const results: NailistProfile[] = []
  for (const snap of snapshots) {
    for (const d of snap.docs) {
      const data = d.data() as NailistProfileDoc
      if (data.latitude == null || data.longitude == null) continue
      const distanceKm = distanceBetween([data.latitude, data.longitude], geopoint) / 1000
      if (distanceKm <= radiusKm) {
        results.push({
          id: d.id,
          ...data,
          distanceKm,
          createdAt: (data.createdAt as Timestamp)?.toDate().toISOString() ?? '',
          updatedAt: (data.updatedAt as Timestamp)?.toDate().toISOString() ?? '',
        })
      }
    }
  }

  return results.sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0))
}

// ── Services ───────────────────────────────────────────────────────────────

export async function getServicesByNailist(nailistProfileId: string) {
  const db = requireDb()
  const q = query(
    collection(db, COLLECTIONS.SERVICES),
    where('nailistProfileId', '==', nailistProfileId),
    where('isActive', '==', true),
    orderBy('price')
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as ServiceDoc & { id: string }))
}

// ── Appointments ───────────────────────────────────────────────────────────

export async function getAppointmentsByNailist(nailistProfileId: string, statusFilter?: string[]) {
  const db = requireDb()
  let q = query(
    collection(db, COLLECTIONS.APPOINTMENTS),
    where('nailistProfileId', '==', nailistProfileId),
    orderBy('startTime', 'desc')
  )
  if (statusFilter?.length) {
    q = query(q, where('status', 'in', statusFilter))
  }
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as AppointmentDoc & { id: string }))
}

export async function getAppointmentsByClient(clientProfileId: string) {
  const db = requireDb()
  const q = query(
    collection(db, COLLECTIONS.APPOINTMENTS),
    where('clientProfileId', '==', clientProfileId),
    orderBy('startTime', 'desc')
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as AppointmentDoc & { id: string }))
}

// ── Reviews ────────────────────────────────────────────────────────────────

export async function getReviewsByNailist(nailistProfileId: string, pageSize = 10) {
  const db = requireDb()
  const q = query(
    collection(db, COLLECTIONS.REVIEWS),
    where('nailistProfileId', '==', nailistProfileId),
    orderBy('createdAt', 'desc'),
    limit(pageSize)
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as ReviewDoc & { id: string }))
}

// ── Working Hours ──────────────────────────────────────────────────────────

export async function getWorkingHours(nailistProfileId: string) {
  const db = requireDb()
  const q = query(
    collection(db, COLLECTIONS.WORKING_HOURS),
    where('nailistProfileId', '==', nailistProfileId),
    where('isActive', '==', true),
    orderBy('dayOfWeek')
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as WorkingHoursDoc & { id: string }))
}

// ── Portfolio ──────────────────────────────────────────────────────────────

export async function getPortfolio(nailistProfileId: string) {
  const db = requireDb()
  const q = query(
    collection(db, COLLECTIONS.PORTFOLIO_PHOTOS),
    where('nailistProfileId', '==', nailistProfileId),
    orderBy('displayOrder')
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as PortfolioPhotoDoc & { id: string }))
}
