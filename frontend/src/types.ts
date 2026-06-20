export type AgentKey = 'kyc' | 'compliance' | 'merchant'
export type KycDecision = 'APPROVED' | 'REVIEW_REQUIRED' | 'REJECTED'
export type MerchantDecision = 'APPROVED' | 'ESCALATE' | 'REJECTED'
export type ReviewDecision = KycDecision | MerchantDecision
export type AppAccessRole = 'admin' | 'user'

export interface AppShellContext {
  role: AppAccessRole | null
  fullName: string
  isAdmin: boolean
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

export interface ComplianceQuerySource {
  chunk_id: string
  source: string
  domain: string
  article: string | null
  title: string
  score: number
}

export interface ComplianceQueryResponse {
  answer: string
  sources: ComplianceQuerySource[]
  has_groq: boolean
}

export interface ComplianceQueryRecord {
  id: string
  query_text: string
  answer: string
  source_chunk_ids: string[]
  confidence: number | null
  has_groq: boolean
  queried_at: string
}

export interface MerchantReviewResponse {
  decision: MerchantDecision
  risk_score: number
  confidence: number
  reasoning: string[]
  missing_documents: string[]
}

export interface MerchantReviewRecord {
  id: string
  merchant_id: string
  business_name: string
  risk_score: number
  confidence_score: number
  decision: MerchantDecision
  reasoning: string[]
  missing_documents: string[]
  reviewed_at: string
}

export interface UserProfile {
  id: string
  email: string
  full_name: string
  role: AppAccessRole
  is_active: boolean
  created_at: string
}

export interface LoginResponse {
  access_token: string
  token_type: string
  role: AppAccessRole
  full_name: string
}

export interface StaffCreatePayload {
  email: string
  password: string
  full_name: string
  role: AppAccessRole
}

export interface StaffUpdatePayload {
  full_name?: string
  role?: AppAccessRole
  is_active?: boolean
}
