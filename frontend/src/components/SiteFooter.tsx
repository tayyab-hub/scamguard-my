// Site footer: brand statement, help links and urgent help for Malaysia, then a legal line.
// External contacts are official services (verified November 2026): the National Scam Response
// Centre hotline 997 (24 hours, run by the Royal Malaysia Police with Bank Negara Malaysia, MCMC
// and NFCC) and the PDRM Semak Mule checker.

import { ArrowUpRight, Phone, ShieldCheck } from 'lucide-react'
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
        <div className="site-footer-grid">
          <div className="site-footer-brand">
            <p className="site-footer-wordmark">
              <span className="site-footer-mark">
                <ShieldCheck size={18} strokeWidth={1.6} aria-hidden="true" />
              </span>
              SCAMGUARD
            </p>
            <p className="mt-3 max-w-xs">
              Check suspicious messages, links, phone numbers and QR codes before you click, reply
              or pay.
            </p>
          </div>

          <div>
            <p className="site-footer-heading">Support</p>
            <nav aria-label="Footer links" className="site-footer-nav">
              {links.map((link) => (
                <Link key={link.to} to={link.to} className="site-footer-link">
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          <div>
            <p className="site-footer-heading">Been scammed?</p>
            <p>Call the National Scam Response Centre, open 24 hours.</p>
            <a href="tel:997" className="site-footer-call">
              <Phone size={14} aria-hidden="true" />
              Call 997
            </a>
            <p className="mt-3">
              <a
                href="https://semakmule.rmp.gov.my/"
                target="_blank"
                rel="noopener noreferrer"
                className="site-footer-link"
              >
                Check an account or number on Semak Mule
                <ArrowUpRight size={12} aria-hidden="true" />
                <span className="sr-only">(opens in a new tab)</span>
              </a>
            </p>
            <p className="site-footer-fine">No record there does not mean it is safe.</p>
          </div>
        </div>

        <div className="site-footer-bottom">
          <p>© {year} SCAMGUARD. Academic capstone project.</p>
          <p>Results are advisory, not a guarantee.</p>
        </div>
      </div>
    </footer>
  )
}
