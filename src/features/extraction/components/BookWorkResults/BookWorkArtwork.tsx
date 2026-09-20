import { useState } from 'react'
import type { BookMention } from '../../types'
import { formatAuthorCredits, formatBookWorkIdentity } from './bookWorkResultPresentation'

type ResolvedBookWorkArtworkProps = {
  status: 'resolved'
  title: string
  authorNames: ReadonlyArray<string>
  coverUrl: string | null
}

type UnresolvedBookWorkArtworkProps = {
  status: 'unresolved'
  mention: BookMention
}

type BookWorkArtworkProps = ResolvedBookWorkArtworkProps | UnresolvedBookWorkArtworkProps

type BookCoverFallbackProps = {
  status: 'resolved' | 'unresolved'
  title: string
  authorNames: ReadonlyArray<string>
}

function BookCoverFallback({ status, title, authorNames }: BookCoverFallbackProps) {
  const formattedAuthorCredits = formatAuthorCredits(authorNames)
  const formattedIdentity = formatBookWorkIdentity(title, authorNames)
  const isUnresolved = status === 'unresolved'
  const coverLabel = isUnresolved ? 'No verified cover' : 'Cover unavailable'

  return (
    <div className="book-cover-frame">
      <div
        className={`book-cover-fallback ${isUnresolved ? 'book-cover-fallback-unresolved' : ''}`}
        role="img"
        aria-label={`${coverLabel} for ${formattedIdentity}`}
      >
        <strong>{title}</strong>
        {formattedAuthorCredits.length > 0 ? (
          <span className="book-cover-authors">{formattedAuthorCredits}</span>
        ) : null}
        <span className="book-cover-status">{isUnresolved ? 'Unresolved' : 'Cover unavailable'}</span>
      </div>
    </div>
  )
}

export function BookWorkArtwork(props: BookWorkArtworkProps) {
  const [hasImageError, setHasImageError] = useState(false)

  if (props.status === 'unresolved') {
    return (
      <BookCoverFallback
        status="unresolved"
        title={props.mention.title}
        authorNames={props.mention.authors}
      />
    )
  }

  const imageAlt = `Cover for ${formatBookWorkIdentity(props.title, props.authorNames)}`

  if (props.coverUrl === null || hasImageError) {
    return (
      <BookCoverFallback status="resolved" title={props.title} authorNames={props.authorNames} />
    )
  }

  return (
    <div className="book-cover-frame">
      <img
        className="book-cover-image"
        src={props.coverUrl}
        alt={imageAlt}
        loading="lazy"
        onError={() => setHasImageError(true)}
      />
    </div>
  )
}
