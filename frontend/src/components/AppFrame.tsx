import {
  ArrowUpRight,
  ChevronRight,
  LayoutDashboard,
  ShieldCheck,
  Sparkles,
  TableProperties,
} from 'lucide-react'
import { NavLink, Outlet } from 'react-router-dom'

const navItems = [
  { to: '/', label: 'Overview', icon: LayoutDashboard },
  { to: '/review', label: 'Review workspace', icon: ShieldCheck },
  { to: '/history', label: 'Decision history', icon: TableProperties },
]

export function AppFrame() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-[linear-gradient(180deg,#eef4ff_0%,#f8fbff_48%,#eef2ff_100%)]">
      <div className="mx-auto flex min-h-screen w-full max-w-[1400px] flex-col px-4 pb-12 pt-5 sm:px-6 lg:px-8">
        <header className="surface-card sticky top-4 z-40 mb-6 flex items-center justify-between gap-4 rounded-[26px] px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-lg shadow-slate-900/20">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-slate-400">
                Tiqmo
              </p>
              <h1 className="text-lg font-semibold text-slate-950">Intelligence Layer</h1>
            </div>
          </div>

          <nav className="hidden items-center gap-2 md:flex">
            {navItems.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  [
                    'flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition',
                    isActive
                      ? 'bg-slate-950 text-white shadow-lg shadow-slate-900/20'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950',
                  ].join(' ')
                }
              >
                <Icon className="h-4 w-4" />
                {label}
              </NavLink>
            ))}
          </nav>

          <a
            href="/review"
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:translate-y-[-1px]"
          >
            Launch review
            <ArrowUpRight className="h-4 w-4" />
          </a>
        </header>

        <main className="flex-1">
          <Outlet />
        </main>

        <footer className="mt-8 flex flex-col gap-3 px-2 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>Phase 1 KYC control center for Tiqmo’s compliance and onboarding operations.</p>
          <div className="flex items-center gap-2 text-slate-400">
            <span>Stripe-inspired visual system</span>
            <ChevronRight className="h-4 w-4" />
            <span>FastAPI-backed decisions</span>
          </div>
        </footer>
      </div>
    </div>
  )
}
