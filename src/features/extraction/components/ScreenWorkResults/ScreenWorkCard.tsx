import type { MovieResult, TVSeriesResult } from '../../types'
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

      return (
        <button
          className="result-card screen-work-card"
          type="button"
          aria-haspopup="dialog"
          aria-controls="screen-work-detail-dialog"
          aria-label={`Open details for ${movie.title}`}
          onClick={(event) =>
            props.onOpenDetails({ kind: 'movie', result: props.result }, event.currentTarget)
          }
        >
          <ScreenWorkArtwork title={movie.title} year={movie.year} posterUrl={movie.poster_url} />
          <div className="result-card-copy screen-work-card-copy">
            <p className="result-card-title screen-work-card-title">{movie.title}</p>
            <p className="result-card-metadata screen-work-card-metadata">
              <span>{movie.year}</span>
              <span className="screen-work-score-badge">{movie.tmdb_score.toFixed(1)}</span>
            </p>
          </div>
        </button>
      )
    }

    const mention = props.result.movie_mention

    return (
      <button
        className="result-card screen-work-card"
        type="button"
        aria-haspopup="dialog"
        aria-controls="screen-work-detail-dialog"
        aria-label={`Open details for ${mention.title}`}
        onClick={(event) =>
          props.onOpenDetails({ kind: 'movie', result: props.result }, event.currentTarget)
        }
      >
        <div className="result-card-copy screen-work-card-copy">
          <p className="result-card-title screen-work-card-title">{mention.title}</p>
          <p className="result-card-metadata screen-work-card-metadata">
            <span>{mention.year}</span>
          </p>
          <span className="result-status-badge screen-work-status-badge">Not verified</span>
        </div>
      </button>
    )
  }

  if (props.result.status === 'resolved') {
    const tvSeries = props.result.tv_series

    return (
      <button
        className="result-card screen-work-card"
        type="button"
        aria-haspopup="dialog"
        aria-controls="screen-work-detail-dialog"
        aria-label={`Open details for ${tvSeries.title}`}
        onClick={(event) =>
          props.onOpenDetails({ kind: 'tv-series', result: props.result }, event.currentTarget)
        }
      >
        <ScreenWorkArtwork
          title={tvSeries.title}
          year={tvSeries.first_air_year}
          posterUrl={tvSeries.poster_url}
        />
        <div className="result-card-copy screen-work-card-copy">
          <p className="result-card-title screen-work-card-title">{tvSeries.title}</p>
          <p className="result-card-metadata screen-work-card-metadata">
            <span>{tvSeries.first_air_year}</span>
            <span className="screen-work-score-badge">{tvSeries.tmdb_score.toFixed(1)}</span>
          </p>
        </div>
      </button>
    )
  }

  const mention = props.result.tv_series_mention

  return (
    <button
      className="result-card screen-work-card"
      type="button"
      aria-haspopup="dialog"
      aria-controls="screen-work-detail-dialog"
      aria-label={`Open details for ${mention.title}`}
      onClick={(event) =>
        props.onOpenDetails({ kind: 'tv-series', result: props.result }, event.currentTarget)
      }
    >
      <div className="result-card-copy screen-work-card-copy">
        <p className="result-card-title screen-work-card-title">{mention.title}</p>
        <p className="result-card-metadata screen-work-card-metadata">
          <span>{mention.year}</span>
        </p>
        <span className="result-status-badge screen-work-status-badge">Not verified</span>
      </div>
    </button>
  )
}
