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
  formatMusicReleaseMention,
  formatTrackMention,
  getAvailableMusicText,
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
        const artistCredits = formatArtistNames(track.artists.map(({ name }) => name))
        const albumTitle = getAvailableMusicText(track.preferred_music_release.release_title)
        const releaseDate = getAvailableMusicText(track.preferred_music_release.release_date)
        const hasDifferentMention = isTrackMentionDifferent(mention, track)

        detailContent = (
          <div className="music-detail-grid">
            <MusicArtwork
              key={`track-${track.spotify_track_id}`}
              title={track.track_title}
              artistNames={track.artists.map(({ name }) => name)}
              coverUrl={track.cover_url}
            />
            <div className="music-detail-copy">
              <h3>{track.track_title}</h3>
              <dl className="music-detail-list">
                <div>
                  <dt>Song title</dt>
                  <dd>{track.track_title}</dd>
                </div>
                <div>
                  <dt>Artist</dt>
                  <dd>{artistCredits || 'Artist unavailable'}</dd>
                </div>
                {hasDifferentMention ? (
                  <div>
                    <dt>Interpreted as</dt>
                    <dd>{formatTrackMention(mention)}</dd>
                  </div>
                ) : null}
                {albumTitle !== null ? (
                  <div>
                    <dt>Album</dt>
                    <dd>{albumTitle}</dd>
                  </div>
                ) : null}
                {releaseDate !== null ? (
                  <div>
                    <dt>Released</dt>
                    <dd>{releaseDate}</dd>
                  </div>
                ) : null}
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
        const artistCredits = formatArtistNames(mention.artists)
        const albumTitle =
          mention.release_title === null ? null : getAvailableMusicText(mention.release_title)

        detailContent = (
          <div className="music-detail-copy">
            <h3>{mention.track_title}</h3>
            <dl className="music-detail-list">
              <div>
                <dt>Song title</dt>
                <dd>{mention.track_title}</dd>
              </div>
              {artistCredits.length > 0 ? (
                <div>
                  <dt>Artist</dt>
                  <dd>{artistCredits}</dd>
                </div>
              ) : null}
              {albumTitle !== null ? (
                <div>
                  <dt>Album</dt>
                  <dd>{albumTitle}</dd>
                </div>
              ) : null}
              {mention.release_year !== null ? (
                <div>
                  <dt>Released</dt>
                  <dd>{mention.release_year}</dd>
                </div>
              ) : null}
            </dl>
            <span className="result-status-badge">Not verified</span>
            <p className="music-detail-description">
              We could not verify this song from the video, so confirmed details are unavailable.
            </p>
          </div>
        )
      }
    } else if (selection.result.status === 'resolved') {
      const musicRelease = selection.result.music_release
      const mention = selection.result.music_release_mention
      const artistCredits = formatArtistNames(musicRelease.artists.map(({ name }) => name))
      const releaseDate = getAvailableMusicText(musicRelease.release_date)
      const hasDifferentMention = isMusicReleaseMentionDifferent(mention, musicRelease)

      detailContent = (
        <div className="music-detail-grid">
          <MusicArtwork
            key={`music-release-${musicRelease.spotify_album_id}`}
            title={musicRelease.release_title}
            artistNames={musicRelease.artists.map(({ name }) => name)}
            coverUrl={musicRelease.cover_url}
          />
          <div className="music-detail-copy">
            <h3>{musicRelease.release_title}</h3>
            <dl className="music-detail-list">
              <div>
                <dt>Album</dt>
                <dd>{musicRelease.release_title}</dd>
              </div>
              <div>
                <dt>Artist</dt>
                <dd>{artistCredits || 'Artist unavailable'}</dd>
              </div>
              {hasDifferentMention ? (
                <div>
                  <dt>Interpreted as</dt>
                  <dd>{formatMusicReleaseMention(mention)}</dd>
                </div>
              ) : null}
              {releaseDate !== null ? (
                <div>
                  <dt>Released</dt>
                  <dd>{releaseDate}</dd>
                </div>
              ) : null}
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
      const artistCredits = formatArtistNames(mention.artists)

      detailContent = (
        <div className="music-detail-copy">
          <h3>{mention.release_title}</h3>
          <dl className="music-detail-list">
            <div>
              <dt>Album</dt>
              <dd>{mention.release_title}</dd>
            </div>
            {artistCredits.length > 0 ? (
              <div>
                <dt>Artist</dt>
                <dd>{artistCredits}</dd>
              </div>
            ) : null}
            {mention.release_year !== null ? (
              <div>
                <dt>Released</dt>
                <dd>{mention.release_year}</dd>
              </div>
            ) : null}
          </dl>
          <span className="result-status-badge">Not verified</span>
          <p className="music-detail-description">
            We could not verify this album from the video, so confirmed details are unavailable.
          </p>
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
