import {
  ArrowUpRight,
  LayoutDashboard,
  LogOut,
  ShieldCheck,
  TableProperties,
  UsersRound,
} from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'

import { useAuth } from '../auth/useAuth'
import { useLanguage } from '../i18n/useLanguage'
import type { AppShellContext } from '../types'


export function AppFrame() {
  const { role, fullName, logout } = useAuth()
  const { isArabic, dir, toggleLanguage } = useLanguage()
  const navigate = useNavigate()
  const location = useLocation()

  const isAdmin = role === 'admin'

  const navItems = [
    {
      to: '/',
      label: isArabic ? 'الرئيسية' : 'Overview',
      icon: LayoutDashboard,
    },
    {
      to: '/review',
      label: isArabic ? 'المراجعات' : 'Reviews',
      icon: ShieldCheck,
    },
    {
      to: '/history',
      label: isArabic ? 'السجل' : 'History',
      icon: TableProperties,
    },
    ...(isAdmin
      ? [
          {
            to: '/staff',
            label: isArabic ? 'الفريق' : 'Staff',
            icon: UsersRound,
          },
        ]
      : []),
  ]

  const context: AppShellContext = {
    role,
    fullName,
    isAdmin,
  }

  return (
    <div className="app-shell min-h-screen overflow-x-hidden" dir={dir}>
      <div className="mx-auto flex min-h-screen w-full max-w-[1440px] flex-col px-4 pb-12 pt-5 sm:px-6 lg:px-8">
        <header className="surface-card sticky top-4 z-40 overflow-hidden px-4 py-4 sm:px-6">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-sky-400 via-primary to-accent" />

          <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-start gap-4 text-start">
              <div className="brand-badge shrink-0">
                <div className="relative z-10 flex items-center justify-center">
                  <span className="text-3xl font-bold leading-none">t</span>
                  <span className="absolute -end-1.5 -top-1 h-3.5 w-3.5 rounded-full bg-accent" />
                </div>
              </div>

              <div className="text-start">
                <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.32em] text-primary">
                  <span>Tiqmo</span>
                  <span className="h-1 w-1 rounded-full bg-primary/40" />
                  <span>{isArabic ? 'طبقة الذكاء التشغيلي' : 'Intelligence Layer'}</span>
                </div>

                <h1 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-navy sm:text-3xl">
                  {isArabic
                    ? 'مركز التحكم للامتثال والانضمام التشغيلي'
                    : 'Compliance & Onboarding Command Center'}
                </h1>

                <p className="mt-3 max-w-3xl text-sm leading-7 text-slate">
                  {isArabic
                    ? 'منصة تشغيل موحدة لفرق تيقمو الإدارية لإدارة قرارات اعرف عميلك، استفسارات امتثال ساما، ومراجعات انضمام التجار.'
                    : 'A single operations layer for Tiqmo administrators to manage KYC decisions, SAMA regulatory guidance, and merchant onboarding reviews.'}
                </p>

                <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-slate">
                  <span className="rounded-full border border-primary/10 bg-primary/5 px-3 py-1.5 font-medium text-primary">
                    {isArabic ? 'وصول إداري فقط' : 'Admin-only access'}
                  </span>
                  <span>{fullName}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
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

              <button
                type="button"
                onClick={() => navigate('/review?agent=kyc')}
                className="action-primary"
              >
                {isArabic ? 'افتح المراجعة المباشرة' : 'Open live review'}
                <ArrowUpRight className="h-4 w-4 rtl:rotate-[-90deg]" />
              </button>

              <button type="button" onClick={logout} className="action-secondary">
                {isArabic ? 'تسجيل الخروج' : 'Sign out'}
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {navItems.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  ['nav-pill', isActive ? 'is-active' : ''].join(' ')
                }
              >
                <Icon className="h-4 w-4" />
                {label}
              </NavLink>
            ))}
          </div>
        </header>

        <main className="flex-1 pt-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={`${location.pathname}${location.search}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
            >
              <Outlet context={context} />
            </motion.div>
          </AnimatePresence>
        </main>

        <footer className="mt-8 flex flex-col gap-2 px-2 text-sm text-slate md:flex-row md:items-center md:justify-between">
          <p>
            {isArabic
              ? 'طبقة تيقمو الذكية لعمليات اعرف عميلك والامتثال وانضمام التجار.'
              : 'Tiqmo Intelligence Layer for KYC, compliance, and merchant onboarding.'}
          </p>
          <div className="text-slate">
            <span>
              {isArabic
                ? 'لوحة تشغيل داخلية مخصصة للإدارة والحوكمة التشغيلية.'
                : 'Internal command console reserved for management and operations governance.'}
            </span>
          </div>
        </footer>
      </div>
    </div>
  )
}
