import type {
  ArtistCredit,
  Book,
  BookEdition,
  BookMention,
  BookResult,
  EnrichedAuthorCredit,
  ExtractionRequest,
  ExtractionResponse,
  ExtractionResults,
  ExtractionStatistics,
  Movie,
  MovieMention,
  MovieResult,
  MusicRelease,
  MusicReleaseMention,
  MusicReleaseResult,
  Platform,
  ResultCounts,
  Source,
  Track,
  TrackMention,
  TrackResult,
  Transcript,
  TranscriptMethod,
  TVSeries,
  TVSeriesMention,
  TVSeriesResult,
} from './types'

export type ExtractionFailureCode =
  | 'invalid_request'
  | 'invalid_source'
  | 'unsupported_platform'
  | 'source_unavailable'
  | 'duration_limit_exceeded'
  | 'interpretation_input_too_large'
  | 'metadata_provider_failed'
  | 'transcription_failed'
  | 'mention_interpretation_failed'
  | 'invalid_llm_response'
  | 'enrichment_failed'
  | 'catalog_provider_failed'
  | 'pipeline_timeout'

const failureCodes: Record<Exclude<ExtractionFailureCode, 'invalid_request'>, true> = {
  invalid_source: true,
  unsupported_platform: true,
  source_unavailable: true,
  duration_limit_exceeded: true,
  interpretation_input_too_large: true,
  metadata_provider_failed: true,
  transcription_failed: true,
  mention_interpretation_failed: true,
  invalid_llm_response: true,
  enrichment_failed: true,
  catalog_provider_failed: true,
  pipeline_timeout: true,
}

export class ExtractionApiError extends Error {
  readonly code: ExtractionFailureCode

  constructor(code: ExtractionFailureCode) {
    super(code)
    this.name = 'ExtractionApiError'
    this.code = code
  }
}

class UnexpectedExtractionApiResponseError extends Error {
  constructor() {
    super('Unexpected extraction API response')
    this.name = 'UnexpectedExtractionApiResponseError'
  }
}

function requireObject(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new UnexpectedExtractionApiResponseError()
  }

  return value as Record<string, unknown>
}

function requireString(value: unknown): string {
  if (typeof value !== 'string') {
    throw new UnexpectedExtractionApiResponseError()
  }

  return value
}

function requireNumber(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new UnexpectedExtractionApiResponseError()
  }

  return value
}

function requireInteger(value: unknown): number {
  const number = requireNumber(value)
  if (!Number.isInteger(number)) {
    throw new UnexpectedExtractionApiResponseError()
  }

  return number
}

function requireNullableString(value: unknown): string | null {
  if (value === null) {
    return null
  }

  return requireString(value)
}

function requireNullableInteger(value: unknown): number | null {
  if (value === null) {
    return null
  }

  return requireInteger(value)
}

function requireStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    throw new UnexpectedExtractionApiResponseError()
  }

  return value.map(requireString)
}

function requireArray<T>(value: unknown, parse: (item: unknown) => T): T[] {
  if (!Array.isArray(value)) {
    throw new UnexpectedExtractionApiResponseError()
  }

  return value.map(parse)
}

function parsePlatform(value: unknown): Platform {
  if (
    value === 'youtube' ||
    value === 'instagram' ||
    value === 'facebook' ||
    value === 'tiktok' ||
    value === 'x'
  ) {
    return value
  }

  throw new UnexpectedExtractionApiResponseError()
}

function parseTranscriptMethod(value: unknown): TranscriptMethod {
  if (value === 'youtube_captions' || value === 'whisper' || value === 'text_submission') {
    return value
  }

  throw new UnexpectedExtractionApiResponseError()
}

function parseSource(value: unknown): Source {
  const source = requireObject(value)
  return {
    platform: parsePlatform(source.platform),
    video_id: requireString(source.video_id),
    url: requireString(source.url),
    title: requireString(source.title),
    description: requireString(source.description),
    channel: requireString(source.channel),
    duration_seconds: requireInteger(source.duration_seconds),
  }
}

