import type { BookResult } from '../extraction/types'
import { BookWorkArtwork } from './BookWorkArtwork'
import {
  formatAuthorCredits,
  formatBookMention,
  formatBookWorkIdentity,
  formatPreferredBookEditionSummary,
  isBookMentionDifferent,
} from './bookWorkResultPresentation'

type BookWorkCardProps = {
  result: BookResult
  onOpenDetails: (result: BookResult, trigger: HTMLButtonElement) => void
}

export function BookWorkCard({ result, onOpenDetails }: BookWorkCardProps) {
  if (result.status === 'resolved') {
    const book = result.book
    const mention = result.book_mention
    const providerAuthorNames = book.authors.map(({ name }) => name)
    const authorCredits = formatAuthorCredits(providerAuthorNames)
    const providerIdentity = formatBookWorkIdentity(book.title, providerAuthorNames)
    const hasDifferentMention = isBookMentionDifferent(mention, book)

    return (
      <button
        className="book-work-card"
        type="button"
        aria-haspopup="dialog"
        aria-controls="book-work-detail-dialog"
        aria-label={`Open Open Library Book Work details for ${providerIdentity}`}
        onClick={(event) => onOpenDetails(result, event.currentTarget)}
      >
        <BookWorkArtwork
          status="resolved"
          title={book.title}
          authorNames={providerAuthorNames}
          coverUrl={book.cover_url}
        />
        <div className="book-work-card-copy">
          <p className="book-work-card-title">{book.title}</p>
          <p className="book-work-card-authors">{authorCredits || 'Author Credits unavailable'}</p>
          <p className="book-work-card-provenance">Open Library Book Work</p>
          <p className="book-work-card-edition">
            Preferred edition: {formatPreferredBookEditionSummary(book.edition)}
          </p>
          {hasDifferentMention ? (
            <p className="book-work-card-mention">Mentioned as {formatBookMention(mention)}</p>
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
      aria-label={`Open unresolved Book Mention details for ${formatBookMention(mention)}`}
      onClick={(event) => onOpenDetails(result, event.currentTarget)}
    >
      <BookWorkArtwork status="unresolved" mention={mention} />
      <div className="book-work-card-copy">
        <p className="book-work-card-title">{mention.title}</p>
        {authorCredits.length > 0 ? (
          <p className="book-work-card-authors">{authorCredits}</p>
        ) : null}
        <span className="book-work-status-badge">Unresolved</span>
      </div>
    </button>
  )
}
