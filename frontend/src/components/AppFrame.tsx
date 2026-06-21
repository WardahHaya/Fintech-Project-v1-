import {
  ArrowUpRight,
  LayoutDashboard,
  LogOut,
  ShieldCheck,
  Sparkles,
  TableProperties,
  UsersRound,
} from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'

import { useAuth } from '../auth/useAuth'
import type { AppShellContext } from '../types'


export function AppFrame() {
  const { role, fullName, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const navItems = [
    { to: '/', label: 'Overview', icon: LayoutDashboard },
    { to: '/review', label: 'Reviews', icon: ShieldCheck },
    { to: '/history', label: 'History', icon: TableProperties },
    { to: '/staff', label: 'Staff', icon: UsersRound },
  ]

  const context: AppShellContext = {
    role,
    fullName,
    isAdmin: true,
  }

  return (
    <div className="app-shell min-h-screen overflow-x-hidden">
      <div className="mx-auto flex min-h-screen w-full max-w-[1440px] flex-col px-4 pb-12 pt-5 sm:px-6 lg:px-8">
        <header className="surface-card sticky top-4 z-40 px-4 py-4 sm:px-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-start gap-4">
              <div className="brand-badge">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.34em] text-primary">
                  Tiqmo Intelligence Layer
                </p>
                <h1 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-navy">
                  Compliance & Onboarding Platform
                </h1>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-slate">
                  <span className="rounded-full border border-primary/10 bg-primary/5 px-3 py-1.5 font-medium text-primary">
                    Admin account
                  </span>
                  <span>{fullName}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => navigate('/review?agent=kyc')}
                className="action-primary"
              >
                Open live review
                <ArrowUpRight className="h-4 w-4" />
              </button>
              <button type="button" onClick={logout} className="action-secondary">
                Sign out
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
          <p>Tiqmo Intelligence Layer for KYC, SAMA compliance, and merchant onboarding.</p>
          <div className="text-slate">
            <span>Admin-only operations access across all agent workflows.</span>
          </div>
        </footer>
      </div>
    </div>
  )
}