function parseTranscript(value: unknown): Transcript {
  const transcript = requireObject(value)
  return {
    text: requireString(transcript.text),
    language: requireString(transcript.language),
    method: parseTranscriptMethod(transcript.method),
  }
}

function parseMovieMention(value: unknown): MovieMention {
  const mention = requireObject(value)
  return {
    title: requireString(mention.title),
    year: requireInteger(mention.year),
  }
}

function parseMovie(value: unknown): Movie {
  const movie = requireObject(value)
  return {
    title: requireString(movie.title),
    year: requireInteger(movie.year),
    cast: requireStringArray(movie.cast),
    directors: requireStringArray(movie.directors),
    description: requireString(movie.description),
    poster_url: requireNullableString(movie.poster_url),
    tmdb_id: requireInteger(movie.tmdb_id),
    tmdb_url: requireString(movie.tmdb_url),
    imdb_id: requireNullableString(movie.imdb_id),
    imdb_url: requireNullableString(movie.imdb_url),
    tmdb_score: requireNumber(movie.tmdb_score),
  }
}

function parseTVSeriesMention(value: unknown): TVSeriesMention {
  const mention = requireObject(value)
  return {
    title: requireString(mention.title),
    year: requireInteger(mention.year),
  }
}

function parseTVSeries(value: unknown): TVSeries {
  const tvSeries = requireObject(value)
  return {
    title: requireString(tvSeries.title),
    first_air_year: requireInteger(tvSeries.first_air_year),
    last_air_year: requireNullableInteger(tvSeries.last_air_year),
    cast: requireStringArray(tvSeries.cast),
    creators: requireStringArray(tvSeries.creators),
    description: requireString(tvSeries.description),
    poster_url: requireNullableString(tvSeries.poster_url),
    tmdb_id: requireInteger(tvSeries.tmdb_id),
    tmdb_url: requireString(tvSeries.tmdb_url),
    imdb_id: requireNullableString(tvSeries.imdb_id),
    imdb_url: requireNullableString(tvSeries.imdb_url),
    tmdb_score: requireNumber(tvSeries.tmdb_score),
  }
}

function parseArtistCredit(value: unknown): ArtistCredit {
  const artist = requireObject(value)
  return {
    spotify_artist_id: requireString(artist.spotify_artist_id),
    name: requireString(artist.name),
  }
}

function parseTrackMention(value: unknown): TrackMention {
  const mention = requireObject(value)
  return {
    track_title: requireString(mention.track_title),
    artists: requireStringArray(mention.artists),
    release_title: requireNullableString(mention.release_title),
    release_year: requireNullableInteger(mention.release_year),
  }
}

function parseMusicReleaseMention(value: unknown): MusicReleaseMention {
  const mention = requireObject(value)
  return {
    release_title: requireString(mention.release_title),
    artists: requireStringArray(mention.artists),
    release_year: requireNullableInteger(mention.release_year),
  }
}

function parseMusicRelease(value: unknown): MusicRelease {
  const release = requireObject(value)
  const albumType = release.album_type
  if (albumType !== 'album' && albumType !== 'single' && albumType !== 'compilation') {
    throw new UnexpectedExtractionApiResponseError()
  }

  return {
    release_title: requireString(release.release_title),
    artists: requireArray(release.artists, parseArtistCredit),
    release_date: requireString(release.release_date),
    album_type: albumType,
    spotify_album_id: requireString(release.spotify_album_id),
    spotify_url: requireString(release.spotify_url),
    cover_url: requireNullableString(release.cover_url),
  }
}

function parseTrack(value: unknown): Track {
  const track = requireObject(value)
  return {
    track_title: requireString(track.track_title),
    artists: requireArray(track.artists, parseArtistCredit),
    spotify_track_id: requireString(track.spotify_track_id),
    spotify_url: requireString(track.spotify_url),
    preferred_music_release: parseMusicRelease(track.preferred_music_release),
    cover_url: requireNullableString(track.cover_url),
  }
}

