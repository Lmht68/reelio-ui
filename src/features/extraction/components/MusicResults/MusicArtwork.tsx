import { useState } from 'react'
import { formatArtistNames } from './musicResultPresentation'

type ResolvedMusicArtworkProps = {
  status: 'resolved'
  title: string
  artistNames: ReadonlyArray<string>
  coverUrl: string | null
}

type UnresolvedMusicArtworkProps = {
  status: 'unresolved'
  title: string
  artistNames: ReadonlyArray<string>
}

type MusicArtworkProps = ResolvedMusicArtworkProps | UnresolvedMusicArtworkProps

type MusicCoverFallbackProps = {
  status: 'resolved' | 'unresolved'
  title: string
  artistNames: ReadonlyArray<string>
}

function MusicCoverFallback({ status, title, artistNames }: MusicCoverFallbackProps) {
  const formattedArtistNames = formatArtistNames(artistNames)
  const isUnresolved = status === 'unresolved'
  const coverLabel = isUnresolved ? 'No verified cover' : 'Cover unavailable'
  const accessibleLabel =
    formattedArtistNames.length > 0
      ? `${coverLabel} for ${title} by ${formattedArtistNames}`
      : `${coverLabel} for ${title}`

  return (
    <div className="music-cover-frame">
      <div
        className={`music-cover-fallback ${isUnresolved ? 'music-cover-fallback-unresolved' : ''}`}
        role="img"
        aria-label={accessibleLabel}
      >
        <strong>{title}</strong>
        {formattedArtistNames.length > 0 ? (
          <span className="music-cover-artists">{formattedArtistNames}</span>
        ) : null}
        <span className="music-cover-status">{isUnresolved ? 'Unresolved' : 'Cover unavailable'}</span>
      </div>
    </div>
  )
}

export function MusicArtwork(props: MusicArtworkProps) {
  const [hasImageError, setHasImageError] = useState(false)

  if (props.status === 'unresolved') {
    return (
      <MusicCoverFallback
        status="unresolved"
        title={props.title}
        artistNames={props.artistNames}
      />
    )
  }

  const formattedArtistNames = formatArtistNames(props.artistNames)
  const imageAlt =
    formattedArtistNames.length > 0
      ? `Cover for ${props.title} by ${formattedArtistNames}`
      : `Cover for ${props.title}`

  if (props.coverUrl === null || hasImageError) {
    return (
      <MusicCoverFallback status="resolved" title={props.title} artistNames={props.artistNames} />
    )
  }

  return (
    <div className="music-cover-frame">
      <img
        className="music-cover-image"
        src={props.coverUrl}
        alt={imageAlt}
        loading="lazy"
        onError={() => setHasImageError(true)}
      />
    </div>
  )
}
