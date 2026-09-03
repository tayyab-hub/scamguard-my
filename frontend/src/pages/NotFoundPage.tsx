import { ArrowLeft, Compass } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PageHeading } from '../components/PageHeading'

export function NotFoundPage() {
  return (
    <>
      <PageHeading
        eyebrow="404 / PAGE NOT FOUND"
        title="This page is off the map"
        description="The address may have changed, or this page does not exist."
      />
      <div className="panel p-8">
        <Compass size={35} className="mb-6 text-accent" aria-hidden="true" />
        <Link to="/" className="button-primary w-fit">
          <ArrowLeft size={16} aria-hidden="true" />
          Back to dashboard
        </Link>
      </div>
    </>
  )
}
