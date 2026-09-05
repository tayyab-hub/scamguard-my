import { ArrowLeft, Compass, ScanLine } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PageHeading } from '../components/PageHeading'

export function NotFoundPage() {
  return (
    <>
      <PageHeading
        eyebrow="404 / PAGE NOT FOUND"
        title="Page not found"
        description="The address may have changed, or this page does not exist."
      />
      <div className="panel p-8">
        <Compass size={35} className="mb-6 text-accent" aria-hidden="true" />
        <div className="flex flex-wrap gap-3">
          <Link to="/" className="button-primary w-fit">
            <ArrowLeft size={16} aria-hidden="true" /> Return to Overview
          </Link>
          <Link to="/analyse" className="button-secondary w-fit">
            <ScanLine size={16} aria-hidden="true" /> Open Analyse
          </Link>
        </div>
      </div>
    </>
  )
}
