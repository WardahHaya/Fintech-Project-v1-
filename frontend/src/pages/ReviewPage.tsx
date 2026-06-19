import { LoaderCircle, Search, Send, ShieldCheck, ShieldX, Sparkles } from 'lucide-react'
import { startTransition, useEffect, useState } from 'react'

import { ReviewResultCard } from '../components/ReviewResultCard'
import { ReviewTimeline } from '../components/ReviewTimeline'
import { sampleCustomers } from '../data/sampleCustomers'
import { fetchKycReviews, runKycReview } from '../lib/api'
import type { KycReviewRecord, KycReviewResponse } from '../types'

export function ReviewPage() {
  const [customerId, setCustomerId] = useState<string>(sampleCustomers[0].id)
  const [result, setResult] = useState<KycReviewResponse | null>(null)
  const [recentReviews, setRecentReviews] = useState<KycReviewRecord[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    async function loadReviews() {
      try {
        const reviews = await fetchKycReviews()
        if (!active) {
          return
        }
        setRecentReviews(reviews.slice(0, 4))
      } catch {
        if (!active) {
          return
        }
        setError('Unable to load recent reviews from the backend.')
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
        setRecentReviews(reviews.slice(0, 4))
      })
    } catch {
      setError('The KYC review could not be completed. Check the dataset record ID or backend status.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[0.96fr_1.04fr]">
      <div className="space-y-6">
        <section className="surface-card p-6 sm:p-8">
          <span className="eyebrow">Phase 1 review workspace</span>
          <h2 className="mt-5 text-4xl font-semibold tracking-[-0.04em] text-slate-950">
            Execute deterministic KYC reviews in a single motion.
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600">
            The current backend evaluates a real record from `kyc_dataset.csv`, scores the case,
            and returns decision reasoning plus missing document flags. This page is built to
            mirror that exact workflow.
          </p>

          <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                KYC Record ID
              </span>
              <div className="flex items-center gap-3 rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-3 focus-within:border-indigo-400 focus-within:bg-white">
                <Search className="h-5 w-5 text-slate-400" />
                <input
                  value={customerId}
                  onChange={(event) => setCustomerId(event.target.value)}
                  placeholder="Enter a record like KYC-00002"
                  className="w-full border-0 bg-transparent text-base text-slate-950 outline-none placeholder:text-slate-400"
                />
              </div>
            </label>

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-900/20 transition hover:translate-y-[-1px] disabled:cursor-wait disabled:opacity-75"
            >
              {isSubmitting ? (
                <>
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  Running review
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Trigger KYC decision
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
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                Sample scenarios
              </p>
              <h3 className="text-2xl font-semibold text-slate-950">Quick-launch KYC records</h3>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            {sampleCustomers.map((customer) => (
              <button
                key={customer.id}
                type="button"
                onClick={() => setCustomerId(customer.id)}
                className={[
                  'w-full rounded-[24px] border px-4 py-4 text-left transition',
                  customerId === customer.id
                    ? 'border-slate-950 bg-slate-950 text-white shadow-lg shadow-slate-900/20'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50',
                ].join(' ')}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">{customer.name}</p>
                    <p
                      className={[
                        'mt-1 text-xs font-semibold uppercase tracking-[0.22em]',
                        customerId === customer.id ? 'text-slate-300' : 'text-slate-400',
                      ].join(' ')}
                    >
                      {customer.id}
                    </p>
                  </div>
                  {customer.highlight.includes('reject') || customer.highlight.includes('Expired') ? (
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

        <section className="surface-card p-6 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
            Recent reviews
          </p>
          <h3 className="mt-2 text-2xl font-semibold text-slate-950">Analyst audit trail</h3>
          <div className="mt-6">
            <ReviewTimeline
              reviews={recentReviews}
              emptyLabel="Recent reviews will appear here after you trigger the first decision."
            />
          </div>
        </section>
      </div>

      <ReviewResultCard customerId={customerId} result={result} />
    </div>
  )
}
