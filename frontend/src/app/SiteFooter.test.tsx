// Site footer: a real footer landmark, working internal links and accurate official contacts.

import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { SiteFooter } from '../components/SiteFooter'

describe('SiteFooter', () => {
  it('links the help sections and gives accurate urgent-help contacts', () => {
    render(
      <MemoryRouter>
        <SiteFooter />
      </MemoryRouter>,
    )
    const footer = screen.getByRole('contentinfo')
    const links = within(footer).getByRole('navigation', { name: 'Footer links' })
    expect(within(links).getByRole('link', { name: 'Help & Support' })).toHaveAttribute(
      'href',
      '/help',
    )
    expect(within(links).getByRole('link', { name: 'Privacy and your data' })).toHaveAttribute(
      'href',
      '/help#privacy-heading',
    )
    expect(within(footer).getByRole('link', { name: /Call 997/ })).toHaveAttribute(
      'href',
      'tel:997',
    )
    const semakMule = within(footer).getByRole('link', { name: /Semak Mule/ })
    expect(semakMule).toHaveAttribute('href', 'https://semakmule.rmp.gov.my/')
    expect(semakMule).toHaveAttribute('target', '_blank')
    expect(semakMule).toHaveAttribute('rel', 'noopener noreferrer')
    expect(within(footer).getByText(/does not mean it is safe/)).toBeInTheDocument()
    expect(
      within(footer).getByText(new RegExp(`© ${new Date().getFullYear()} SCAMGUARD`)),
    ).toBeInTheDocument()
  })
})
