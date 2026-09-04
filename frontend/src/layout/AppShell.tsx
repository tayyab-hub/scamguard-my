import { useEffect } from 'react'
import { ArrowUpRight, ChevronRight, Globe2, LayoutDashboard, ScanLine, Shield } from 'lucide-react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { ApiStatus } from '../components/ApiStatus'
import { Brand } from '../components/Brand'

const navigation = [
  { to: '/', label: 'Overview', icon: LayoutDashboard },
  { to: '/analyse', label: 'Analyse', icon: ScanLine },
]

export function AppShell() {
  const { pathname } = useLocation()
  const current = navigation.find((item) => item.to === pathname)?.label || 'Page not found'
  useEffect(() => {
    document.title = `${current} · SCAMGUARD`
    document.getElementById('page-heading')?.focus()
  }, [pathname, current])

  return (
    <div className="min-h-dvh">
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[260px] flex-col overflow-y-auto border-r border-line bg-sidebar px-5 py-7 lg:flex">
        <Brand />
        <div className="mb-7 mt-10 border-y border-line py-4">
          <p className="eyebrow">SECURITY / WORKSPACE</p>
          <p className="mt-2 text-xs text-body">Clarity before you act.</p>
        </div>
        <p className="eyebrow mb-3 px-3">Workspace</p>
        <nav aria-label="Desktop navigation" className="space-y-2">
          {navigation.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`}
            >
              <Icon size={18} strokeWidth={1.6} aria-hidden="true" />
              {label}
              <ChevronRight size={14} className="ml-auto text-muted" aria-hidden="true" />
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto pt-12">
          <div className="rounded-md border border-line bg-surface/50 p-4">
            <Shield size={19} className="mb-3 text-accent" strokeWidth={1.5} aria-hidden="true" />
            <p className="text-sm font-semibold text-ink">Pause. Check. Protect.</p>
            <p className="mt-2 text-xs leading-5 text-muted">
              A little caution can make a meaningful difference.
            </p>
            <Link
              to="/analyse"
              className="action-link mt-4 flex min-h-8 items-center gap-2 rounded text-xs font-semibold text-accent"
            >
              Explore analysis
              <ArrowUpRight size={14} className="motion-arrow" aria-hidden="true" />
            </Link>
          </div>
          <div className="mt-6 flex items-center gap-2 px-1 text-[11px] text-muted">
            <Globe2 size={14} aria-hidden="true" />
            Built for safer digital decisions
          </div>
        </div>
      </aside>

      <div className="lg:pl-[260px]">
        <header className="flex min-h-[78px] items-center justify-between gap-4 border-b border-line bg-surface/70 px-5 sm:px-8 xl:px-10">
          <div className="lg:hidden">
            <Brand />
          </div>
          <div className="hidden items-center gap-3 text-xs lg:flex">
            <span className="text-muted">Workspace</span>
            <ChevronRight size={13} className="text-muted" aria-hidden="true" />
            <span key={pathname} className="motion-fade font-medium text-ink">
              {current}
            </span>
          </div>
          <div className="hidden sm:block">
            <ApiStatus />
          </div>
        </header>
        <div className="flex items-center justify-between gap-2 border-b border-line bg-surface/70 px-5 py-3 sm:hidden">
          <span className="text-[11px] text-muted">Forensic Intelligence</span>
          <ApiStatus />
        </div>

        <main
          id="main-content"
          tabIndex={-1}
          className="mx-auto max-w-[1480px] px-5 pb-32 pt-8 outline-none sm:px-8 sm:pt-10 lg:pb-10 xl:px-10"
        >
          <div key={pathname} className="route-content">
            <Outlet />
          </div>
          <footer className="mt-9 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5 text-[10px] text-muted">
            <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <Shield size={13} aria-hidden="true" />
              <span className="font-semibold">SCAMGUARD</span>
              <span aria-hidden="true">/</span>
              <span>Forensic Intelligence</span>
            </span>
            <span>Thoughtful technology. Safer decisions.</span>
          </footer>
        </main>
      </div>

      <nav aria-label="Mobile navigation" className="mobile-nav">
        {navigation.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex min-h-14 flex-1 flex-col items-center justify-center gap-1 rounded-md border text-[11px] font-semibold ${isActive ? 'border-accent/30 bg-accent-subtle text-accent' : 'border-transparent text-muted'}`
            }
          >
            <Icon size={20} strokeWidth={1.6} aria-hidden="true" />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
