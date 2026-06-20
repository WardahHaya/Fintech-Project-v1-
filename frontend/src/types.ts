export type KycDecision = 'APPROVED' | 'REVIEW_REQUIRED' | 'REJECTED'
export type AppAccessRole = 'admin' | 'user'

export interface AppShellContext {
  role: AppAccessRole
  setRole: (role: AppAccessRole) => void
}

export interface HealthResponse {
  status: string
  service: string
}

export interface KycReviewResponse {
  decision: KycDecision
  risk_score: number
  confidence: number
  reasoning: string[]
  missing_documents: string[]
}

export interface KycReviewRecord {
  id: string
  customer_id: string
  full_name: string
  risk_score: number
  confidence_score: number
  decision: KycDecision
  reasoning: string[]
  missing_documents: string[]
  reviewed_at: string
}
