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
      <div className="form-heading">
        <h1>Discover movies, music &amp; more</h1>
        <p className="form-intro">
          Find the movies, shows, songs, and books hiding in your favorite videos
        </p>
      </div>
      <div className="source-field">
        <label htmlFor="public-video-link">Public video link</label>
        <div className="source-action-row">
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
          <button className="button primary" type="submit" disabled={disabled}>
            Discover
          </button>
        </div>
        <p id="public-video-link-help" className="field-help">
          YouTube, Instagram, Facebook, TikTok, and X public video links are supported.
        </p>
        {validationMessage !== undefined && (
          <p id="public-video-link-error" className="field-error" role="status" aria-live="polite">
            {validationMessage}
          </p>
        )}
      </div>
      <details className="advanced-options">
        <summary>
          <span>Advanced options</span>
          <svg
            className="disclosure-chevron"
            viewBox="0 0 20 20"
            aria-hidden="true"
            focusable="false"
          >
            <path d="m5.5 7.5 4.5 4.5 4.5-4.5" />
          </svg>
        </summary>
        <div className="advanced-options-content">
          <label htmlFor="effective-market">Region</label>
          <div className="region-select">
            <select
              id="effective-market"
              name="effective-market"
              value={market}
              disabled={disabled}
              aria-describedby="region-help"
              onChange={(event) => onMarketChange(event.target.value as EffectiveMarketCode)}
            >
              {marketOptions.map((option) => (
                <option key={option.code} value={option.code}>
                  {option.name}
                </option>
              ))}
            </select>
            <svg
              className="select-chevron"
              viewBox="0 0 20 20"
              aria-hidden="true"
              focusable="false"
            >
              <path d="m5.5 7.5 4.5 4.5 4.5-4.5" />
            </svg>
          </div>
          <p id="region-help" className="field-help">
            Optional. Affects availability; defaults to United States.
          </p>
        </div>
      </details>
    </form>
  )
}
