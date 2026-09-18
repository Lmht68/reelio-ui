import { useEffect, useRef } from 'react'
import { ExtractionForm } from './components/ExtractionForm'
import { ExtractionStatus } from './components/ExtractionStatus'
import { SourceContext } from './components/SourceContext'
import { EFFECTIVE_MARKETS } from './extraction/markets'
import { useExtractionWorkflow } from './extraction/workflow'
import './App.css'

function App() {
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

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to main content
      </a>
      <header className="site-header">
        <a className="brand" href="#main">
          Reelio
        </a>
      </header>
      <main id="main" tabIndex={-1}>
        {hasCompletedResponse ? (
          <div className="completed-shell">
            <SourceContext
              source={state.response.source}
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
              <section className="completed-panel state-panel" aria-labelledby="extraction-completed-heading">
                <h2 id="extraction-completed-heading" ref={completedHeadingRef} tabIndex={-1}>
                  Extraction complete
                </h2>
              </section>
            )}
          </div>
        ) : (
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
        )}
      </main>
    </>
  )
}

export default App
