import type { ExtractionResponse, Source } from '../../extraction/types'

interface EmptyResponseOptions {
  market?: string
  source?: Partial<Source>
}

export function createEmptyExtractionResponse(
  options: EmptyResponseOptions = {},
): ExtractionResponse {
  return {
    market: options.market ?? 'US',
    source: {
      platform: 'youtube',
      video_id: 'dQw4w9WgXcQ',
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      title: 'Canonical Source title',
      description: 'Canonical Source description',
      channel: 'Canonical channel',
      duration_seconds: 43,
      ...options.source,
    },
    transcript: {
      text: 'Transcript text.',
      language: 'en',
      method: 'youtube_captions',
    },
    statistics: {
      movies: { n_mentions: 0, n_resolved: 0, n_unresolved: 0 },
      tv_series: { n_mentions: 0, n_resolved: 0, n_unresolved: 0 },
      tracks: { n_mentions: 0, n_resolved: 0, n_unresolved: 0 },
      music_releases: { n_mentions: 0, n_resolved: 0, n_unresolved: 0 },
      books: { n_mentions: 0, n_resolved: 0, n_unresolved: 0 },
    },
    results: {
      movies: [],
      tv_series: [],
      tracks: [],
      music_releases: [],
      books: [],
    },
  }
}

export function createNonEmptyExtractionResponse(): ExtractionResponse {
  const response = createEmptyExtractionResponse()
  return {
    ...response,
    statistics: {
      ...response.statistics,
      movies: { n_mentions: 1, n_resolved: 0, n_unresolved: 1 },
    },
    results: {
      ...response.results,
      movies: [
        {
          status: 'unresolved',
          movie_mention: { title: 'Unrendered Movie', year: 2021 },
          movie: null,
        },
      ],
    },
  }
}

export function extractionErrorEnvelope(code: string, message = 'Sensitive backend detail.') {
  return { error: { code, message } }
}
