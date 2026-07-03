import { Timestamp } from 'firebase/firestore'

export type UserRole = 'CLIENT' | 'NAILIST' | 'ADMIN'
export type AppointmentStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW'

// Firestore document types (timestamps as Firestore Timestamp)
export interface UserDoc {
  uid: string
  email: string
  displayName?: string
  photoUrl?: string
  role: UserRole
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface NailistProfileDoc {
  userId: string
  businessName: string
  bio?: string
  phoneNumber?: string
  address?: string
  city?: string
  state?: string
  country?: string
  postalCode?: string
  latitude?: number
  longitude?: number
  geohash?: string
  photoUrl?: string
  coverPhotoUrl?: string   // shown on the search-results card; set from Settings or the portfolio picker
  instagramUrl?: string
  tiktokUrl?: string
  whatsappPhone?: string   // Israeli format: 0501234567 or +972501234567
  isVerified: boolean
  isActive: boolean
  onboardingCompleted?: boolean   // false right after signup; true once the onboarding wizard's last step (working hours) is saved
  avgRating: number
  reviewCount: number
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface ClientProfileDoc {
  userId: string
  phoneNumber?: string
  address?: string
  city?: string
  country?: string
  latitude?: number
  longitude?: number
  photoUrl?: string
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface ServiceDoc {
  nailistProfileId: string
  name: string
  description?: string
  durationMinutes: number
  price: number
  currency: string
  isActive: boolean
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface PortfolioPhotoDoc {
  nailistProfileId: string
  url: string
  storageKey?: string
  caption?: string
  displayOrder: number
  createdAt: Timestamp
}

export interface WorkingHoursDoc {
  nailistProfileId: string
  dayOfWeek: number // 0 = Sunday, 6 = Saturday
  startTime: string // "09:00"
  endTime: string   // "18:00"
  isActive: boolean
}

export interface AppointmentDoc {
  nailistProfileId: string
  clientProfileId: string
  serviceId: string
  startTime: Timestamp
  endTime: Timestamp
  status: AppointmentStatus
  notes?: string
  price: number
  currency: string
  serviceName: string
  nailistBusinessName: string
  clientDisplayName?: string
  reviewRequested?: boolean
  hasReview?: boolean
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface ReviewDoc {
  nailistProfileId: string
  clientProfileId: string
  appointmentId: string
  rating: number
  comment?: string
  clientDisplayName?: string
  clientPhotoUrl?: string
  createdAt: Timestamp
  updatedAt: Timestamp
}

// Serialized types for client-side use (Timestamps converted to strings)
export interface User extends Omit<UserDoc, 'createdAt' | 'updatedAt'> {
  id: string
  createdAt: string
  updatedAt: string
}

export interface NailistProfile extends Omit<NailistProfileDoc, 'createdAt' | 'updatedAt'> {
  id: string
  createdAt: string
  updatedAt: string
  services?: Service[]
  portfolio?: PortfolioPhoto[]
  workingHours?: WorkingHours[]
  distanceKm?: number
}

export interface ClientProfile extends Omit<ClientProfileDoc, 'createdAt' | 'updatedAt'> {
  id: string
  createdAt: string
  updatedAt: string
}

export interface Service extends Omit<ServiceDoc, 'createdAt' | 'updatedAt'> {
  id: string
  createdAt: string
  updatedAt: string
}

export interface PortfolioPhoto extends Omit<PortfolioPhotoDoc, 'createdAt'> {
  id: string
  createdAt: string
}

export interface WorkingHours extends WorkingHoursDoc {
  id: string
}

export interface Appointment extends Omit<AppointmentDoc, 'startTime' | 'endTime' | 'createdAt' | 'updatedAt'> {
  id: string
  startTime: string
  endTime: string
  createdAt: string
  updatedAt: string
}

export interface Review extends Omit<ReviewDoc, 'createdAt' | 'updatedAt'> {
  id: string
  createdAt: string
  updatedAt: string
}

export interface ApiResponse<T> {
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  hasMore: boolean
  lastDocId?: string
}
