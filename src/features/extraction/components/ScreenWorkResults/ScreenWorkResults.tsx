import { useRef, useState } from 'react'
import type { MovieResult, TVSeriesResult } from '../../types'
import { ScreenWorkCard, type ScreenWorkSelection } from './ScreenWorkCard'
import { ScreenWorkDetailDialog } from './ScreenWorkDetailDialog'

type ScreenWorkResultsProps = {
  movies: Array<MovieResult>
  tvSeries: Array<TVSeriesResult>
}


export function ScreenWorkResults({ movies, tvSeries }: ScreenWorkResultsProps) {
  const [selectedScreenWork, setSelectedScreenWork] = useState<ScreenWorkSelection | null>(null)
  const lastDetailTriggerRef = useRef<HTMLButtonElement | null>(null)

  if (movies.length === 0 && tvSeries.length === 0) {
    return null
  }

  function handleOpenDetails(selection: ScreenWorkSelection, trigger: HTMLButtonElement) {
    lastDetailTriggerRef.current = trigger
    setSelectedScreenWork(selection)
  }

  function handleDetailClose() {
    setSelectedScreenWork(null)
    lastDetailTriggerRef.current?.focus()
  }

  return (
    <div className="result-collection screen-work-results">
      {movies.length > 0 ? (
        <section className="result-category screen-work-results-section" aria-labelledby="movies-heading">
          <h2 id="movies-heading">Movies</h2>
          <ul className="result-grid screen-work-grid">
            {movies.map((result) => (
              <li
                key={
                  result.status === 'resolved'
                    ? `movie-${result.movie.tmdb_id}`
                    : `movie-${result.movie_mention.title}-${result.movie_mention.year}`
                }
              >
                <ScreenWorkCard
                  kind="movie"
                  result={result}
                  onOpenDetails={handleOpenDetails}
                />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {tvSeries.length > 0 ? (
        <section className="result-category screen-work-results-section" aria-labelledby="tv-series-heading">
          <h2 id="tv-series-heading">TV Series</h2>
          <ul className="result-grid screen-work-grid">
            {tvSeries.map((result) => (
              <li
                key={
                  result.status === 'resolved'
                    ? `tv-series-${result.tv_series.tmdb_id}`
                    : `tv-series-${result.tv_series_mention.title}-${result.tv_series_mention.year}`
                }
              >
                <ScreenWorkCard
                  kind="tv-series"
                  result={result}
                  onOpenDetails={handleOpenDetails}
                />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <ScreenWorkDetailDialog selection={selectedScreenWork} onClose={handleDetailClose} />
    </div>
  )
}
