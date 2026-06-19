import axios from 'axios'

import type { HealthResponse, KycReviewRecord, KycReviewResponse } from '../types'

const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL?.replace(/\/+$/, '') ?? ''

const api = axios.create({
  baseURL: configuredBaseUrl,
  timeout: 15000,
})

export async function fetchHealth() {
  const response = await api.get<HealthResponse>('/health')
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
