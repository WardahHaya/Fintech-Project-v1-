import axios from 'axios'

import type {
  ComplianceQueryRecord,
  ComplianceQueryResponse,
  HealthResponse,
  LoginResponse,
  KycReviewRecord,
  KycReviewResponse,
  MerchantReviewRecord,
  MerchantReviewResponse,
  StaffCreatePayload,
  StaffUpdatePayload,
  UserProfile,
} from '../types'

const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL?.replace(/\/+$/, '') ?? ''
let authToken: string | null = null
let unauthorizedHandler: (() => void) | null = null

const api = axios.create({
  baseURL: configuredBaseUrl,
  timeout: 15000,
})

export function setApiAuthToken(token: string | null) {
  authToken = token
}

export function setApiUnauthorizedHandler(handler: (() => void) | null) {
  unauthorizedHandler = handler
}

api.interceptors.request.use((config) => {
  if (authToken) {
    config.headers.Authorization = `Bearer ${authToken}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error.response?.status
    const requestUrl = String(error.config?.url ?? '')
    const isLoginRequest = requestUrl.includes('/api/v1/auth/login')

    if (status === 401 && !isLoginRequest) {
      unauthorizedHandler?.()
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.location.replace('/login')
      }
    }

    return Promise.reject(error)
  },
)

export async function fetchHealth() {
  const response = await api.get<HealthResponse>('/health')
  return response.data
}

export async function loginRequest(email: string, password: string) {
  const response = await api.post<LoginResponse>('/api/v1/auth/login', { email, password })
  return response.data
}

export async function fetchCurrentUser() {
  const response = await api.get<UserProfile>('/api/v1/auth/me')
  return response.data
}

export async function runKycReview(customerId: string) {
  const response = await api.post<KycReviewResponse>(`/api/v1/kyc/review/${customerId}`)
  return response.data
}

export async function fetchKycReviews() {
  const response = await api.get<KycReviewRecord[]>('/api/v1/kyc/reviews')
  return response.data
}

export async function queryCompliance(query: string) {
  const response = await api.post<ComplianceQueryResponse>('/api/v1/compliance/query', { query })
  return response.data
}

export async function fetchComplianceHistory() {
  const response = await api.get<ComplianceQueryRecord[]>('/api/v1/compliance/history')
  return response.data
}

export async function runMerchantReview(merchantId: string) {
  const response = await api.post<MerchantReviewResponse>(`/api/v1/merchant/review/${merchantId}`)
  return response.data
}

export async function fetchMerchantReviews() {
  const response = await api.get<MerchantReviewRecord[]>('/api/v1/merchant/reviews')
  return response.data
}

export async function fetchUsers() {
  const response = await api.get<UserProfile[]>('/api/v1/admin/users')
  return response.data
}

export async function createStaffUser(payload: StaffCreatePayload) {
  const response = await api.post<UserProfile>('/api/v1/admin/users', payload)
  return response.data
}

export async function updateStaffUser(userId: string, payload: StaffUpdatePayload) {
  const response = await api.patch<UserProfile>(`/api/v1/admin/users/${userId}`, payload)
  return response.data
}
