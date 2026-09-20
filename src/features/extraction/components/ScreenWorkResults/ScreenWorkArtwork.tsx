import { useState } from 'react'

type ResolvedScreenWorkArtworkProps = {
  status: 'resolved'
  title: string
  year: number
  posterUrl: string | null
}

type UnresolvedScreenWorkArtworkProps = {
  status: 'unresolved'
  title: string
  year: number
}

type ScreenWorkArtworkProps = ResolvedScreenWorkArtworkProps | UnresolvedScreenWorkArtworkProps

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

export function ScreenWorkArtwork(props: ScreenWorkArtworkProps) {
  const [hasImageError, setHasImageError] = useState(false)

  if (props.status === 'unresolved') {
    return <PosterFallback title={props.title} year={props.year} />
  }

  if (props.posterUrl === null || hasImageError) {
    return <PosterFallback title={props.title} year={props.year} />
  }

  return (
    <div className="poster-frame">
      <img
        className="poster-image"
        src={props.posterUrl}
        alt={`Poster for ${props.title}`}
        loading="lazy"
        onError={() => setHasImageError(true)}
      />
    </div>
  )
}