function parseBookMention(value: unknown): BookMention {
  const mention = requireObject(value)
  return {
    title: requireString(mention.title),
    authors: requireStringArray(mention.authors),
  }
}

function parseEnrichedAuthorCredit(value: unknown): EnrichedAuthorCredit {
  const author = requireObject(value)
  return {
    open_library_author_id: requireString(author.open_library_author_id),
    name: requireString(author.name),
    open_library_url: requireString(author.open_library_url),
  }
}

function parseBookEdition(value: unknown): BookEdition {
  const edition = requireObject(value)
  return {
    title: requireNullableString(edition.title),
    publication_year: requireNullableInteger(edition.publication_year),
    publishers: requireStringArray(edition.publishers),
    isbn_10: requireStringArray(edition.isbn_10),
    isbn_13: requireStringArray(edition.isbn_13),
    open_library_edition_id: requireString(edition.open_library_edition_id),
    open_library_url: requireString(edition.open_library_url),
    cover_url: requireNullableString(edition.cover_url),
  }
}

function parseBook(value: unknown): Book {
  const book = requireObject(value)
  return {
    title: requireString(book.title),
    authors: requireArray(book.authors, parseEnrichedAuthorCredit),
    open_library_work_id: requireString(book.open_library_work_id),
    open_library_url: requireString(book.open_library_url),
    edition: book.edition === null ? null : parseBookEdition(book.edition),
    cover_url: requireNullableString(book.cover_url),
    cover_edition_id: requireNullableString(book.cover_edition_id),
  }
}

type ParsedResult<M, P> =
  | { status: 'resolved'; mention: M; provider: P }
  | { status: 'unresolved'; mention: M; provider: null }

function parseResult<M, P>(
  value: unknown,
  mentionKey: string,
  providerKey: string,
  parseMention: (item: unknown) => M,
  parseProvider: (item: unknown) => P,
): ParsedResult<M, P> {
  const result = requireObject(value)
  const mention = parseMention(result[mentionKey])

  if (result.status === 'resolved') {
    if (result[providerKey] === null) {
      throw new UnexpectedExtractionApiResponseError()
    }

    return { status: 'resolved', mention, provider: parseProvider(result[providerKey]) }
  }

  if (result.status === 'unresolved' && result[providerKey] === null) {
    return { status: 'unresolved', mention, provider: null }
  }

  throw new UnexpectedExtractionApiResponseError()
}

function parseMovieResult(value: unknown): MovieResult {
  const result = parseResult(value, 'movie_mention', 'movie', parseMovieMention, parseMovie)
  return result.status === 'resolved'
    ? { status: result.status, movie_mention: result.mention, movie: result.provider }
    : { status: result.status, movie_mention: result.mention, movie: null }
}

function parseTVSeriesResult(value: unknown): TVSeriesResult {
  const result = parseResult(value, 'tv_series_mention', 'tv_series', parseTVSeriesMention, parseTVSeries)
  return result.status === 'resolved'
    ? { status: result.status, tv_series_mention: result.mention, tv_series: result.provider }
    : { status: result.status, tv_series_mention: result.mention, tv_series: null }
}

function parseTrackResult(value: unknown): TrackResult {
  const result = parseResult(value, 'track_mention', 'track', parseTrackMention, parseTrack)
  return result.status === 'resolved'
    ? { status: result.status, track_mention: result.mention, track: result.provider }
    : { status: result.status, track_mention: result.mention, track: null }
}

function parseMusicReleaseResult(value: unknown): MusicReleaseResult {
  const result = parseResult(
    value,
    'music_release_mention',
    'music_release',
    parseMusicReleaseMention,
    parseMusicRelease,
  )
  return result.status === 'resolved'
    ? {
      status: result.status,
      music_release_mention: result.mention,
      music_release: result.provider,
    }
    : { status: result.status, music_release_mention: result.mention, music_release: null }
}

