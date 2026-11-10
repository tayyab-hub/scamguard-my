// Shared navigation, account actions and page container. Outlet renders the selected route;
// Suspense shows a loading state for lazy chunks. Route changes update the document title and
// focus while responsive navigation comes from styles.css.

import { Suspense, useEffect, useState, type MouseEvent } from 'react'
import { flushSync } from 'react-dom'
import {
  CircleHelp,
  History,
  LayoutDashboard,
  LogIn,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  ScanLine,
  UserRound,
} from 'lucide-react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { ApiStatus } from '../components/ApiStatus'
import { Brand } from '../components/Brand'
import { useAuth } from '../auth/AuthContext'
import { LoadingState } from '../components/States'
import { SiteFooter } from '../components/SiteFooter'
import { motionAllowed } from '../lib/motion'

// Desktop sidebar preference, remembered in this browser only. Storage can be unavailable
// (private windows, blocked site data), so every access is guarded and defaults to expanded.
const SIDEBAR_KEY = 'scamguard.sidebar'
function readSidebarCollapsed() {
  try {
    return window.localStorage.getItem(SIDEBAR_KEY) === 'collapsed'
  } catch {
    return false
  }
}
function saveSidebarCollapsed(collapsed: boolean) {
  try {
    window.localStorage.setItem(SIDEBAR_KEY, collapsed ? 'collapsed' : 'expanded')
  } catch {
    // Not remembered; the choice still applies until the page is reloaded.
  }
}

const navigation = [
  { to: '/', label: 'Overview', icon: LayoutDashboard },
  { to: '/analyse', label: 'Analyse', icon: ScanLine },
  { to: '/history', label: 'History', icon: History },
  { to: '/help', label: 'Help & Support', icon: CircleHelp },
]

const routeLabels: Record<string, string> = {
  '/': 'Overview',
  '/analyse': 'Analyse',
  '/history': 'History',
  '/help': 'Help & Support',
  '/login': 'Sign in',
  '/signup': 'Create account',
  '/account': 'Account',
  '/forgot-password': 'Forgot password',
  '/reset-password': 'Reset password',
}

// Normalize trailing slashes and map an internal pathname to a readable title, using a not-
// found label for unknown paths.
function routeLabel(pathname: string) {
  const normalized = pathname === '/' ? pathname : pathname.replace(/\/+$/, '')
  return routeLabels[normalized] || 'Page not found'
}

