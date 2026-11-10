// Slim site footer: one line of urgent help for Malaysia, one line of links. External contacts
// are official services (verified November 2026): the National Scam Response Centre hotline 997
// (24 hours, run by the Royal Malaysia Police with Bank Negara Malaysia, MCMC and NFCC) and the
// PDRM Semak Mule checker.

import { ArrowUpRight, Phone } from 'lucide-react'
import { Link } from 'react-router-dom'

const links = [
  { to: '/help', label: 'Help & Support' },
  { to: '/help#faq-heading', label: 'Frequently asked questions' },
  { to: '/help#privacy-heading', label: 'Privacy and your data' },
  { to: '/help#feedback-heading', label: 'Send feedback' },
]

export function SiteFooter() {
  const year = new Date().getFullYear()
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <p className="site-footer-urgent">
          <span className="font-semibold text-ink">Been scammed?</span>
          <a href="tel:997" className="site-footer-call">
            <Phone size={13} aria-hidden="true" />
            Call 997
          </a>
          <span>National Scam Response Centre, 24 hours.</span>
          <a
            href="https://semakmule.rmp.gov.my/"
            target="_blank"
            rel="noopener noreferrer"
            className="site-footer-link inline-flex items-center gap-1"
          >
            Check an account or number on Semak Mule
            <ArrowUpRight size={12} aria-hidden="true" />
            <span className="sr-only">(opens in a new tab)</span>
          </a>
          <span>No record there does not mean it is safe.</span>
        </p>
        <div className="site-footer-bottom">
          <p>© {year} SCAMGUARD. Results are advisory, not a guarantee.</p>
          <nav aria-label="Footer links" className="site-footer-nav">
            {links.map((link) => (
              <Link key={link.to} to={link.to} className="site-footer-link">
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  )
}
