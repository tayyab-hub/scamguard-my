// Site-wide footer: what SCAMGUARD does, workspace and help links, and where to get urgent help
// in Malaysia. External contacts are official services (verified November 2026): the National
// Scam Response Centre hotline 997 (24 hours, run by the Royal Malaysia Police with Bank Negara
// Malaysia, MCMC and NFCC) and the PDRM Semak Mule checker.

import { ArrowUpRight, Phone, Shield } from 'lucide-react'
import { Link } from 'react-router-dom'

const workspaceLinks = [
  { to: '/', label: 'Overview' },
  { to: '/analyse', label: 'Analyse' },
  { to: '/history', label: 'History' },
  { to: '/account', label: 'Account' },
]

const helpLinks = [
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
          <div className="max-w-sm">
            <div className="flex items-center gap-3">
              <span className="flex size-9 items-center justify-center rounded-md bg-accent text-on-accent">
                <Shield size={18} strokeWidth={1.8} aria-hidden="true" />
              </span>
              <span>
                <span className="block text-sm font-semibold tracking-wide text-ink">
                  SCAMGUARD
                </span>
                <span className="eyebrow block !text-[9px]">FORENSIC INTELLIGENCE</span>
              </span>
            </div>
            <p className="mt-4 text-xs leading-6 text-body">
              Check suspicious messages, links, phone numbers and QR codes before you click, reply,
              call or pay.
            </p>
            <p className="mt-2 text-[11px] leading-5 text-muted">
              Links are never opened and numbers are never called. Results are advisory, not a
              guarantee.
            </p>
          </div>

          <nav aria-label="Workspace links">
            <h2 className="site-footer-heading">Workspace</h2>
            <ul className="site-footer-list">
              {workspaceLinks.map((link) => (
                <li key={link.to}>
                  <Link to={link.to} className="site-footer-link">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Help links">
            <h2 className="site-footer-heading">Help</h2>
            <ul className="site-footer-list">
              {helpLinks.map((link) => (
                <li key={link.to}>
                  <Link to={link.to} className="site-footer-link">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <section className="site-footer-urgent" aria-labelledby="footer-urgent-heading">
            <h2 id="footer-urgent-heading" className="site-footer-heading !text-danger">
              Been scammed? Act fast
            </h2>
            <a href="tel:997" className="site-footer-call">
              <Phone size={16} aria-hidden="true" />
              <span>
                <span className="block text-sm font-semibold">Call 997</span>
                <span className="block text-[11px] font-normal text-muted">
                  National Scam Response Centre · 24 hours
                </span>
              </span>
            </a>
            <p className="mt-2 text-[11px] leading-5 text-muted">
              Report within 24 hours of finding out, and call your bank on the number printed on
              your card.
            </p>
            <a
              href="https://semakmule.rmp.gov.my/"
              target="_blank"
              rel="noopener noreferrer"
              className="site-footer-link mt-2 inline-flex items-center gap-1"
            >
              Check an account or number on Semak Mule (PDRM)
              <ArrowUpRight size={13} aria-hidden="true" />
              <span className="sr-only">(opens in a new tab)</span>
            </a>
            <p className="mt-1 text-[10.5px] leading-5 text-muted">
              No record there does not mean it is safe.
            </p>
          </section>
        </div>

        <div className="site-footer-bottom">
          <p>
            © {year} SCAMGUARD <span aria-hidden="true">·</span> Forensic Intelligence
          </p>
          <p>Thoughtful technology. Safer decisions.</p>
        </div>
      </div>
    </footer>
  )
}
