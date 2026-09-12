import { Link } from 'react-router-dom'
import { ScanLine } from 'lucide-react'
import { PageHeading } from '../components/PageHeading'
import { SubmissionHistory } from '../components/SubmissionHistory'

export function HistoryPage() {
  return (
    <>
      <PageHeading
        eyebrow="FORENSIC INTELLIGENCE / HISTORY"
        title="Analysis history"
        description="Find a past check, review its evidence or analyse the content again."
        action={
          <Link to="/analyse" className="button-primary">
            <ScanLine size={16} aria-hidden="true" /> New analysis
          </Link>
        }
      />
      <div className="panel overflow-hidden">
        <SubmissionHistory />
      </div>
      <p className="mt-4 text-xs leading-6 text-muted">
        Only your account’s records appear here. A saved result reflects the evidence available when
        it was created; it is not a guarantee of safety.
      </p>
    </>
  )
}
