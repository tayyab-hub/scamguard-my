// Motion layer: animations only run when the browser allows motion, numbers always end on the
// exact stored value, and the analysing radar is decorative and mode-specific.

import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { CountUp } from '../components/motion/CountUp'
import { ScanningIndicator } from '../components/analysis/ScanningIndicator'
import { motionAllowed } from '../lib/motion'

function stubMotionPreference(allowMotion: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: query.includes('no-preference') ? allowMotion : !allowMotion,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }))
}

describe('Motion preference', () => {
  it('treats an undetectable preference as reduced motion', () => {
    expect(motionAllowed()).toBe(false)
    stubMotionPreference(true)
    expect(motionAllowed()).toBe(true)
    stubMotionPreference(false)
    expect(motionAllowed()).toBe(false)
  })
})

describe('CountUp', () => {
  it('shows the exact value straight away when motion is reduced', () => {
    stubMotionPreference(false)
    render(<CountUp value={1234} />)
    expect(screen.getByText('1,234')).toBeInTheDocument()
  })

  it('counts up from zero and always ends on the exact value', async () => {
    stubMotionPreference(true)
    render(
      <p data-testid="value">
        <CountUp value={98} duration={0.2} />
      </p>,
    )
    expect(Number(screen.getByTestId('value').textContent)).toBeLessThan(98)
    expect(await screen.findByText('98', {}, { timeout: 2000 })).toBeInTheDocument()
  })
})

describe('ScanningIndicator', () => {
  it('lists the local checks for each input type and stays hidden from screen readers', () => {
    const { container, rerender } = render(<ScanningIndicator mode="MESSAGE" />)
    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true')
    expect(screen.getByText('Checking links offline')).toBeInTheDocument()
    rerender(<ScanningIndicator mode="QR" />)
    expect(screen.getByText('Decoding the QR code')).toBeInTheDocument()
    expect(screen.getByText(/never opened/)).toBeInTheDocument()
  })
})
