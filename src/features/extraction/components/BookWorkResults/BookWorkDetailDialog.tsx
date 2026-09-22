import {
  useEffect,
  useRef,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from 'react'
import type { BookResult } from '../../types'
import { BookWorkArtwork } from './BookWorkArtwork'
import {
  formatAuthorCredits,
  formatBookMention,
  isBookMentionDifferent,
} from './bookWorkResultPresentation'

type BookWorkDetailDialogProps = {
  selection: BookResult | null
  onClose: () => void
}

function getDetailTitle(selection: BookResult | null): string | null {
  if (selection === null) {
    return null
  }

  return selection.status === 'resolved' ? selection.book.title : selection.book_mention.title
}

export function BookWorkDetailDialog({ selection, onClose }: BookWorkDetailDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (selection === null) {
      return
    }

    const dialog = dialogRef.current
    if (!dialog || dialog.open) {
      return
    }

    dialog.showModal()
    closeButtonRef.current?.focus()
  }, [selection])

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) {
      return
    }

    function handleNativeClose() {
      onClose()
    }

    dialog.addEventListener('close', handleNativeClose)
    return () => dialog.removeEventListener('close', handleNativeClose)
  }, [onClose])

  function closeDialog() {
    dialogRef.current?.close()
  }

  function handleBackdropClick(event: MouseEvent<HTMLDialogElement>) {
    if (event.target === event.currentTarget) {
      closeDialog()
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDialogElement>) {
    if (event.key === 'Escape') {
      event.preventDefault()
      closeDialog()
    }
  }

  const detailTitle = getDetailTitle(selection)
  let detailContent: ReactNode = null

  if (selection !== null) {
    if (selection.status === 'resolved') {
      const book = selection.book
      const mention = selection.book_mention
      const authorCredits = formatAuthorCredits(book.authors.map(({ name }) => name))
      const hasDifferentMention = isBookMentionDifferent(mention, book)
      const edition = book.edition

      detailContent = (
        <div className="book-work-detail-grid">
          <BookWorkArtwork
            key={`book-${book.open_library_work_id}`}
            title={book.title}
            authorNames={book.authors.map(({ name }) => name)}
            coverUrl={book.cover_url}
          />
          <div className="book-work-detail-copy">
            <h3>{book.title}</h3>
            <dl className="book-work-detail-list">
              <div>
                <dt>Book title</dt>
                <dd>{book.title}</dd>
              </div>
              {authorCredits.length > 0 ? (
                <div>
                  <dt>Author</dt>
                  <dd>{authorCredits}</dd>
                </div>
              ) : null}
              {hasDifferentMention ? (
                <div>
                  <dt>Interpreted as</dt>
                  <dd>{formatBookMention(mention)}</dd>
                </div>
              ) : null}
              {edition !== null && edition.publication_year !== null ? (
                <div>
                  <dt>Published</dt>
                  <dd>{edition.publication_year}</dd>
                </div>
              ) : null}
              {edition !== null && edition.publishers.length > 0 ? (
                <div>
                  <dt>Publisher</dt>
                  <dd>{edition.publishers.join(', ')}</dd>
                </div>
              ) : null}
              {edition !== null && edition.isbn_10.length > 0 ? (
                <div>
                  <dt>ISBN-10</dt>
                  <dd>{edition.isbn_10.join(', ')}</dd>
                </div>
              ) : null}
              {edition !== null && edition.isbn_13.length > 0 ? (
                <div>
                  <dt>ISBN-13</dt>
                  <dd>{edition.isbn_13.join(', ')}</dd>
                </div>
              ) : null}
            </dl>
            <a
              className="button secondary book-work-detail-link"
              href={book.open_library_url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Open ${book.title} on Open Library, opens in a new tab`}
            >
              Open on Open Library
            </a>
          </div>
        </div>
      )
    } else {
      const mention = selection.book_mention
      const authorCredits = formatAuthorCredits(mention.authors)

      detailContent = (
        <div className="book-work-detail-copy">
          <h3>{mention.title}</h3>
          <dl className="book-work-detail-list">
            <div>
              <dt>Book title</dt>
              <dd>{mention.title}</dd>
            </div>
            {authorCredits.length > 0 ? (
              <div>
                <dt>Author</dt>
                <dd>{authorCredits}</dd>
              </div>
            ) : null}
          </dl>
          <span className="result-status-badge">Not verified</span>
          <p className="book-work-detail-description">
            We could not verify this book from the video, so confirmed details are unavailable.
          </p>
        </div>
      )
    }
  }

  return (
    <dialog
      ref={dialogRef}
      id="book-work-detail-dialog"
      className="book-work-detail-dialog"
      aria-labelledby="book-work-detail-dialog-title"
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
    >
      {selection !== null ? (
        <>
          <div className="book-work-detail-dialog-header">
            <h2 id="book-work-detail-dialog-title">{detailTitle} details</h2>
            <button
              ref={closeButtonRef}
              className="button secondary"
              type="button"
              onClick={closeDialog}
            >
              Close details
            </button>
          </div>
          <div className="book-work-detail-dialog-body">{detailContent}</div>
        </>
      ) : null}
    </dialog>
  )
}
