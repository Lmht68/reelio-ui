export type Platform = 'youtube' | 'instagram' | 'facebook' | 'tiktok' | 'x'

export type TranscriptMethod = 'youtube_captions' | 'whisper' | 'text_submission'

export type ResultStatus = 'resolved' | 'unresolved'

export interface Source {
  platform: Platform
  video_id: string
  url: string
  title: string
  description: string
  channel: string
  duration_seconds: number
}

export interface Transcript {
  text: string
  language: string
  method: TranscriptMethod
}

export interface MovieMention {
  title: string
  year: number
}

export interface Movie {
  title: string
  year: number
  cast: string[]
  directors: string[]
  description: string
  poster_url: string | null
  tmdb_id: number
  tmdb_url: string
  imdb_id: string | null
  imdb_url: string | null
  tmdb_score: number
}

export interface TVSeriesMention {
  title: string
  year: number
}

export interface TVSeries {
  title: string
  first_air_year: number
  last_air_year: number | null
  cast: string[]
  creators: string[]
  description: string
  poster_url: string | null
  tmdb_id: number
  tmdb_url: string
  imdb_id: string | null
  imdb_url: string | null
  tmdb_score: number
}

export interface ArtistCredit {
  spotify_artist_id: string
  name: string
}

export interface TrackMention {
  track_title: string
  artists: string[]
  release_title: string | null
  release_year: number | null
}

export interface MusicReleaseMention {
  release_title: string
  artists: string[]
  release_year: number | null
}

export interface MusicRelease {
  release_title: string
  artists: ArtistCredit[]
  release_date: string
  album_type: 'album' | 'single' | 'compilation'
  spotify_album_id: string
  spotify_url: string
  cover_url: string | null
}

export interface Track {
  track_title: string
  artists: ArtistCredit[]
  spotify_track_id: string
  spotify_url: string
  preferred_music_release: MusicRelease
  cover_url: string | null
}

export interface BookMention {
  title: string
  authors: string[]
}

export interface EnrichedAuthorCredit {
  open_library_author_id: string
  name: string
  open_library_url: string
}

export interface BookEdition {
  title: string | null
  publication_year: number | null
  publishers: string[]
  isbn_10: string[]
  isbn_13: string[]
  open_library_edition_id: string
  open_library_url: string
  cover_url: string | null
}

export interface Book {
  title: string
  authors: EnrichedAuthorCredit[]
  open_library_work_id: string
  open_library_url: string
  edition: BookEdition | null
  cover_url: string | null
  cover_edition_id: string | null
}

export interface ResolvedMovieResult {
  status: 'resolved'
  movie_mention: MovieMention
  movie: Movie
}

export interface UnresolvedMovieResult {
  status: 'unresolved'
  movie_mention: MovieMention
  movie: null
}

export type MovieResult = ResolvedMovieResult | UnresolvedMovieResult

export interface ResolvedTVSeriesResult {
  status: 'resolved'
  tv_series_mention: TVSeriesMention
  tv_series: TVSeries
}

export interface UnresolvedTVSeriesResult {
  status: 'unresolved'
  tv_series_mention: TVSeriesMention
  tv_series: null
}

export type TVSeriesResult = ResolvedTVSeriesResult | UnresolvedTVSeriesResult

export interface ResolvedTrackResult {
  status: 'resolved'
  track_mention: TrackMention
  track: Track
}

export interface UnresolvedTrackResult {
  status: 'unresolved'
  track_mention: TrackMention
  track: null
}

export type TrackResult = ResolvedTrackResult | UnresolvedTrackResult

export interface ResolvedMusicReleaseResult {
  status: 'resolved'
  music_release_mention: MusicReleaseMention
  music_release: MusicRelease
}

export interface UnresolvedMusicReleaseResult {
  status: 'unresolved'
  music_release_mention: MusicReleaseMention
  music_release: null
}

export type MusicReleaseResult = ResolvedMusicReleaseResult | UnresolvedMusicReleaseResult

export interface ResolvedBookResult {
  status: 'resolved'
  book_mention: BookMention
  book: Book
}

export interface UnresolvedBookResult {
  status: 'unresolved'
  book_mention: BookMention
  book: null
}

export type BookResult = ResolvedBookResult | UnresolvedBookResult

export interface ResultCounts {
  n_mentions: number
  n_resolved: number
  n_unresolved: number
}

export interface ExtractionStatistics {
  movies: ResultCounts
  tv_series: ResultCounts
  tracks: ResultCounts
  music_releases: ResultCounts
  books: ResultCounts
}

export const RESULT_CATEGORY_KEYS = [
  'movies',
  'tv_series',
  'tracks',
  'music_releases',
  'books',
] as const

export interface ExtractionResults {
  movies: MovieResult[]
  tv_series: TVSeriesResult[]
  tracks: TrackResult[]
  music_releases: MusicReleaseResult[]
  books: BookResult[]
}

export interface ExtractionRequest {
  url: string
  market: string
}

export interface ExtractionResponse {
  market: string
  source: Source
  transcript: Transcript
  statistics: ExtractionStatistics
  results: ExtractionResults
}

export function hasExtractionResults(results: ExtractionResults): boolean {
  return RESULT_CATEGORY_KEYS.some((category) => results[category].length > 0)
}
