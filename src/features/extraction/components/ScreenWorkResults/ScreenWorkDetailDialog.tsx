import {
  useEffect,
  useRef,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from 'react'
import { ScreenWorkArtwork } from './ScreenWorkArtwork'
import type { ScreenWorkSelection } from './ScreenWorkCard'

type ScreenWorkDetailDialogProps = {
  selection: ScreenWorkSelection | null
  onClose: () => void
}

export function ScreenWorkDetailDialog({ selection, onClose }: ScreenWorkDetailDialogProps) {
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

  const detailTitle =
    selection === null
      ? null
      : selection.kind === 'movie'
        ? selection.result.status === 'resolved'
          ? selection.result.movie.title
          : selection.result.movie_mention.title
        : selection.result.status === 'resolved'
          ? selection.result.tv_series.title
          : selection.result.tv_series_mention.title

  let detailContent: ReactNode = null

  if (selection !== null) {
    if (selection.kind === 'movie') {
      if (selection.result.status === 'resolved') {
        const movie = selection.result.movie
        const mention = selection.result.movie_mention
        const description = movie.description.trim()
        const isInterpretedIdentityDifferent =
          movie.title !== mention.title || movie.year !== mention.year

        detailContent = (
          <div className="screen-work-detail-grid">
            <ScreenWorkArtwork
              key={`movie-${movie.tmdb_id}`}
              title={movie.title}
              year={movie.year}
              posterUrl={movie.poster_url}
            />
            <div className="screen-work-detail-copy">
              <h3>{movie.title}</h3>
              <dl className="screen-work-detail-list">
                <div>
                  <dt>Year</dt>
                  <dd>{movie.year}</dd>
                </div>
                <div>
                  <dt>Score</dt>
                  <dd>{movie.tmdb_score.toFixed(1)}</dd>
                </div>
                {isInterpretedIdentityDifferent ? (
                  <div>
                    <dt>Interpreted as</dt>
                    <dd>
                      {mention.title} ({mention.year})
                    </dd>
                  </div>
                ) : null}
                {movie.directors.length > 0 ? (
                  <div>
                    <dt>Directors</dt>
                    <dd>{movie.directors.join(', ')}</dd>
                  </div>
                ) : null}
                {movie.cast.length > 0 ? (
                  <div>
                    <dt>Cast</dt>
                    <dd>{movie.cast.join(', ')}</dd>
                  </div>
                ) : null}
              </dl>
              {description.length > 0 ? (
                <p className="screen-work-detail-description">{description}</p>
              ) : null}
              <a
                className="screen-work-detail-link"
                href={movie.tmdb_url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Open ${movie.title} on TMDB, opens in a new tab`}
              >
                Open on TMDB
              </a>
            </div>
          </div>
        )
      } else {
        const mention = selection.result.movie_mention

        detailContent = (
          <div className="screen-work-detail-copy screen-work-detail-copy-unverified">
            <h3>{mention.title}</h3>
            <p className="screen-work-detail-year">{mention.year}</p>
            <span className="result-status-badge screen-work-status-badge">Not verified</span>
            <p className="screen-work-detail-description">
              We could not verify this movie from the video, so confirmed details are unavailable.
            </p>
          </div>
        )
      }
    } else if (selection.result.status === 'resolved') {
      const tvSeries = selection.result.tv_series
      const mention = selection.result.tv_series_mention
      const description = tvSeries.description.trim()
      const isInterpretedIdentityDifferent =
        tvSeries.title !== mention.title || tvSeries.first_air_year !== mention.year

      detailContent = (
        <div className="screen-work-detail-grid">
          <ScreenWorkArtwork
            key={`tv-series-${tvSeries.tmdb_id}`}
            title={tvSeries.title}
            year={tvSeries.first_air_year}
            posterUrl={tvSeries.poster_url}
          />
          <div className="screen-work-detail-copy">
            <h3>{tvSeries.title}</h3>
            <dl className="screen-work-detail-list">
              <div>
                <dt>First aired</dt>
                <dd>{tvSeries.first_air_year}</dd>
              </div>
              <div>
                <dt>Last aired</dt>
                <dd>{tvSeries.last_air_year ?? 'Not available'}</dd>
              </div>
              <div>
                <dt>Score</dt>
                <dd>{tvSeries.tmdb_score.toFixed(1)}</dd>
              </div>
              {isInterpretedIdentityDifferent ? (
                <div>
                  <dt>Interpreted as</dt>
                  <dd>
                    {mention.title} ({mention.year})
                  </dd>
                </div>
              ) : null}
              {tvSeries.creators.length > 0 ? (
                <div>
                  <dt>Creators</dt>
                  <dd>{tvSeries.creators.join(', ')}</dd>
                </div>
              ) : null}
              {tvSeries.cast.length > 0 ? (
                <div>
                  <dt>Cast</dt>
                  <dd>{tvSeries.cast.join(', ')}</dd>
                </div>
              ) : null}
            </dl>
            {description.length > 0 ? (
              <p className="screen-work-detail-description">{description}</p>
            ) : null}
            <a
              className="screen-work-detail-link"
              href={tvSeries.tmdb_url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Open ${tvSeries.title} on TMDB, opens in a new tab`}
            >
              Open on TMDB
            </a>
          </div>
        </div>
      )
    } else {
      const mention = selection.result.tv_series_mention

      detailContent = (
        <div className="screen-work-detail-copy screen-work-detail-copy-unverified">
          <h3>{mention.title}</h3>
          <p className="screen-work-detail-year">{mention.year}</p>
          <span className="result-status-badge screen-work-status-badge">Not verified</span>
          <p className="screen-work-detail-description">
            We could not verify this TV Series from the video, so confirmed details are unavailable.
          </p>
        </div>
      )
    }
  }

  return (
    <dialog
      ref={dialogRef}
      id="screen-work-detail-dialog"
      className="screen-work-detail-dialog"
      aria-labelledby="screen-work-detail-dialog-title"
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
    >
      {selection !== null ? (
        <>
          <div className="screen-work-detail-dialog-header">
            <h2 id="screen-work-detail-dialog-title">{detailTitle} details</h2>
            <button
              ref={closeButtonRef}
              className="button secondary"
              type="button"
              onClick={closeDialog}
            >
              Close details
            </button>
          </div>
          <div className="screen-work-detail-dialog-body">{detailContent}</div>
        </>
      ) : null}
    </dialog>
  )
}
