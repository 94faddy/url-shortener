export interface User {
  id: string
  name?: string | null
  email: string
  emailVerified?: Date | null
  image?: string | null
  createdAt: Date
  updatedAt: Date
}

export interface Url {
  id: string
  originalUrl: string
  shortCode: string
  title?: string | null
  description?: string | null
  userId: string
  createdAt: Date
  updatedAt: Date
  expiresAt?: Date | null
  isActive: boolean
  _count?: {
    clicks: number
  }
}

export interface Click {
  id: string
  urlId: string
  userAgent?: string | null
  referer?: string | null
  ipAddress?: string | null
  country?: string | null
  city?: string | null
  clickedAt: Date
}

export interface Analytics {
  id: string
  urlId: string
  date: Date
  clicks: number
  uniqueClicks: number
  countries?: any
  referrers?: any
  userAgents?: any
}

export interface DashboardStats {
  totalUrls: number
  totalClicks: number
  todayClicks: number
  topCountries: { country: string; clicks: number }[]
  topUrls: (Url & { _count: { clicks: number } })[]
  clicksByDate: { date: string; clicks: number }[]
}

export interface CreateUrlRequest {
  originalUrl: string
  customCode?: string
  title?: string
  description?: string
  expiresAt?: string
}

export interface UpdateUrlRequest {
  title?: string
  description?: string
  isActive?: boolean
  expiresAt?: string
}