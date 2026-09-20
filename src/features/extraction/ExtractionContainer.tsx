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
  const completedHeadingRef = useRef<HTMLHeadingElement>(null)
  const hasCompletedResponse = state.phase === 'empty' || state.phase === 'completed'

  useEffect(() => {
    if (state.phase === 'completed') {
      completedHeadingRef.current?.focus()
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
          <section className="completed-panel" aria-labelledby="extraction-completed-heading">
            <h2 id="extraction-completed-heading" ref={completedHeadingRef} tabIndex={-1}>
              Extraction complete
            </h2>
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
        )}
      </div>
    )
  }

  return (
    <section className="entry-centered" aria-label="Run a Source Extraction">
      <div className="entry-centered-inner surface">
        <p className="eyebrow">Reelio</p>
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
