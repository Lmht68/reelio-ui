import { useState } from 'react'

type ScreenWorkArtworkProps = {
  title: string
  year: number
  posterUrl: string | null
}

type PosterFallbackProps = {
  title: string
  year: number
}

function PosterFallback({ title, year }: PosterFallbackProps) {
  return (
    <div className="poster-frame">
      <div className="poster-fallback" role="img" aria-label={`Poster unavailable for ${title}`}>
        <strong>{title}</strong>
        <span>
          {year} · Poster unavailable
        </span>
      </div>
    </div>
  )
}

export function ScreenWorkArtwork({ title, year, posterUrl }: ScreenWorkArtworkProps) {
  const [hasImageError, setHasImageError] = useState(false)

  if (posterUrl === null || hasImageError) {
    return <PosterFallback title={title} year={year} />
  }

  return (
    <div className="poster-frame">
      <img
        className="poster-image"
        src={posterUrl}
        alt={`Poster for ${title}`}
        loading="lazy"
        onError={() => setHasImageError(true)}
      />
    </div>
  )
}
