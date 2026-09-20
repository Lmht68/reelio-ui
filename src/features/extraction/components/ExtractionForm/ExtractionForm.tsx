import { useEffect, useRef } from 'react'
import type { EffectiveMarket, EffectiveMarketCode } from '../../constants/markets'

interface ExtractionFormProps {
  url: string
  market: EffectiveMarketCode
  marketOptions: readonly EffectiveMarket[]
  disabled: boolean
  validationMessage: string | undefined
  onUrlChange: (url: string) => void
  onMarketChange: (market: EffectiveMarketCode) => void
  onSubmit: () => void
}

export function ExtractionForm({
  url,
  market,
  marketOptions,
  disabled,
  validationMessage,
  onUrlChange,
  onMarketChange,
  onSubmit,
}: ExtractionFormProps) {
  const urlInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (validationMessage !== undefined || (url.length === 0 && !disabled)) {
      urlInputRef.current?.focus()
    }
  }, [disabled, url, validationMessage])

  const describedBy = validationMessage === undefined ? 'public-video-link-help' : 'public-video-link-error'

  return (
    <form
      className="source-form"
      noValidate
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit()
      }}
    >
      <h1>Find the works behind a public video</h1>
      <div className="source-field">
        <label htmlFor="public-video-link">Public video link</label>
        <input
          ref={urlInputRef}
          id="public-video-link"
          name="public-video-link"
          type="url"
          inputMode="url"
          autoComplete="url"
          maxLength={2048}
          required
          value={url}
          disabled={disabled}
          aria-invalid={validationMessage === undefined ? undefined : true}
          aria-describedby={describedBy}
          onChange={(event) => onUrlChange(event.target.value)}
        />
        <p id="public-video-link-help" className="field-help">
          YouTube, Instagram, Facebook, TikTok, and X public video links are supported.
        </p>
        {validationMessage !== undefined && (
          <p id="public-video-link-error" className="field-error" role="status" aria-live="polite">
            {validationMessage}
          </p>
        )}
      </div>
      <button className="button primary" type="submit" disabled={disabled}>
        Find works
      </button>
      <details className="advanced-options">
        <summary>Advanced options</summary>
        <div className="advanced-options-content">
          <label htmlFor="effective-market">Effective Market</label>
          <select
            id="effective-market"
            name="effective-market"
            value={market}
            disabled={disabled}
            aria-describedby="effective-market-help"
            onChange={(event) => onMarketChange(event.target.value as EffectiveMarketCode)}
          >
            {marketOptions.map((option) => (
              <option key={option.code} value={option.code}>
                {option.name}
              </option>
            ))}
          </select>
          <p id="effective-market-help" className="field-help">
            Optional. Used for provider availability; defaults to United States.
          </p>
        </div>
      </details>
    </form>
  )
}
