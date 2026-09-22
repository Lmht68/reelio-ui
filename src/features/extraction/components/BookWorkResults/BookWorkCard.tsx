import type { BookResult } from '../../types'
import { BookWorkArtwork } from './BookWorkArtwork'
import { formatAuthorCredits, formatBookWorkIdentity } from './bookWorkResultPresentation'

type BookWorkCardProps = {
  result: BookResult
  onOpenDetails: (result: BookResult, trigger: HTMLButtonElement) => void
}

export function BookWorkCard({ result, onOpenDetails }: BookWorkCardProps) {
  if (result.status === 'resolved') {
    const book = result.book
    const providerAuthorNames = book.authors.map(({ name }) => name)
    const authorCredits = formatAuthorCredits(providerAuthorNames)
    const providerIdentity = formatBookWorkIdentity(book.title, providerAuthorNames)
    const publicationYear = book.edition?.publication_year ?? null

    return (
      <button
        className="book-work-card"
        type="button"
        aria-haspopup="dialog"
        aria-controls="book-work-detail-dialog"
        aria-label={`Open details for ${providerIdentity}`}
        onClick={(event) => onOpenDetails(result, event.currentTarget)}
      >
        <BookWorkArtwork
          title={book.title}
          authorNames={providerAuthorNames}
          coverUrl={book.cover_url}
        />
        <div className="book-work-card-copy">
          <p className="book-work-card-title">{book.title}</p>
          {authorCredits.length > 0 ? (
            <p className="book-work-card-authors">{authorCredits}</p>
          ) : null}
          {publicationYear !== null ? (
            <p className="book-work-card-publication">{publicationYear}</p>
          ) : null}
        </div>
      </button>
    )
  }

  const mention = result.book_mention
  const authorCredits = formatAuthorCredits(mention.authors)

  return (
    <button
      className="book-work-card"
      type="button"
      aria-haspopup="dialog"
      aria-controls="book-work-detail-dialog"
      aria-label={`Open details for ${formatBookWorkIdentity(mention.title, mention.authors)}`}
      onClick={(event) => onOpenDetails(result, event.currentTarget)}
    >
      <div className="book-work-card-copy">
        <p className="book-work-card-title">{mention.title}</p>
        {authorCredits.length > 0 ? (
          <p className="book-work-card-authors">{authorCredits}</p>
        ) : null}
        <span className="result-status-badge">Not verified</span>
      </div>
    </button>
  )
}
