import type { ExtractionResponse, Source, Transcript } from '../../extraction/types'

interface ExtractionResponseOptions {
  market?: string
  source?: Partial<Source>
  transcript?: Partial<Transcript>
}

export function createEmptyExtractionResponse(
  options: ExtractionResponseOptions = {},
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
      ...options.transcript,
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

export function createScreenWorkExtractionResponse(
  options: ExtractionResponseOptions = {},
): ExtractionResponse {
  const response = createEmptyExtractionResponse(options)
  return {
    ...response,
    statistics: {
      ...response.statistics,
      movies: { n_mentions: 2, n_resolved: 1, n_unresolved: 1 },
      tv_series: { n_mentions: 2, n_resolved: 1, n_unresolved: 1 },
    },
    results: {
      ...response.results,
      movies: [
        {
          status: 'resolved',
          movie_mention: { title: 'Amélie', year: 2001 },
          movie: {
            title: "Le Fabuleux Destin d'Amélie Poulain",
            year: 2000,
            cast: ['Audrey Tautou', 'Mathieu Kassovitz', 'Rufus', 'Lorella Cravotta', 'Serge Merlin'],
            directors: ['Jean-Pierre Jeunet'],
            description: 'A Parisian woman quietly improves the lives around her.',
            poster_url: null,
            tmdb_id: 2,
            tmdb_url: 'https://www.themoviedb.org/movie/2',
            imdb_id: 'tt0211915',
            imdb_url: 'https://www.imdb.com/title/tt0211915/',
            tmdb_score: 7.9,
          },
        },
        {
          status: 'unresolved',
          movie_mention: { title: 'Unknown Movie', year: 2024 },
          movie: null,
        },
      ],
      tv_series: [
        {
          status: 'resolved',
          tv_series_mention: { title: 'The Last of Us', year: 2023 },
          tv_series: {
            title: 'The Last of Us',
            first_air_year: 2023,
            last_air_year: null,
            cast: ['Pedro Pascal', 'Bella Ramsey'],
            creators: ['Craig Mazin', 'Neil Druckmann'],
            description: 'A smuggler escorts a teenager across a ruined America.',
            poster_url: 'https://image.tmdb.org/t/p/w500/the-last-of-us.jpg',
            tmdb_id: 100088,
            tmdb_url: 'https://www.themoviedb.org/tv/100088',
            imdb_id: 'tt3581920',
            imdb_url: 'https://www.imdb.com/title/tt3581920/',
            tmdb_score: 8.6,
          },
        },
        {
          status: 'unresolved',
          tv_series_mention: { title: 'Unknown TV Series', year: 2024 },
          tv_series: null,
        },
      ],
    },
  }
}

export function extractionErrorEnvelope(code: string, message = 'Sensitive backend detail.') {
  return { error: { code, message } }
}