// Render desktop/mobile navigation and the active route. Logout pending/error states follow
// actual backend revocation; failed logout is not presented as success.
export function AppShell() {
  const auth = useAuth()
  const [logoutPending, setLogoutPending] = useState(false)
  const [logoutError, setLogoutError] = useState('')
  const { pathname } = useLocation()
  const current = routeLabel(pathname)
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(readSidebarCollapsed)
  const toggleSidebar = () => {
    saveSidebarCollapsed(!collapsed)
    setCollapsed(!collapsed)
  }

  // Main navigation uses the browser's View Transitions when available and motion is allowed, so
  // the old page fades out instead of vanishing. Modified clicks (new tab etc.) and browsers
  // without support fall back to normal link behaviour.
  function transitionTo(event: MouseEvent<HTMLAnchorElement>, to: string) {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      to === pathname ||
      typeof document.startViewTransition !== 'function' ||
      !motionAllowed()
    )
      return
    event.preventDefault()
    document.startViewTransition(() => flushSync(() => navigate(to)))
  }
  useEffect(() => {
    document.title = `${current} · SCAMGUARD`
    document.getElementById('page-heading')?.focus()
  }, [pathname, current])

  return (
    <div className="min-h-dvh">
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <aside
        id="workspace-sidebar"
        data-collapsed={collapsed}
        className="workspace-sidebar fixed inset-y-0 left-0 z-30 hidden flex-col overflow-y-auto overflow-x-hidden border-r border-line bg-sidebar py-7 lg:flex"
      >
        <Brand compact={collapsed} />
        <nav aria-label="Desktop navigation" className="mt-8 space-y-1">
          {navigation.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={(event) => transitionTo(event, to)}
              data-tooltip={collapsed ? label : undefined}
              className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`}
            >
              <Icon size={18} strokeWidth={1.6} aria-hidden="true" />
              <span className={collapsed ? 'sr-only' : undefined}>{label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="workspace-canvas" data-sidebar={collapsed ? 'collapsed' : 'expanded'}>
        <header className="flex min-h-16 items-center justify-between gap-4 border-b border-line bg-surface/70 px-5 sm:px-8 xl:px-10">
          <div className="lg:hidden">
            <Brand />
          </div>
          <div className="hidden items-center gap-3 text-xs lg:flex">
            <button
              type="button"
              className="sidebar-toggle"
              aria-controls="workspace-sidebar"
              aria-expanded={!collapsed}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              onClick={toggleSidebar}
            >
              {collapsed ? (
                <PanelLeftOpen size={17} aria-hidden="true" />
              ) : (
                <PanelLeftClose size={17} aria-hidden="true" />
              )}
            </button>
            <span
              key={pathname}
              aria-label="Current page"
              className="motion-fade text-sm font-medium text-ink"
            >
              {current}
            </span>
          </div>
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <div className="hidden xl:block">
              <ApiStatus />
            </div>
            {auth.user ? (
              <div className="flex min-w-0 items-center gap-1">
                <span
                  className="hidden max-w-52 truncate px-2 text-xs text-muted md:block"
                  title={auth.user.email}
                >
                  {auth.user.email}
                </span>
                <Link
                  to="/account"
                  aria-label="Account"
                  className="button-quiet flex min-h-9 items-center gap-2 rounded px-2 text-xs font-semibold"
                >
                  <UserRound size={15} aria-hidden="true" />
                  <span className="hidden sm:inline">Account</span>
                </Link>
                <button
                  type="button"
                  aria-label="Logout"
                  className="button-quiet flex min-h-9 items-center gap-2 rounded px-2 text-xs font-semibold"
                  disabled={logoutPending}
                  aria-busy={logoutPending}
                  onClick={() => {
                    setLogoutPending(true)
                    setLogoutError('')
                    void auth
                      .signOut()
                      .catch(() =>
                        setLogoutError(
                          'Logout could not be confirmed. Your session may still be active. Check your connection and try Logout again.',
                        ),
                      )
                      .finally(() => setLogoutPending(false))
                  }}
                >
                  <LogOut size={15} aria-hidden="true" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <Link
                  to="/login"
                  aria-label="Sign in"
                  className="button-quiet flex min-h-9 items-center gap-2 rounded px-2 text-xs font-semibold"
                >
                  <LogIn size={15} aria-hidden="true" />
                  <span className="hidden sm:inline">Sign in</span>
                </Link>
                <Link
                  to="/signup"
                  aria-label="Create account"
                  className="button-primary min-h-9 whitespace-nowrap px-3 py-2 text-xs"
                >
                  <span className="sm:hidden">Join</span>
                  <span className="hidden sm:inline">Create account</span>
                </Link>
              </div>
            )}
          </div>
        </header>
        {logoutError && (
          <p
            role="alert"
            className="border-b border-warning/30 bg-warning-subtle px-5 py-4 text-xs leading-6 text-warning"
          >
            {logoutError}
          </p>
        )}
        {auth.user && (!auth.user.full_name || !auth.user.username) && (
          <div className="border-b border-warning/30 bg-warning-subtle px-5 py-3 text-center text-xs text-warning sm:px-8">
            Your account predates profile fields.{' '}
            <Link className="action-link font-semibold" to="/account">
              Complete your profile
            </Link>{' '}
            to add your name and username.
          </div>
        )}
        <div className="flex items-center justify-between gap-2 border-b border-line bg-surface/70 px-5 py-3 sm:hidden">
          <span className="text-[12px] text-muted">{current}</span>
          <ApiStatus />
        </div>

        <main
          id="main-content"
          tabIndex={-1}
          className="mx-auto max-w-[1480px] px-5 pb-10 pt-8 outline-none sm:px-8 sm:pt-10 xl:px-10"
        >
          <div key={pathname} className="route-content">
            <Suspense fallback={<LoadingState label="Loading view" />}>
              <Outlet />
            </Suspense>
          </div>
        </main>
        <SiteFooter />
      </div>

      <nav aria-label="Mobile navigation" className="mobile-nav">
        {navigation.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            onClick={(event) => transitionTo(event, to)}
            className={({ isActive }) =>
              `flex min-h-14 flex-1 flex-col items-center justify-center gap-1 rounded-md border text-[12px] font-semibold ${isActive ? 'border-accent/30 bg-accent-subtle text-accent' : 'border-transparent text-muted'}`
            }
          >
            <Icon size={20} strokeWidth={1.6} aria-hidden="true" />
            {/* Phones show "Help"; the rest of the name stays for screen readers and tests. */}
            {label === 'Help & Support' ? (
              <span>
                Help<span className="max-sm:sr-only"> &amp; Support</span>
              </span>
            ) : (
              label
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
