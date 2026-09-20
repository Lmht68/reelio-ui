import { useRef, useState } from 'react'
import type { BookResult } from '../../types'
import { BookWorkCard } from './BookWorkCard'
import { BookWorkDetailDialog } from './BookWorkDetailDialog'

type BookWorkResultsProps = {
  books: Array<BookResult>
}

function getBookResultKey(result: BookResult): string {
  if (result.status === 'resolved') {
    return result.book.open_library_work_id
  }

  return JSON.stringify([result.book_mention.title, result.book_mention.authors])
}

export function BookWorkResults({ books }: BookWorkResultsProps) {
  const [selectedBook, setSelectedBook] = useState<BookResult | null>(null)
  const lastDetailTriggerRef = useRef<HTMLButtonElement | null>(null)

  if (books.length === 0) {
    return null
  }

  function handleOpenDetails(result: BookResult, trigger: HTMLButtonElement) {
    lastDetailTriggerRef.current = trigger
    setSelectedBook(result)
  }

  function handleDetailClose() {
    setSelectedBook(null)
    lastDetailTriggerRef.current?.focus()
  }

  return (
    <div className="book-work-results">
      <section className="book-work-results-section" aria-labelledby="book-works-heading">
        <h3 id="book-works-heading">Book Works</h3>
        <ul className="book-work-grid">
          {books.map((result) => (
            <li key={getBookResultKey(result)}>
              <BookWorkCard result={result} onOpenDetails={handleOpenDetails} />
            </li>
          ))}
        </ul>
      </section>
      <BookWorkDetailDialog selection={selectedBook} onClose={handleDetailClose} />
    </div>
  )
}
