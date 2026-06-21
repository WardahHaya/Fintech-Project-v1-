import { motion } from 'framer-motion'
import { ArrowRight, LockKeyhole, Mail } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import { useAuth } from '../auth/useAuth'


export function LoginPage() {
  const { login, isAuthenticated, isHydrating } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    if (isAuthenticated && !isHydrating) {
      const nextPath = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? '/'
      navigate(nextPath, { replace: true })
    }
  }, [isAuthenticated, isHydrating, location.state, navigate])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)
    setError('')

    try {
      await login(email.trim(), password)
      navigate('/', { replace: true })
    } catch {
      setError('Login failed. Check your email and password.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-background px-4 py-10">
      <motion.div
        animate={{ x: [0, 24, 0], y: [0, -18, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(99,91,255,0.26),transparent_26%),radial-gradient(circle_at_82%_18%,rgba(255,107,71,0.18),transparent_24%),radial-gradient(circle_at_70%_80%,rgba(10,37,64,0.18),transparent_28%),linear-gradient(135deg,#eef2ff_0%,#f6f9fc_46%,#fff1ec_100%)]"
      />
      <motion.div
        animate={{ x: [0, -20, 0], y: [0, 18, 0] }}
        transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
        className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-primary/18 blur-3xl"
      />
      <motion.div
        animate={{ x: [0, 16, 0], y: [0, -12, 0] }}
        transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
        className="pointer-events-none absolute bottom-8 right-0 h-80 w-80 rounded-full bg-accent/16 blur-3xl"
      />

      <div className="relative mx-auto flex min-h-[calc(100vh-5rem)] max-w-6xl items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="surface-card grid w-full max-w-5xl overflow-hidden lg:grid-cols-[1.05fr_0.95fr]"
        >
          <div className="bg-navy px-8 py-10 text-white sm:px-10">
            <span className="inline-flex rounded-full border border-white/15 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.26em] text-white/70">
              Tiqmo Intelligence Layer
            </span>
            <h1 className="mt-8 max-w-md text-4xl font-semibold tracking-[-0.05em]">
              Secure access to KYC, SAMA compliance, and merchant onboarding.
            </h1>
            <p className="mt-5 max-w-md text-sm leading-7 text-white/72">
              Real authentication now controls every agent route. Sign in with an admin account to continue.
            </p>

            <div className="mt-10 space-y-4">
              {[
                'JWT-based admin authentication',
                'Administrative access management',
                'Protected live agent workflows',
              ].map((item) => (
                <div key={item} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                  <div className="h-2.5 w-2.5 rounded-full bg-accent" />
                  <p className="text-sm text-white/82">{item}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="px-8 py-10 sm:px-10">
            <div className="mx-auto max-w-md">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-white shadow-lg shadow-primary/20">
                <LockKeyhole className="h-5 w-5" />
              </div>
              <h2 className="mt-6 text-3xl font-semibold tracking-[-0.04em] text-navy">Log in</h2>
              <p className="mt-3 text-sm leading-7 text-slate">
                Use your admin credentials to open the platform.
              </p>

              <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
                <label className="block">
                  <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.24em] text-slate">
                    Email
                  </span>
                  <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/10">
                    <Mail className="h-4 w-4 text-slate" />
                    <input
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="name@tiqmo.sa"
                      className="w-full border-0 bg-transparent text-sm text-navy outline-none placeholder:text-slate"
                    />
                  </div>
                </label>

                <label className="block">
                  <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.24em] text-slate">
                    Password
                  </span>
                  <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/10">
                    <LockKeyhole className="h-4 w-4 text-slate" />
                    <input
                      type="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="Enter your password"
                      className="w-full border-0 bg-transparent text-sm text-navy outline-none placeholder:text-slate"
                    />
                  </div>
                </label>

                {error ? (
                  <div className="rounded-2xl border border-danger/15 bg-danger/5 px-4 py-3 text-sm text-danger">
                    {error}
                  </div>
                ) : null}

                <button type="submit" disabled={isSubmitting} className="action-primary w-full justify-center">
                  {isSubmitting ? 'Signing in...' : 'Sign in'}
                  <ArrowRight className="h-4 w-4" />
                </button>
              </form>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
