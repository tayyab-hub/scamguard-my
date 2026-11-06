// Global jsdom test setup adds DOM assertions and minimal dialog shims, then cleans rendered
// nodes, stubbed globals/environment and fake timers after each test. Native focus containment
// is verified in a real browser.

import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeEach, vi } from 'vitest'
import { configureWakeRetry } from '../lib/api'

// Offline scenarios assert the final unavailable state immediately; wake-up retries are
// exercised explicitly in api.test.ts.
beforeEach(() => configureWakeRetry({ attempts: 0 }))

// jsdom does not implement the native dialog top layer. Real containment is tested in Playwright.
HTMLDialogElement.prototype.showModal = function () {
  this.setAttribute('open', '')
}
HTMLDialogElement.prototype.close = function () {
  this.removeAttribute('open')
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
  vi.useRealTimers()
})
