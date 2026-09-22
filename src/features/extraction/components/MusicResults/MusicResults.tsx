import { useRef, useState } from 'react'
import type { MusicReleaseResult, TrackResult } from '../../types'
import { MusicCard, type MusicSelection } from './MusicCard'
import { MusicDetailDialog } from './MusicDetailDialog'

type MusicResultsProps = {
  tracks: Array<TrackResult>
  musicReleases: Array<MusicReleaseResult>
}

function getTrackResultKey(result: TrackResult): string {
  if (result.status === 'resolved') {
    return `track-${result.track.spotify_track_id}`
  }

  const mention = result.track_mention
  return `track-${JSON.stringify([
    mention.track_title,
    mention.artists,
    mention.release_title,
    mention.release_year,
  ])}`
}

function getMusicReleaseResultKey(result: MusicReleaseResult): string {
  if (result.status === 'resolved') {
    return `music-release-${result.music_release.spotify_album_id}`
  }

  const mention = result.music_release_mention
  return `music-release-${JSON.stringify([
    mention.release_title,
    mention.artists,
    mention.release_year,
  ])}`
}

export function MusicResults({ tracks, musicReleases }: MusicResultsProps) {
  const [selectedMusic, setSelectedMusic] = useState<MusicSelection | null>(null)
  const lastDetailTriggerRef = useRef<HTMLButtonElement | null>(null)

  if (tracks.length === 0 && musicReleases.length === 0) {
    return null
  }

  function handleOpenDetails(selection: MusicSelection, trigger: HTMLButtonElement) {
    lastDetailTriggerRef.current = trigger
    setSelectedMusic(selection)
  }

  function handleDetailClose() {
    setSelectedMusic(null)
    lastDetailTriggerRef.current?.focus()
  }

  return (
    <div className="music-results">
      {tracks.length > 0 ? (
        <section className="music-results-section" aria-labelledby="tracks-heading">
          <h2 id="tracks-heading">Tracks</h2>
          <ul className="music-grid">
            {tracks.map((result) => (
              <li key={getTrackResultKey(result)}>
                <MusicCard kind="track" result={result} onOpenDetails={handleOpenDetails} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {musicReleases.length > 0 ? (
        <section className="music-results-section" aria-labelledby="music-releases-heading">
          <h2 id="music-releases-heading">Music Releases</h2>
          <ul className="music-grid">
            {musicReleases.map((result) => (
              <li key={getMusicReleaseResultKey(result)}>
                <MusicCard kind="music-release" result={result} onOpenDetails={handleOpenDetails} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <MusicDetailDialog selection={selectedMusic} onClose={handleDetailClose} />
    </div>
  )
}
