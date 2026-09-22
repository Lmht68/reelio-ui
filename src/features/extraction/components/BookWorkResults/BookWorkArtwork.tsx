import { useState } from 'react'
import { formatAuthorCredits, formatBookWorkIdentity } from './bookWorkResultPresentation'

type BookWorkArtworkProps = {
  title: string
  authorNames: ReadonlyArray<string>
  coverUrl: string | null
}

type BookCoverFallbackProps = {
  title: string
  authorNames: ReadonlyArray<string>
}

function BookCoverFallback({ title, authorNames }: BookCoverFallbackProps) {
  const formattedAuthorCredits = formatAuthorCredits(authorNames)
  const formattedIdentity = formatBookWorkIdentity(title, authorNames)

  return (
    <div className="book-cover-frame">
      <div className="book-cover-fallback" role="img" aria-label={`Cover unavailable for ${formattedIdentity}`}>
        <strong>{title}</strong>
        {formattedAuthorCredits.length > 0 ? (
          <span className="book-cover-authors">{formattedAuthorCredits}</span>
        ) : null}
        <span className="book-cover-status">Cover unavailable</span>
      </div>
    </div>
  )
}

export function BookWorkArtwork({ title, authorNames, coverUrl }: BookWorkArtworkProps) {
  const [hasImageError, setHasImageError] = useState(false)
  const imageAlt = `Cover for ${formatBookWorkIdentity(title, authorNames)}`

  if (coverUrl === null || hasImageError) {
    return <BookCoverFallback title={title} authorNames={authorNames} />
  }

  return (
    <div className="book-cover-frame">
      <img
        className="book-cover-image"
        src={coverUrl}
        alt={imageAlt}
        loading="lazy"
        onError={() => setHasImageError(true)}
      />
    </div>
  )
}
