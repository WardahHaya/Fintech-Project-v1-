import {
  BriefcaseBusiness,
  LoaderCircle,
  Search,
  Send,
  ShieldCheck,
  ShieldX,
  UserRound,
} from 'lucide-react'
import { startTransition, useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'

import { ReviewResultCard } from '../components/ReviewResultCard'
import { ReviewTimeline } from '../components/ReviewTimeline'
import { sampleCustomers } from '../data/sampleCustomers'
import { fetchKycReviews, runKycReview } from '../lib/api'
import type { AppShellContext, KycReviewRecord, KycReviewResponse } from '../types'

export function ReviewPage() {
  const [customerId, setCustomerId] = useState<string>(sampleCustomers[0].id)
  const [result, setResult] = useState<KycReviewResponse | null>(null)
  const [recentReviews, setRecentReviews] = useState<KycReviewRecord[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const { role, setRole } = useOutletContext<AppShellContext>()

  useEffect(() => {
    let active = true

    async function loadReviews() {
      try {
        const reviews = await fetchKycReviews()
        if (!active) {
          return
        }
        setRecentReviews(reviews.slice(0, 3))
      } catch {
        if (!active) {
          return
        }
        setError('Recent reviews could not be loaded.')
      }
    }

    void loadReviews()

    return () => {
      active = false
    }
  }, [])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)
    setError('')

    try {
      const reviewResult = await runKycReview(customerId.trim())
      setResult(reviewResult)
      const reviews = await fetchKycReviews()
      startTransition(() => {
        setRecentReviews(reviews.slice(0, 3))
      })
    } catch {
      setError('Review failed. Check the record ID and try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[0.96fr_1.04fr]">
      <div className="space-y-6">
        <section className="surface-card p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <span className="eyebrow">{role === 'admin' ? 'Admin view' : 'User view'}</span>
              <h2 className="mt-5 text-4xl font-semibold tracking-[-0.04em] text-slate-950">
                {role === 'admin' ? 'Run a KYC review.' : 'Preview the customer result.'}
              </h2>
            </div>
            <div className="role-switcher">
              <button
                type="button"
                onClick={() => setRole('admin')}
                className={['role-switcher__button', role === 'admin' ? 'is-active' : ''].join(' ')}
              >
                <BriefcaseBusiness className="h-4 w-4" />
                Admin
              </button>
              <button
                type="button"
                onClick={() => setRole('user')}
                className={['role-switcher__button', role === 'user' ? 'is-active' : ''].join(' ')}
              >
                <UserRound className="h-4 w-4" />
                User
              </button>
            </div>
          </div>

          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600">
            Search a record, run the review, and read the decision on the right.
          </p>

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <label className="block">
              <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                Record ID
              </span>
              <div className="flex items-center gap-3 rounded-[24px] border border-teal-900/10 bg-stone-100/65 px-4 py-3 focus-within:border-teal-700 focus-within:bg-white">
                <Search className="h-5 w-5 text-slate-400" />
                <input
                  value={customerId}
                  onChange={(event) => setCustomerId(event.target.value)}
                  placeholder="KYC-00002"
                  className="w-full border-0 bg-transparent text-base text-slate-950 outline-none placeholder:text-slate-400"
                />
              </div>
            </label>

            <button type="submit" disabled={isSubmitting} className="action-primary w-full justify-center">
              {isSubmitting ? (
                <>
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  Running review
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Run review
                </>
              )}
            </button>
          </form>

          {error ? (
            <div className="mt-4 rounded-2xl border border-rose-300/70 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          ) : null}
        </section>

        <section className="surface-card p-6 sm:p-8">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-[20px] bg-teal-800 text-white">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                Demo records
              </p>
              <h3 className="text-2xl font-semibold text-slate-950">Choose a sample</h3>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {sampleCustomers.map((customer) => (
              <button
                key={customer.id}
                type="button"
                onClick={() => setCustomerId(customer.id)}
                className={[
                  'w-full rounded-[24px] border px-4 py-4 text-left transition hover:-translate-y-0.5',
                  customerId === customer.id
                    ? 'border-teal-700 bg-slate-950 text-white shadow-[0_20px_60px_rgba(18,35,45,0.22)]'
                    : 'border-teal-900/10 bg-white/88 hover:border-teal-300',
                ].join(' ')}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">{customer.name}</p>
                    <p
                      className={[
                        'mt-1 text-[11px] font-semibold uppercase tracking-[0.22em]',
                        customerId === customer.id ? 'text-emerald-200' : 'text-slate-400',
                      ].join(' ')}
                    >
                      {customer.id}
                    </p>
                  </div>
                  {customer.tone === 'rejected' ? (
                    <ShieldX className="h-5 w-5" />
                  ) : (
                    <ShieldCheck className="h-5 w-5" />
                  )}
                </div>
                <p
                  className={[
                    'mt-2 text-sm',
                    customerId === customer.id ? 'text-slate-200' : 'text-slate-500',
                  ].join(' ')}
                >
                  {customer.highlight}
                </p>
              </button>
            ))}
          </div>
        </section>

        <section className="surface-card p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="text-xl font-semibold text-slate-950">Recent reviews</h3>
            <p className="text-sm text-slate-500">{role === 'admin' ? 'Admin feed' : 'User-safe feed'}</p>
          </div>
          <ReviewTimeline reviews={recentReviews} emptyLabel="Recent reviews will appear here." />
        </section>
      </div>

      <ReviewResultCard customerId={customerId} result={result} />
    </div>
  )
}
