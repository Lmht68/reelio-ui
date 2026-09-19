import type { MusicReleaseResult, TrackResult } from '../extraction/types'
import { MusicArtwork } from './MusicArtwork'
import {
  formatArtistNames,
  formatMusicReleaseDate,
  formatMusicReleaseMention,
  formatMusicReleaseType,
  formatTrackMention,
  isMusicReleaseMentionDifferent,
  isTrackMentionDifferent,
} from './musicResultPresentation'
export type MusicSelection =
  | { kind: 'track'; result: TrackResult }
  | { kind: 'music-release'; result: MusicReleaseResult }

type MusicCardProps = MusicSelection & {
  onOpenDetails: (selection: MusicSelection, trigger: HTMLButtonElement) => void
}

function appendArtistCredits(label: string, artistNames: ReadonlyArray<string>): string {
  const formattedArtistNames = formatArtistNames(artistNames)

  return formattedArtistNames.length > 0 ? `${label} by ${formattedArtistNames}` : label
}

export function MusicCard(props: MusicCardProps) {
  if (props.kind === 'track') {
    if (props.result.status === 'resolved') {
      const track = props.result.track
      const mention = props.result.track_mention
      const providerArtistNames = track.artists.map(({ name }) => name)
      const artistCredits = formatArtistNames(providerArtistNames)
      const hasDifferentMention = isTrackMentionDifferent(mention, track)

      return (
        <button
          className="music-card"
          type="button"
          aria-haspopup="dialog"
          aria-controls="music-detail-dialog"
          aria-label={appendArtistCredits(
            `Open Spotify Track details for ${track.track_title}`,
            providerArtistNames,
          )}
          onClick={(event) =>
            props.onOpenDetails({ kind: 'track', result: props.result }, event.currentTarget)
          }
        >
          <MusicArtwork
            status="resolved"
            title={track.track_title}
            artistNames={providerArtistNames}
            coverUrl={track.cover_url}
          />
          <div className="music-card-copy">
            <p className="music-card-title">{track.track_title}</p>
            <p className="music-card-artists">{artistCredits || 'Artist unavailable'}</p>
            <p className="music-card-provenance">Spotify Track</p>
            <p className="music-card-release">
              Preferred release: {track.preferred_music_release.release_title} ·{' '}
              {formatMusicReleaseDate(track.preferred_music_release.release_date)}
            </p>
            {hasDifferentMention ? (
              <p className="music-card-mention">Mentioned as {formatTrackMention(mention)}</p>
            ) : null}
          </div>
        </button>
      )
    }

    const mention = props.result.track_mention
    const interpretedArtistNames = formatArtistNames(mention.artists)
    const hasReleaseContext = mention.release_title !== null || mention.release_year !== null

    return (
      <button
        className="music-card"
        type="button"
        aria-haspopup="dialog"
        aria-controls="music-detail-dialog"
        aria-label={appendArtistCredits(
          `Open unresolved Track Mention details for ${mention.track_title}`,
          mention.artists,
        )}
        onClick={(event) =>
          props.onOpenDetails({ kind: 'track', result: props.result }, event.currentTarget)
        }
      >
        <MusicArtwork
          status="unresolved"
          title={mention.track_title}
          artistNames={mention.artists}
        />
        <div className="music-card-copy">
          <p className="music-card-title">{mention.track_title}</p>
          {interpretedArtistNames.length > 0 ? (
            <p className="music-card-artists">{interpretedArtistNames}</p>
          ) : null}
          {hasReleaseContext ? (
            <p className="music-card-release">{formatTrackMention(mention)}</p>
          ) : null}
          <span className="music-status-badge">Unresolved</span>
        </div>
      </button>
    )
  }

  if (props.result.status === 'resolved') {
    const musicRelease = props.result.music_release
    const mention = props.result.music_release_mention
    const providerArtistNames = musicRelease.artists.map(({ name }) => name)
    const artistCredits = formatArtistNames(providerArtistNames)
    const hasDifferentMention = isMusicReleaseMentionDifferent(mention, musicRelease)

    return (
      <button
        className="music-card"
        type="button"
        aria-haspopup="dialog"
        aria-controls="music-detail-dialog"
        aria-label={appendArtistCredits(
          `Open Spotify Music Release details for ${musicRelease.release_title}`,
          providerArtistNames,
        )}
        onClick={(event) =>
          props.onOpenDetails({ kind: 'music-release', result: props.result }, event.currentTarget)
        }
      >
        <MusicArtwork
          status="resolved"
          title={musicRelease.release_title}
          artistNames={providerArtistNames}
          coverUrl={musicRelease.cover_url}
        />
        <div className="music-card-copy">
          <p className="music-card-title">{musicRelease.release_title}</p>
          <p className="music-card-artists">{artistCredits || 'Artist unavailable'}</p>
          <p className="music-card-provenance">
            Spotify {formatMusicReleaseType(musicRelease.album_type)} ·{' '}
            {formatMusicReleaseDate(musicRelease.release_date)}
          </p>
          {hasDifferentMention ? (
            <p className="music-card-mention">Mentioned as {formatMusicReleaseMention(mention)}</p>
          ) : null}
        </div>
      </button>
    )
  }

  const mention = props.result.music_release_mention
  const interpretedArtistNames = formatArtistNames(mention.artists)

  return (
    <button
      className="music-card"
      type="button"
      aria-haspopup="dialog"
      aria-controls="music-detail-dialog"
      aria-label={appendArtistCredits(
        `Open unresolved Music Release Mention details for ${mention.release_title}`,
        mention.artists,
      )}
      onClick={(event) =>
        props.onOpenDetails({ kind: 'music-release', result: props.result }, event.currentTarget)
      }
    >
      <MusicArtwork
        status="unresolved"
        title={mention.release_title}
        artistNames={mention.artists}
      />
      <div className="music-card-copy">
        <p className="music-card-title">{mention.release_title}</p>
        {interpretedArtistNames.length > 0 ? (
          <p className="music-card-artists">{interpretedArtistNames}</p>
        ) : null}
        {mention.release_year !== null ? (
          <p className="music-card-release">{mention.release_year}</p>
        ) : null}
        <span className="music-status-badge">Unresolved</span>
      </div>
    </button>
  )
}
