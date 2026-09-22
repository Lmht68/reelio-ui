import { useEffect, useRef } from 'react'
import type { ExtractionWorkflowState } from '../../hooks/useExtractionWorkflow'

interface ExtractionStatusProps {
  state: ExtractionWorkflowState
  onStopWaiting: () => void
  onRetry: () => void
  onAnotherSource: () => void
}

export function ExtractionStatus({
  state,
  onStopWaiting,
  onRetry,
  onAnotherSource,
}: ExtractionStatusProps) {
  const headingRef = useRef<HTMLHeadingElement>(null)
  const shouldFocusHeading =
    (state.phase === 'validation-error' && state.focusTarget === 'status') ||
    state.phase === 'stopped-waiting' ||
    state.phase === 'service-error' ||
    state.phase === 'unexpected-error' ||
    state.phase === 'empty'

  useEffect(() => {
    if (shouldFocusHeading) {
      headingRef.current?.focus()
    }
  }, [shouldFocusHeading, state.phase])

  if (state.phase === 'ready' || state.phase === 'completed') {
    return null
  }

  if (state.phase === 'validation-error') {
    if (state.focusTarget === 'url') {
      return null
    }

    return (
      <section className="state-panel error" aria-labelledby="invalid-request-title">
        <h2 id="invalid-request-title" ref={headingRef} tabIndex={-1}>
          Check your submission
        </h2>
      </section>
    )
  }

  if (state.phase === 'pending') {
    return (
      <section className="waiting-panel state-panel" role="status" aria-live="polite" aria-labelledby="waiting-title">
        <div className="waiting-head">
          <h2 id="waiting-title">Checking this video...</h2>
          <button className="button quiet" type="button" onClick={onStopWaiting}>
            Cancel
          </button>
        </div>
        <div className="pending-placeholder-grid" aria-hidden="true">
          {Array.from({ length: 4 }, (_, index) => (
            <div className="pending-placeholder" key={index}></div>
          ))}
        </div>
      </section>
    )
  }

  if (state.phase === 'empty') {
    return (
      <section className="state-panel empty" aria-labelledby="empty-results-title">
        <h2 id="empty-results-title" ref={headingRef} tabIndex={-1}>
          No results found
        </h2>
        <p>This video did not produce any results.</p>
      </section>
    )
  }

  if (state.phase === 'stopped-waiting') {
    return (
      <section className="state-panel" aria-labelledby="stopped-waiting-title">
        <h2 id="stopped-waiting-title" ref={headingRef} tabIndex={-1}>
          {state.title}
        </h2>
        <p>{state.message}</p>
        <div className="state-actions">
          <button className="button primary" type="button" onClick={onRetry}>
            Try again
          </button>
        </div>
      </section>
    )
  }

  return (
    <section className="state-panel error" aria-labelledby="recovery-error-title">
      <h2 id="recovery-error-title" ref={headingRef} tabIndex={-1}>
        {state.title}
      </h2>
      <p>{state.message}</p>
      <div className="state-actions">
        <button className="button primary" type="button" onClick={onRetry}>
          Try again
        </button>
        <button className="button secondary" type="button" onClick={onAnotherSource}>
          Choose another video
        </button>
      </div>
    </section>
  )
}
