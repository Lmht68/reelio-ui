import { TranscriptDialog } from './TranscriptDialog'
import { getMarketName } from '../../constants/markets'
import type { Platform, Source, Transcript } from '../../types'

interface SourceContextProps {
  source: Source
  transcript: Transcript
  effectiveMarket: string
  onAnotherSource: () => void
}

const platformNames: Record<Platform, string> = {
  youtube: 'YouTube',
  instagram: 'Instagram',
  facebook: 'Facebook',
  tiktok: 'TikTok',
  x: 'X',
}

function formatDuration(durationSeconds: number): string {
  const totalSeconds = Math.max(0, Math.floor(durationSeconds))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const parts: string[] = []

  if (hours > 0) {
    parts.push(`${hours} hr`)
  }
  if (minutes > 0) {
    parts.push(`${minutes} min`)
  }
  if (seconds > 0 || parts.length === 0) {
    parts.push(`${seconds} sec`)
  }

  return parts.join(' ')
}

export function SourceContext({ source, transcript, effectiveMarket, onAnotherSource }: SourceContextProps) {
  const platformName = platformNames[source.platform]
  const sourceTitle = source.title || `${platformName} video`
  const effectiveMarketName = getMarketName(effectiveMarket) ?? effectiveMarket

  return (
    <section className="source-context surface" aria-label="Video">
      <div className="source-context-main">
        <p className="eyebrow">Video</p>
        <a
          className="source-context-title"
          href={source.url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${sourceTitle} on ${platformName}, opens in a new tab`}
        >
          {sourceTitle}
        </a>
        <p className="source-context-meta">
          {platformName} · {source.channel || 'Channel unavailable'} · {formatDuration(source.duration_seconds)}
        </p>
        <p className="source-context-market">Region: {effectiveMarketName}</p>
      </div>
      <div className="source-context-actions">
        <TranscriptDialog transcript={transcript} />
        <button className="button secondary" type="button" onClick={onAnotherSource}>
          Check another video
        </button>
      </div>
    </section>
  )
}
