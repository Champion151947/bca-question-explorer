import { Link } from 'react-router-dom'
import { EmptyState } from '../components/ui'

export default function NotFoundPage() {
  return (
    <div className="py-10">
      <EmptyState title="Page not found">
        That link does not exist.{' '}
        <Link to="/" className="link">
          Go to the subject list
        </Link>
        .
      </EmptyState>
    </div>
  )
}
