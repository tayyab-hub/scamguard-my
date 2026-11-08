// Shared motion preference. Animations run only when the browser reports no reduced-motion
// preference; anything that cannot report it (tests, very old browsers) gets the still version.
// The hook re-renders when the operating-system setting changes while the page is open.

import { useSyncExternalStore } from 'react'

const QUERY = '(prefers-reduced-motion: no-preference)'

// One-off check for event handlers (for example before starting a page transition).
export function motionAllowed() {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia(QUERY).matches
    : false
}

function subscribe(onChange: () => void) {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return () => {}
  const query = window.matchMedia(QUERY)
  query.addEventListener('change', onChange)
  return () => query.removeEventListener('change', onChange)
}

// Live version for components: true only while motion is allowed.
export function useMotionAllowed() {
  return useSyncExternalStore(subscribe, motionAllowed, () => false)
}

// Shared easing (a quick start that settles gently), matching --ease-emphasized in styles.css.
export const EASE_EMPHASIZED = [0.16, 1, 0.3, 1] as const
