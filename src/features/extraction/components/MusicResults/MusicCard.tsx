import type { MusicReleaseResult, TrackResult } from '../../types'
import { MusicArtwork } from './MusicArtwork'
import { formatArtistNames, getAvailableMusicText } from './musicResultPresentation'
export type MusicSelection =
  | { kind: 'track'; result: TrackResult }
  | { kind: 'music-release'; result: MusicReleaseResult }

type MusicCardProps = MusicSelection & {
  onOpenDetails: (selection: MusicSelection, trigger: HTMLButtonElement) => void
}



export function MusicCard(props: MusicCardProps) {
  if (props.kind === 'track') {
    if (props.result.status === 'resolved') {
      const track = props.result.track
      const providerArtistNames = track.artists.map(({ name }) => name)
      const artistCredits = formatArtistNames(providerArtistNames)
      const albumTitle = getAvailableMusicText(track.preferred_music_release.release_title)

      return (
        <button
          className="result-card music-card"
          type="button"
          aria-haspopup="dialog"
          aria-controls="music-detail-dialog"
          aria-label={`Open details for ${track.track_title}`}
          onClick={(event) =>
            props.onOpenDetails({ kind: 'track', result: props.result }, event.currentTarget)
          }
        >
          <MusicArtwork
            title={track.track_title}
            artistNames={providerArtistNames}
            coverUrl={track.cover_url}
          />
          <div className="music-card-copy">
            <p className="music-card-title">{track.track_title}</p>
            {artistCredits.length > 0 ? <p className="music-card-artists">{artistCredits}</p> : null}
            {albumTitle !== null ? <p className="music-card-release">{albumTitle}</p> : null}
          </div>
        </button>
      )
    }

    const mention = props.result.track_mention
    const interpretedArtistNames = formatArtistNames(mention.artists)
    const albumTitle =
      mention.release_title === null ? null : getAvailableMusicText(mention.release_title)

    return (
      <button
        className="result-card music-card"
        type="button"
        aria-haspopup="dialog"
        aria-controls="music-detail-dialog"
        aria-label={`Open details for ${mention.track_title}`}
        onClick={(event) =>
          props.onOpenDetails({ kind: 'track', result: props.result }, event.currentTarget)
        }
      >
        <div className="music-card-copy">
          <p className="music-card-title">{mention.track_title}</p>
          {interpretedArtistNames.length > 0 ? (
            <p className="music-card-artists">{interpretedArtistNames}</p>
          ) : null}
          {albumTitle !== null ? <p className="music-card-release">{albumTitle}</p> : null}
          <span className="result-status-badge">Not verified</span>
        </div>
      </button>
    )
  }

  if (props.result.status === 'resolved') {
    const musicRelease = props.result.music_release
    const providerArtistNames = musicRelease.artists.map(({ name }) => name)
    const artistCredits = formatArtistNames(providerArtistNames)

    return (
      <button
        className="result-card music-card"
        type="button"
        aria-haspopup="dialog"
        aria-controls="music-detail-dialog"
        aria-label={`Open details for ${musicRelease.release_title}`}
        onClick={(event) =>
          props.onOpenDetails({ kind: 'music-release', result: props.result }, event.currentTarget)
        }
      >
        <MusicArtwork
          title={musicRelease.release_title}
          artistNames={providerArtistNames}
          coverUrl={musicRelease.cover_url}
        />
        <div className="music-card-copy">
          <p className="music-card-title">{musicRelease.release_title}</p>
          {artistCredits.length > 0 ? <p className="music-card-artists">{artistCredits}</p> : null}
        </div>
      </button>
    )
  }

  const mention = props.result.music_release_mention
  const interpretedArtistNames = formatArtistNames(mention.artists)

  return (
    <button
      className="result-card music-card"
      type="button"
      aria-haspopup="dialog"
      aria-controls="music-detail-dialog"
      aria-label={`Open details for ${mention.release_title}`}
      onClick={(event) =>
        props.onOpenDetails({ kind: 'music-release', result: props.result }, event.currentTarget)
      }
    >
      <div className="music-card-copy">
        <p className="music-card-title">{mention.release_title}</p>
        {interpretedArtistNames.length > 0 ? (
          <p className="music-card-artists">{interpretedArtistNames}</p>
        ) : null}
        <span className="result-status-badge">Not verified</span>
      </div>
    </button>
  )
}
