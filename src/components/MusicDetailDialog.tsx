import {
  useEffect,
  useRef,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from 'react'
import { MusicArtwork } from './MusicArtwork'
import type { MusicSelection } from './MusicCard'
import {
  formatArtistNames,
  formatMusicReleaseDate,
  formatMusicReleaseMention,
  formatMusicReleaseType,
  formatTrackMention,
  isMusicReleaseMentionDifferent,
  isTrackMentionDifferent,
} from './musicResultPresentation'

type MusicDetailDialogProps = {
  selection: MusicSelection | null
  onClose: () => void
}

function getDetailTitle(selection: MusicSelection | null): string | null {
  if (selection === null) {
    return null
  }

  if (selection.kind === 'track') {
    return selection.result.status === 'resolved'
      ? selection.result.track.track_title
      : selection.result.track_mention.track_title
  }

  return selection.result.status === 'resolved'
    ? selection.result.music_release.release_title
    : selection.result.music_release_mention.release_title
}

export function MusicDetailDialog({ selection, onClose }: MusicDetailDialogProps) {
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
    if (selection.kind === 'track') {
      if (selection.result.status === 'resolved') {
        const track = selection.result.track
        const mention = selection.result.track_mention
        const trackArtistCredits = formatArtistNames(track.artists.map(({ name }) => name))
        const releaseArtistCredits = formatArtistNames(
          track.preferred_music_release.artists.map(({ name }) => name),
        )
        const hasDifferentMention = isTrackMentionDifferent(mention, track)

        detailContent = (
          <div className="music-detail-grid">
            <MusicArtwork
              key={`track-${track.spotify_track_id}`}
              status="resolved"
              title={track.track_title}
              artistNames={track.artists.map(({ name }) => name)}
              coverUrl={track.cover_url}
            />
            <div className="music-detail-copy">
              <h3>{track.track_title}</h3>
              <dl className="music-detail-list">
                <div>
                  <dt>Track title</dt>
                  <dd>{track.track_title}</dd>
                </div>
                <div>
                  <dt>Track Artist Credits</dt>
                  <dd>{trackArtistCredits || 'Artist unavailable'}</dd>
                </div>
                {hasDifferentMention ? (
                  <div>
                    <dt>Mentioned as</dt>
                    <dd>{formatTrackMention(mention)}</dd>
                  </div>
                ) : null}
                <div>
                  <dt>Preferred Music Release</dt>
                  <dd>{track.preferred_music_release.release_title}</dd>
                </div>
                <div>
                  <dt>Preferred Music Release Artist Credits</dt>
                  <dd>{releaseArtistCredits || 'Artist unavailable'}</dd>
                </div>
                <div>
                  <dt>Spotify release date</dt>
                  <dd>{formatMusicReleaseDate(track.preferred_music_release.release_date)}</dd>
                </div>
                <div>
                  <dt>Music Release type</dt>
                  <dd>{formatMusicReleaseType(track.preferred_music_release.album_type)}</dd>
                </div>
                <div>
                  <dt>Spotify Track ID</dt>
                  <dd>{track.spotify_track_id}</dd>
                </div>
                <div>
                  <dt>Spotify Album ID</dt>
                  <dd>{track.preferred_music_release.spotify_album_id}</dd>
                </div>
              </dl>
              <a
                className="button secondary music-detail-link"
                href={track.spotify_url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Open ${track.track_title} on Spotify, opens in a new tab`}
              >
                Open on Spotify
              </a>
            </div>
          </div>
        )
      } else {
        const mention = selection.result.track_mention
        const interpretedArtistCredits = formatArtistNames(mention.artists)

        detailContent = (
          <div className="music-detail-grid">
            <MusicArtwork
              key={`track-${formatTrackMention(mention)}`}
              status="unresolved"
              title={mention.track_title}
              artistNames={mention.artists}
            />
            <div className="music-detail-copy">
              <h3>{mention.track_title}</h3>
              <dl className="music-detail-list">
                <div>
                  <dt>Track title</dt>
                  <dd>{mention.track_title}</dd>
                </div>
                {interpretedArtistCredits.length > 0 ? (
                  <div>
                    <dt>Artist Credits</dt>
                    <dd>{interpretedArtistCredits}</dd>
                  </div>
                ) : null}
                {mention.release_title !== null ? (
                  <div>
                    <dt>Mentioned Music Release</dt>
                    <dd>{mention.release_title}</dd>
                  </div>
                ) : null}
                {mention.release_year !== null ? (
                  <div>
                    <dt>Mentioned Music Release year</dt>
                    <dd>{mention.release_year}</dd>
                  </div>
                ) : null}
              </dl>
              <span className="music-status-badge">Unresolved</span>
              <p className="music-detail-description">
                Reelio could not verify this Track Mention against Spotify, so provider metadata and links are unavailable.
              </p>
            </div>
          </div>
        )
      }
    } else if (selection.result.status === 'resolved') {
      const musicRelease = selection.result.music_release
      const mention = selection.result.music_release_mention
      const artistCredits = formatArtistNames(musicRelease.artists.map(({ name }) => name))
      const hasDifferentMention = isMusicReleaseMentionDifferent(mention, musicRelease)

      detailContent = (
        <div className="music-detail-grid">
          <MusicArtwork
            key={`music-release-${musicRelease.spotify_album_id}`}
            status="resolved"
            title={musicRelease.release_title}
            artistNames={musicRelease.artists.map(({ name }) => name)}
            coverUrl={musicRelease.cover_url}
          />
          <div className="music-detail-copy">
            <h3>{musicRelease.release_title}</h3>
            <dl className="music-detail-list">
              <div>
                <dt>Music Release title</dt>
                <dd>{musicRelease.release_title}</dd>
              </div>
              <div>
                <dt>Artist Credits</dt>
                <dd>{artistCredits || 'Artist unavailable'}</dd>
              </div>
              {hasDifferentMention ? (
                <div>
                  <dt>Mentioned as</dt>
                  <dd>{formatMusicReleaseMention(mention)}</dd>
                </div>
              ) : null}
              <div>
                <dt>Spotify release date</dt>
                <dd>{formatMusicReleaseDate(musicRelease.release_date)}</dd>
              </div>
              <div>
                <dt>Music Release type</dt>
                <dd>{formatMusicReleaseType(musicRelease.album_type)}</dd>
              </div>
              <div>
                <dt>Spotify Album ID</dt>
                <dd>{musicRelease.spotify_album_id}</dd>
              </div>
            </dl>
            <a
              className="button secondary music-detail-link"
              href={musicRelease.spotify_url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Open ${musicRelease.release_title} on Spotify, opens in a new tab`}
            >
              Open on Spotify
            </a>
          </div>
        </div>
      )
    } else {
      const mention = selection.result.music_release_mention
      const interpretedArtistCredits = formatArtistNames(mention.artists)

      detailContent = (
        <div className="music-detail-grid">
          <MusicArtwork
            key={`music-release-${formatMusicReleaseMention(mention)}`}
            status="unresolved"
            title={mention.release_title}
            artistNames={mention.artists}
          />
          <div className="music-detail-copy">
            <h3>{mention.release_title}</h3>
            <dl className="music-detail-list">
              <div>
                <dt>Music Release title</dt>
                <dd>{mention.release_title}</dd>
              </div>
              {interpretedArtistCredits.length > 0 ? (
                <div>
                  <dt>Artist Credits</dt>
                  <dd>{interpretedArtistCredits}</dd>
                </div>
              ) : null}
              {mention.release_year !== null ? (
                <div>
                  <dt>Mentioned Music Release year</dt>
                  <dd>{mention.release_year}</dd>
                </div>
              ) : null}
            </dl>
            <span className="music-status-badge">Unresolved</span>
            <p className="music-detail-description">
              Reelio could not verify this Music Release Mention against Spotify, so provider metadata and links are unavailable.
            </p>
          </div>
        </div>
      )
    }
  }

  return (
    <dialog
      ref={dialogRef}
      id="music-detail-dialog"
      className="music-detail-dialog"
      aria-labelledby="music-detail-dialog-title"
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
    >
      {selection !== null ? (
        <>
          <div className="music-detail-dialog-header">
            <h2 id="music-detail-dialog-title">{detailTitle} details</h2>
            <button
              ref={closeButtonRef}
              className="button secondary"
              type="button"
              onClick={closeDialog}
            >
              Close details
            </button>
          </div>
          <div className="music-detail-dialog-body">{detailContent}</div>
        </>
      ) : null}
    </dialog>
  )
}
