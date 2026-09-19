import type { MovieResult, TVSeriesResult } from '../extraction/types'
import { ScreenWorkArtwork } from './ScreenWorkArtwork'

export type ScreenWorkSelection =
  | { kind: 'movie'; result: MovieResult }
  | { kind: 'tv-series'; result: TVSeriesResult }

type ScreenWorkCardProps = ScreenWorkSelection & {
  onOpenDetails: (selection: ScreenWorkSelection, trigger: HTMLButtonElement) => void
}

export function ScreenWorkCard(props: ScreenWorkCardProps) {
  if (props.kind === 'movie') {
    if (props.result.status === 'resolved') {
      const movie = props.result.movie
      const mention = props.result.movie_mention
      const isMentionDifferent = movie.title !== mention.title || movie.year !== mention.year

      return (
        <button
          className="screen-work-card"
          type="button"
          aria-haspopup="dialog"
          aria-controls="screen-work-detail-dialog"
          aria-label={`Open details for ${movie.title}`}
          onClick={(event) =>
            props.onOpenDetails({ kind: 'movie', result: props.result }, event.currentTarget)
          }
        >
          <ScreenWorkArtwork
            status="resolved"
            title={movie.title}
            year={movie.year}
            posterUrl={movie.poster_url}
          />
          <div className="screen-work-card-copy">
            <p className="screen-work-card-title">{movie.title}</p>
            <p className="screen-work-card-metadata">
              <span>{movie.year}</span>
              <span>TMDB {movie.tmdb_score.toFixed(1)}</span>
            </p>
            {isMentionDifferent ? (
              <p className="screen-work-card-mention">
                Mentioned as {mention.title} ({mention.year})
              </p>
            ) : null}
          </div>
        </button>
      )
    }

    const mention = props.result.movie_mention

    return (
      <button
        className="screen-work-card"
        type="button"
        aria-haspopup="dialog"
        aria-controls="screen-work-detail-dialog"
        aria-label={`Open details for ${mention.title}`}
        onClick={(event) =>
          props.onOpenDetails({ kind: 'movie', result: props.result }, event.currentTarget)
        }
      >
        <ScreenWorkArtwork status="unresolved" title={mention.title} year={mention.year} />
        <div className="screen-work-card-copy">
          <p className="screen-work-card-title">{mention.title}</p>
          <p className="screen-work-card-metadata">
            <span>{mention.year}</span>
          </p>
          <span className="screen-work-status-badge">Unresolved</span>
        </div>
      </button>
    )
  }

  if (props.result.status === 'resolved') {
    const tvSeries = props.result.tv_series
    const mention = props.result.tv_series_mention
    const isMentionDifferent =
      tvSeries.title !== mention.title || tvSeries.first_air_year !== mention.year

    return (
      <button
        className="screen-work-card"
        type="button"
        aria-haspopup="dialog"
        aria-controls="screen-work-detail-dialog"
        aria-label={`Open details for ${tvSeries.title}`}
        onClick={(event) =>
          props.onOpenDetails({ kind: 'tv-series', result: props.result }, event.currentTarget)
        }
      >
        <ScreenWorkArtwork
          status="resolved"
          title={tvSeries.title}
          year={tvSeries.first_air_year}
          posterUrl={tvSeries.poster_url}
        />
        <div className="screen-work-card-copy">
          <p className="screen-work-card-title">{tvSeries.title}</p>
          <p className="screen-work-card-metadata">
            <span>{tvSeries.first_air_year}</span>
            <span>TMDB {tvSeries.tmdb_score.toFixed(1)}</span>
          </p>
          {isMentionDifferent ? (
            <p className="screen-work-card-mention">
              Mentioned as {mention.title} ({mention.year})
            </p>
          ) : null}
        </div>
      </button>
    )
  }

  const mention = props.result.tv_series_mention

  return (
    <button
      className="screen-work-card"
      type="button"
      aria-haspopup="dialog"
      aria-controls="screen-work-detail-dialog"
      aria-label={`Open details for ${mention.title}`}
      onClick={(event) =>
        props.onOpenDetails({ kind: 'tv-series', result: props.result }, event.currentTarget)
      }
    >
      <ScreenWorkArtwork status="unresolved" title={mention.title} year={mention.year} />
      <div className="screen-work-card-copy">
        <p className="screen-work-card-title">{mention.title}</p>
        <p className="screen-work-card-metadata">
          <span>{mention.year}</span>
        </p>
        <span className="screen-work-status-badge">Unresolved</span>
      </div>
    </button>
  )
}
