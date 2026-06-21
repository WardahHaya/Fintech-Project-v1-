import { motion } from 'framer-motion'
import { ArrowRight, LockKeyhole, Mail } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import { useAuth } from '../auth/useAuth'
import { useLanguage } from '../i18n/useLanguage'


export function LoginPage() {
  const { login, isAuthenticated, isHydrating } = useAuth()
  const { isArabic, toggleLanguage } = useLanguage()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [portal, setPortal] = useState<'admin' | 'staff'>('admin')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    if (isAuthenticated && !isHydrating) {
      const nextPath =
        (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? '/'
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
      setError(
        isArabic
          ? 'فشل تسجيل الدخول. تحقق من البريد الإلكتروني وكلمة المرور.'
          : 'Login failed. Check your email and password.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-background px-4 py-10">
      <motion.div
        animate={{ x: [0, 24, 0], y: [0, -18, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(76,161,255,0.28),transparent_26%),radial-gradient(circle_at_82%_18%,rgba(255,107,71,0.16),transparent_24%),radial-gradient(circle_at_70%_80%,rgba(10,37,64,0.15),transparent_28%),linear-gradient(135deg,#e5f2ff_0%,#f6f9fc_50%,#fff0e8_100%)]"
      />
      <motion.div
        animate={{ x: [0, -20, 0], y: [0, 18, 0] }}
        transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
        className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-sky-300/25 blur-3xl"
      />
      <motion.div
        animate={{ x: [0, 16, 0], y: [0, -12, 0] }}
        transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
        className="pointer-events-none absolute bottom-8 right-0 h-80 w-80 rounded-full bg-accent/14 blur-3xl"
      />

      <div className="relative mx-auto flex min-h-[calc(100vh-5rem)] max-w-6xl items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="surface-card grid w-full max-w-5xl overflow-hidden lg:grid-cols-[1.02fr_0.98fr]"
        >
          <div className="relative overflow-hidden bg-[linear-gradient(180deg,#d7ebff_0%,#c8e2fb_50%,#dcedff_100%)] px-8 py-10 sm:px-10">
            <div className="absolute end-6 top-6">
              <div className="lang-toggle">
                <button
                  type="button"
                  className={isArabic ? '' : 'is-active'}
                  onClick={() => {
                    if (isArabic) {
                      toggleLanguage()
                    }
                  }}
                >
                  English
                </button>
                <button
                  type="button"
                  className={isArabic ? 'is-active' : ''}
                  onClick={() => {
                    if (!isArabic) {
                      toggleLanguage()
                    }
                  }}
                >
                  العربية
                </button>
              </div>
            </div>

            <div className="relative z-10 max-w-xl text-start">
              <div className="flex items-center gap-4">
                <div className="brand-badge">
                  <div className="relative z-10 flex items-center justify-center">
                    <span className="text-3xl font-bold leading-none">t</span>
                    <span className="absolute -end-1.5 -top-1 h-3.5 w-3.5 rounded-full bg-accent" />
                  </div>
                </div>
                <div>
                  <p className="text-3xl font-bold tracking-[-0.04em] text-navy">tiqmo</p>
                  <p className="text-sm text-slate">
                    {isArabic ? 'طبقة الذكاء التشغيلي' : 'Intelligence Layer'}
                  </p>
                </div>
              </div>

              <h1 className="mt-10 max-w-lg text-4xl font-semibold tracking-[-0.05em] text-navy">
                {isArabic
                  ? 'دخول آمن لإدارة اعرف عميلك، امتثال ساما، وانضمام التجار.'
                  : 'Secure access to KYC, SAMA compliance, and merchant onboarding.'}
              </h1>
              <p className="mt-5 max-w-md text-sm leading-7 text-slate">
                {isArabic
                  ? 'هذه البوابة مخصصة لحسابات الإدارة وأعضاء الفريق في تيقمو، مع تسجيل دخول حقيقي وحماية كاملة لمسارات الوكلاء.'
                  : 'This portal is for Tiqmo administrators and staff members, with real authentication protecting every agent workflow.'}
              </p>

              <div className="mt-10 tiqmo-stage-card max-w-[24rem]">
                <div className="space-y-4">
                  {[
                    isArabic ? 'مصادقة JWT إدارية' : 'JWT-based admin authentication',
                    isArabic ? 'إدارة صلاحيات الفريق' : 'Administrative staff management',
                    isArabic ? 'مسارات تشغيل محمية للوكلاء' : 'Protected live agent workflows',
                  ].map((item) => (
                    <div
                      key={item}
                      className="flex items-center gap-3 rounded-2xl border border-white/70 bg-white/70 px-4 py-3"
                    >
                      <div className="h-2.5 w-2.5 rounded-full bg-accent" />
                      <p className="text-sm text-navy">{item}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="px-8 py-10 sm:px-10">
            <div className="mx-auto max-w-md text-start">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-white shadow-lg shadow-primary/20">
                <LockKeyhole className="h-5 w-5" />
              </div>
              <h2 className="mt-6 text-3xl font-semibold tracking-[-0.04em] text-navy">
                {isArabic ? 'تسجيل الدخول' : 'Log in'}
              </h2>
              <p className="mt-3 text-sm leading-7 text-slate">
                {portal === 'admin'
                  ? isArabic
                    ? 'استخدم بيانات الإدارة للوصول إلى لوحة التحكم.'
                    : 'Use your admin credentials to open the platform.'
                  : isArabic
                    ? 'استخدم بيانات الموظف للوصول إلى لوحة التحكم.'
                    : 'Use your staff credentials to open the platform.'}
              </p>

              <div className="mt-6">
                <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.24em] text-slate">
                  {isArabic ? 'نوع الحساب' : 'Sign in as'}
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {(['admin', 'staff'] as const).map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setPortal(option)}
                      className={[
                        'rounded-2xl border px-4 py-3 text-sm font-semibold transition',
                        portal === option
                          ? 'border-primary bg-primary/5 text-primary'
                          : 'border-slate-200 bg-white text-slate hover:border-primary/40',
                      ].join(' ')}
                    >
                      {option === 'admin'
                        ? isArabic
                          ? 'إداري'
                          : 'Admin'
                        : isArabic
                          ? 'موظف'
                          : 'Staff'}
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-xs leading-5 text-slate">
                  {isArabic
                    ? 'يعتمد الوصول النهائي على دور حسابك.'
                    : 'Final access is based on your account role.'}
                </p>
              </div>

              <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
                <label className="block">
                  <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.24em] text-slate">
                    {isArabic ? 'البريد الإلكتروني' : 'Email'}
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
                    {isArabic ? 'كلمة المرور' : 'Password'}
                  </span>
                  <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/10">
                    <LockKeyhole className="h-4 w-4 text-slate" />
                    <input
                      type="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder={isArabic ? 'أدخل كلمة المرور' : 'Enter your password'}
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
                  {isSubmitting
                    ? isArabic
                      ? 'جار تسجيل الدخول...'
                      : 'Signing in...'
                    : isArabic
                      ? 'دخول'
                      : 'Sign in'}
                  <ArrowRight className="h-4 w-4 rtl:rotate-180" />
                </button>
              </form>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
