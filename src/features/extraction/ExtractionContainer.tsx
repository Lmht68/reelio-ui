import { useEffect, useRef } from 'react'
import { BookWorkResults } from './components/BookWorkResults'
import { ExtractionForm } from './components/ExtractionForm'
import { ExtractionStatus } from './components/ExtractionStatus'
import { MusicResults } from './components/MusicResults'
import { ScreenWorkResults } from './components/ScreenWorkResults'
import { SourceContext } from './components/SourceContext'
import { EFFECTIVE_MARKETS } from './constants/markets'
import { useExtractionWorkflow } from './hooks/useExtractionWorkflow'

export function ExtractionContainer() {
  const {
    state,
    setUrl,
    setMarket,
    submit,
    stopWaiting,
    retry,
    startAnotherSource,
  } = useExtractionWorkflow()
  const resultsRef = useRef<HTMLElement>(null)
  const hasCompletedResponse = state.phase === 'empty' || state.phase === 'completed'

  useEffect(() => {
    if (state.phase === 'completed') {
      resultsRef.current?.focus()
    }
  }, [state.phase])

  if (hasCompletedResponse) {
    return (
      <div className="completed-shell">
        <SourceContext
          source={state.response.source}
          transcript={state.response.transcript}
          effectiveMarket={state.response.market}
          onAnotherSource={startAnotherSource}
        />
        {state.phase === 'empty' ? (
          <ExtractionStatus
            state={state}
            onStopWaiting={stopWaiting}
            onRetry={retry}
            onAnotherSource={startAnotherSource}
          />
        ) : (
          <>
            <p className="sr-only" role="status" aria-live="polite">
              Results ready
            </p>
            <section className="completed-panel" aria-label="Results" ref={resultsRef} tabIndex={-1}>
              <ScreenWorkResults
                movies={state.response.results.movies}
                tvSeries={state.response.results.tv_series}
              />
              <MusicResults
                tracks={state.response.results.tracks}
                musicReleases={state.response.results.music_releases}
              />
              <BookWorkResults books={state.response.results.books} />
            </section>
          </>
        )}
      </div>
    )
  }

  return (
    <section className="entry-centered" aria-label="Discover from a video">
      <div className="entry-centered-inner surface">
        <ExtractionForm
          url={state.url}
          market={state.market}
          marketOptions={EFFECTIVE_MARKETS}
          disabled={state.phase === 'pending'}
          validationMessage={state.phase === 'validation-error' ? state.message : undefined}
          onUrlChange={setUrl}
          onMarketChange={setMarket}
          onSubmit={submit}
        />
        <ExtractionStatus
          state={state}
          onStopWaiting={stopWaiting}
          onRetry={retry}
          onAnotherSource={startAnotherSource}
        />
      </div>
    </section>
  )
}
