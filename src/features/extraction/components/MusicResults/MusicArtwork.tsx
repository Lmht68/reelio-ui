import { useState } from 'react'
import { formatArtistNames } from './musicResultPresentation'

type MusicArtworkProps = {
  title: string
  artistNames: ReadonlyArray<string>
  coverUrl: string | null
}

type MusicCoverFallbackProps = {
  title: string
  artistNames: ReadonlyArray<string>
}

function MusicCoverFallback({ title, artistNames }: MusicCoverFallbackProps) {
  const formattedArtistNames = formatArtistNames(artistNames)
  const accessibleLabel =
    formattedArtistNames.length > 0
      ? `Cover unavailable for ${title} by ${formattedArtistNames}`
      : `Cover unavailable for ${title}`

  return (
    <div className="music-cover-frame">
      <div className="music-cover-fallback" role="img" aria-label={accessibleLabel}>
        <strong>{title}</strong>
        {formattedArtistNames.length > 0 ? (
          <span className="music-cover-artists">{formattedArtistNames}</span>
        ) : null}
        <span className="music-cover-status">Cover unavailable</span>
      </div>
    </div>
  )
}

export function MusicArtwork({ title, artistNames, coverUrl }: MusicArtworkProps) {
  const [hasImageError, setHasImageError] = useState(false)

  const formattedArtistNames = formatArtistNames(artistNames)
  const imageAlt =
    formattedArtistNames.length > 0
      ? `Cover for ${title} by ${formattedArtistNames}`
      : `Cover for ${title}`

  if (coverUrl === null || hasImageError) {
    return <MusicCoverFallback title={title} artistNames={artistNames} />
  }

  return (
    <div className="music-cover-frame">
      <img
        className="music-cover-image"
        src={coverUrl}
        alt={imageAlt}
        loading="lazy"
        onError={() => setHasImageError(true)}
      />
    </div>
  )
}
