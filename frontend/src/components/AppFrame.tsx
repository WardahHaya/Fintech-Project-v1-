import {
  ArrowUpRight,
  BriefcaseBusiness,
  LayoutDashboard,
  ShieldCheck,
  Sparkles,
  TableProperties,
  UserRound,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'

import type { AppAccessRole, AppShellContext } from '../types'

const ACCESS_STORAGE_KEY = 'tiqmo-access-role'

const navItems = [
  { to: '/', label: 'Overview', icon: LayoutDashboard },
  { to: '/review', label: 'Reviews', icon: ShieldCheck },
  { to: '/history', label: 'History', icon: TableProperties },
]

const accessCopy: Record<
  AppAccessRole,
  { label: string; detail: string; icon: typeof BriefcaseBusiness }
> = {
  admin: {
    label: 'Admin access',
    detail: 'Internal review workspace',
    icon: BriefcaseBusiness,
  },
  user: {
    label: 'User access',
    detail: 'Customer-facing journey',
    icon: UserRound,
  },
}

function readStoredRole(): AppAccessRole {
  if (typeof window === 'undefined') {
    return 'admin'
  }

  const storedValue = window.localStorage.getItem(ACCESS_STORAGE_KEY)
  return storedValue === 'user' ? 'user' : 'admin'
}

export function AppFrame() {
  const [role, setRoleState] = useState<AppAccessRole>(readStoredRole)
  const navigate = useNavigate()
  const activeAccess = accessCopy[role]
  const AccessIcon = activeAccess.icon

  useEffect(() => {
    window.localStorage.setItem(ACCESS_STORAGE_KEY, role)
  }, [role])

  const context: AppShellContext = {
    role,
    setRole: (nextRole) => setRoleState(nextRole),
  }

  return (
    <div className="app-shell min-h-screen overflow-x-hidden">
      <div className="mx-auto flex min-h-screen w-full max-w-[1440px] flex-col px-4 pb-12 pt-5 sm:px-6 lg:px-8">
        <header className="surface-card sticky top-4 z-40 overflow-hidden px-4 py-4 sm:px-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-start gap-4">
              <div className="brand-badge">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.34em] text-teal-700">
                  Tiqmo Intelligence Layer
                </p>
                <h1 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-slate-950">
                  Tiqmo KYC Console
                </h1>
                <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-teal-900/10 bg-white/80 px-3 py-2 text-xs text-slate-600">
                  <AccessIcon className="h-4 w-4 text-teal-700" />
                  <span className="font-semibold text-slate-950">{activeAccess.label}</span>
                  <span className="hidden sm:inline">{activeAccess.detail}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 xl:items-end">
              <div className="role-switcher">
                {(['admin', 'user'] as const).map((option) => {
                  const optionCopy = accessCopy[option]
                  const OptionIcon = optionCopy.icon
                  const isActive = role === option

                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setRoleState(option)}
                      className={['role-switcher__button', isActive ? 'is-active' : ''].join(' ')}
                    >
                      <OptionIcon className="h-4 w-4" />
                      {optionCopy.label}
                    </button>
                  )
                })}
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => navigate(role === 'admin' ? '/review' : '/')}
                  className="action-primary"
                >
                  {role === 'admin' ? 'Open reviews' : 'Open user view'}
                  <ArrowUpRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          <nav className="mt-5 flex gap-2 overflow-x-auto pb-1">
            {navItems.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  ['nav-pill shrink-0', isActive ? 'is-active' : ''].join(' ')
                }
              >
                <Icon className="h-4 w-4" />
                {label}
              </NavLink>
            ))}
          </nav>
        </header>

        <main className="flex-1 pt-6">
          <Outlet context={context} />
        </main>

        <footer className="mt-8 flex flex-col gap-2 px-2 text-sm text-slate-500 md:flex-row md:items-center md:justify-between">
          <p>Tiqmo KYC review workspace.</p>
          <div className="text-slate-400">
            <span>Separate admin and user views.</span>
          </div>
        </footer>
      </div>
    </div>
  )
}