function parseBookResult(value: unknown): BookResult {
  const result = parseResult(value, 'book_mention', 'book', parseBookMention, parseBook)
  return result.status === 'resolved'
    ? { status: result.status, book_mention: result.mention, book: result.provider }
    : { status: result.status, book_mention: result.mention, book: null }
}

function parseResultCounts(value: unknown): ResultCounts {
  const counts = requireObject(value)
  const nMentions = requireInteger(counts.n_mentions)
  const nResolved = requireInteger(counts.n_resolved)
  const nUnresolved = requireInteger(counts.n_unresolved)
  if (nMentions < 0 || nResolved < 0 || nUnresolved < 0) {
    throw new UnexpectedExtractionApiResponseError()
  }

  return {
    n_mentions: nMentions,
    n_resolved: nResolved,
    n_unresolved: nUnresolved,
  }
}

function parseStatistics(value: unknown): ExtractionStatistics {
  const statistics = requireObject(value)
  return {
    movies: parseResultCounts(statistics.movies),
    tv_series: parseResultCounts(statistics.tv_series),
    tracks: parseResultCounts(statistics.tracks),
    music_releases: parseResultCounts(statistics.music_releases),
    books: parseResultCounts(statistics.books),
  }
}

function parseResults(value: unknown): ExtractionResults {
  const results = requireObject(value)
  return {
    movies: requireArray(results.movies, parseMovieResult),
    tv_series: requireArray(results.tv_series, parseTVSeriesResult),
    tracks: requireArray(results.tracks, parseTrackResult),
    music_releases: requireArray(results.music_releases, parseMusicReleaseResult),
    books: requireArray(results.books, parseBookResult),
  }
}

function parseExtractionResponse(value: unknown): ExtractionResponse {
  const response = requireObject(value)
  const market = requireString(response.market)
  if (!/^[A-Z]{2}$/.test(market)) {
    throw new UnexpectedExtractionApiResponseError()
  }

  return {
    market,
    source: parseSource(response.source),
    transcript: parseTranscript(response.transcript),
    statistics: parseStatistics(response.statistics),
    results: parseResults(response.results),
  }
}

function parseFailureCode(value: unknown): ExtractionFailureCode | undefined {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return undefined
  }

  const error = value as Record<string, unknown>
  const errorDetail = error.error
  if (typeof errorDetail !== 'object' || errorDetail === null || Array.isArray(errorDetail)) {
    return undefined
  }

  const code = (errorDetail as Record<string, unknown>).code
  return typeof code === 'string' && Object.hasOwn(failureCodes, code)
    ? (code as ExtractionFailureCode)
    : undefined
}

function rethrowAbort(error: unknown): never | undefined {
  if (error instanceof Error && error.name === 'AbortError') {
    throw error
  }
}

export async function runSourceExtraction(
  request: ExtractionRequest,
  signal: AbortSignal,
): Promise<ExtractionResponse> {
  let response: Response
  try {
    response = await fetch('/api/extractions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: request.url, market: request.market }),
      signal,
    })
  } catch (error) {
    rethrowAbort(error)
    throw new UnexpectedExtractionApiResponseError()
  }

  let payload: unknown
  try {
    payload = await response.json()
  } catch (error) {
    rethrowAbort(error)
    if (response.status === 422) {
      throw new ExtractionApiError('invalid_request')
    }

    throw new UnexpectedExtractionApiResponseError()
  }

  if (response.ok) {
    return parseExtractionResponse(payload)
  }

  if (response.status === 422) {
    throw new ExtractionApiError('invalid_request')
  }

  const code = parseFailureCode(payload)
  if (code !== undefined) {
    throw new ExtractionApiError(code)
  }

  throw new UnexpectedExtractionApiResponseError()
}
