import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent, { type UserEvent } from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import {
  createBookWorkExtractionResponse,
  createEmptyExtractionResponse,
  createMusicExtractionResponse,
  createScreenWorkExtractionResponse,
  extractionErrorEnvelope,
} from './test/fixtures/extraction'

const fetchMock = vi.fn()

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

async function submitPublicVideo(user: UserEvent, url: string) {
  const input = screen.getByLabelText('Public video link')
  await user.clear(input)
  await user.type(input, url)
  await user.click(screen.getByRole('button', { name: 'Find works' }))
}

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})

describe('Source Extraction application', () => {
  it('rejects blank, malformed, and overlong URLs without calling the API', async () => {
    const user = userEvent.setup()
    render(<App />)
    const input = screen.getByLabelText('Public video link')

    await user.click(screen.getByRole('button', { name: 'Find works' }))
    expect(await screen.findByText('Enter a public video link.')).toBeVisible()
    expect(input).toHaveFocus()

    await user.type(input, 'not a public URL')
    await user.click(screen.getByRole('button', { name: 'Find works' }))
    expect(await screen.findByText('Enter a valid public video link.')).toBeVisible()
    expect(input).toHaveFocus()

    fireEvent.change(input, { target: { value: `https://example.com/${'a'.repeat(2049)}` } })
    await user.click(screen.getByRole('button', { name: 'Find works' }))
    expect(
      await screen.findByText('Keep the public video link under 2,048 characters.'),
    ).toBeVisible()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('accepts supported platform URLs client-side and sends each trimmed same-origin request', async () => {
    const user = userEvent.setup()
    render(<App />)
    const urls = [
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      'https://www.instagram.com/reel/ABC123',
      'https://www.facebook.com/reel/123456789',
      'https://www.tiktok.com/@creator/video/1234567890123456789',
      'https://x.com/creator/status/123456789',
    ]

    for (const url of urls) {
      fetchMock.mockResolvedValueOnce(jsonResponse(createEmptyExtractionResponse()))
      await submitPublicVideo(user, `  ${url}  `)
      expect(await screen.findByRole('heading', { name: 'No results found' })).toBeVisible()

      const [, request] = fetchMock.mock.calls.at(-1) as [string, RequestInit]
      expect(fetchMock.mock.calls.at(-1)?.[0]).toBe('/api/extractions')
      expect(request.method).toBe('POST')
      expect(request.headers).toEqual({ 'Content-Type': 'application/json' })
      expect(JSON.parse(String(request.body))).toEqual({ url, market: 'US' })

      await user.click(screen.getByRole('button', { name: 'Check another Source' }))
    }
  })

  it('keeps the named Effective Market in one mount and resets it after remount', async () => {
    const user = userEvent.setup()
    const rendered = render(<App />)

    await user.click(screen.getByText('Advanced options'))
    const marketSelect = screen.getByLabelText('Effective Market')
    expect(marketSelect).toHaveValue('US')
    expect(marketSelect).toHaveDisplayValue('United States')

    await user.selectOptions(marketSelect, 'JP')
    fetchMock.mockResolvedValueOnce(jsonResponse(createEmptyExtractionResponse({ market: 'JP' })))
    await submitPublicVideo(user, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ')
    expect(await screen.findByText('Effective Market: Japan')).toBeVisible()
    expect(JSON.parse(String((fetchMock.mock.calls[0] as [string, RequestInit])[1].body))).toEqual({
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      market: 'JP',
    })

    await user.click(screen.getByRole('button', { name: 'Check another Source' }))
    expect(screen.getByLabelText('Effective Market')).toHaveValue('JP')
    expect(screen.getByLabelText('Public video link')).toHaveFocus()

    rendered.unmount()
    render(<App />)
    expect(screen.getByLabelText('Effective Market')).toHaveValue('US')
  })

  it('keeps a pending request honest, aborts only the browser wait, and retries freshly', async () => {
    const user = userEvent.setup()
    const signals: AbortSignal[] = []
    fetchMock.mockImplementation((_: string, request: RequestInit) => {
      signals.push(request.signal as AbortSignal)
      return new Promise<Response>(() => { })
    })
    render(<App />)

    await submitPublicVideo(user, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ')
    expect(await screen.findByRole('heading', { name: 'Checking this public video...' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Find works' })).toBeDisabled()
    expect(screen.getByLabelText('Public video link')).toBeDisabled()
    expect(screen.getByLabelText('Effective Market')).toBeDisabled()
    expect(document.querySelectorAll('.pending-placeholder')).toHaveLength(4)
    expect(screen.queryByText(/Movies|TV Series|Tracks|Books/)).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Stop waiting' }))
    expect(await screen.findByText('You stopped waiting in this browser. The Extraction may still be running on the server.')).toBeVisible()
    expect(signals[0]?.aborted).toBe(true)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(screen.getByLabelText('Public video link')).toBeEnabled()
    expect(screen.getByRole('heading', { name: 'Stopped waiting' })).toHaveFocus()

    await user.click(screen.getByRole('button', { name: 'Try again' }))
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
    expect(signals[1]).not.toBe(signals[0])
    expect(signals[1]?.aborted).toBe(false)
    expect(fetchMock.mock.calls.every(([path]) => path === '/api/extractions')).toBe(true)
  })

  it('renders each known recovery branch without exposing backend details', async () => {
    const user = userEvent.setup()
    render(<App />)
    const cases = [
      [
        404,
        'source_unavailable',
        'This Source is unavailable',
        'Make sure it is public, check the link, or choose another Source.',
      ],
      [413, 'duration_limit_exceeded', 'This Source is too long', 'Choose a shorter public video.'],
      [
        413,
        'interpretation_input_too_large',
        'This Source contains more material than Reelio can process',
        'Choose another Source.',
      ],
      [
        502,
        'metadata_provider_failed',
        "Reelio couldn't read this Source",
        'Try again later or choose another Source.',
      ],
      [
        502,
        'mention_interpretation_failed',
        "Reelio couldn't finish this Extraction",
        'Try again. If it keeps happening, choose another Source.',
      ],
      [
        504,
        'pipeline_timeout',
        'This Extraction took too long',
        'Try again. Your public video link is still here.',
      ],
    ] as const

    fetchMock.mockResolvedValueOnce(jsonResponse({ detail: ['ignored'] }, 422))
    await submitPublicVideo(user, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ')
    expect(
      await screen.findByText('Check the public video link and Effective Market, then try again.'),
    ).toBeVisible()
    expect(screen.getByRole('heading', { name: 'Check your submission' })).toHaveFocus()

    await user.type(screen.getByLabelText('Public video link'), ' ')

    for (const [status, code, title, message] of cases) {
      fetchMock.mockResolvedValueOnce(
        jsonResponse(extractionErrorEnvelope(code, 'Sensitive backend detail.'), status),
      )
      await submitPublicVideo(user, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ')
      expect(await screen.findByRole('heading', { name: title })).toHaveFocus()
      expect(screen.getByText(message)).toBeVisible()
      expect(screen.queryByText(code)).not.toBeInTheDocument()
      expect(screen.queryByText('Sensitive backend detail.')).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Try again' })).toBeVisible()
      expect(screen.getByRole('button', { name: 'Choose another Source' })).toBeVisible()

      await user.click(screen.getByRole('button', { name: 'Choose another Source' }))
      expect(screen.getByLabelText('Public video link')).toHaveFocus()
    }
  })

  it('converges network, unknown, malformed JSON, and malformed success failures safely', async () => {
    const user = userEvent.setup()
    render(<App />)
    const failures: Array<Error | Response> = [
      new Error('network failed'),
      jsonResponse(extractionErrorEnvelope('new_provider_failure', 'Sensitive backend detail.'), 502),
      new Response('{', { status: 200, headers: { 'Content-Type': 'application/json' } }),
      jsonResponse({ market: 'US' }),
    ]

    for (const failure of failures) {
      if (failure instanceof Error) {
        fetchMock.mockRejectedValueOnce(failure)
      } else {
        fetchMock.mockResolvedValueOnce(failure)
      }

      await submitPublicVideo(user, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ')
      expect(await screen.findByRole('heading', { name: 'Something went wrong' })).toHaveFocus()
      expect(screen.getByText('Try again. Your public video link is still here.')).toBeVisible()
      expect(screen.queryByText('Sensitive backend detail.')).not.toBeInTheDocument()
      expect(screen.queryByText('new_provider_failure')).not.toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: 'Choose another Source' }))
    }
  })

  it('shows canonical empty context without result statistics and focuses its result heading', async () => {
    const user = userEvent.setup()
    const canonicalUrl = 'https://www.tiktok.com/@canonical/video/1234567890123456789'
    fetchMock.mockResolvedValueOnce(
      jsonResponse(
        createEmptyExtractionResponse({
          market: 'JP',
          source: {
            platform: 'tiktok',
            url: canonicalUrl,
            title: 'Canonical returned Source',
            description: 'Description that must not be rendered',
            channel: '',
            duration_seconds: 3661,
          },
        }),
      ),
    )
    render(<App />)

    await submitPublicVideo(user, 'https://www.tiktok.com/@alias/video/1234567890123456789')
    const emptyHeading = await screen.findByRole('heading', { name: 'No results found' })
    const sourceRegion = screen.getByRole('region', { name: 'Source' })
    const canonicalLink = screen.getByRole('link', { name: /Canonical returned Source on TikTok/ })
    expect(canonicalLink).toHaveAttribute('href', canonicalUrl)
    expect(canonicalLink).toHaveAttribute('target', '_blank')
    expect(screen.getByText(/TikTok · Channel unavailable · 1 hr 1 min 1 sec/)).toBeVisible()
    expect(screen.getByText('Effective Market: Japan')).toBeVisible()
    expect(emptyHeading).toHaveFocus()
    expect(screen.queryByText('Description that must not be rendered')).not.toBeInTheDocument()
    expect(within(sourceRegion).getByRole('button', { name: 'View Transcript' })).toBeVisible()
    expect(within(sourceRegion).getByRole('button', { name: 'Check another Source' })).toBeVisible()
    expect(screen.queryByText(/n_mentions|n_resolved|n_unresolved/)).not.toBeInTheDocument()
  })

  it('should render resolved and unresolved Movies and TV Series when a completed Extraction contains Screen Work Results', async () => {
    const user = userEvent.setup()
    fetchMock.mockResolvedValueOnce(jsonResponse(createScreenWorkExtractionResponse()))
    render(<App />)

    await submitPublicVideo(user, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ')
    const completedHeading = await screen.findByRole('heading', { name: 'Extraction complete' })
    const moviesHeading = screen.getByRole('heading', { name: 'Movies' })
    const tvSeriesHeading = screen.getByRole('heading', { name: 'TV Series' })
    const resolvedMovieCard = screen.getByRole('button', {
      name: "Open details for Le Fabuleux Destin d'Amélie Poulain",
    })
    const unresolvedMovieCard = screen.getByRole('button', { name: 'Open details for Unknown Movie' })
    const resolvedTvSeriesCard = screen.getByRole('button', { name: 'Open details for The Last of Us' })
    const unresolvedTvSeriesCard = screen.getByRole('button', {
      name: 'Open details for Unknown TV Series',
    })

    expect(completedHeading).toHaveFocus()
    expect(screen.getAllByRole('heading').indexOf(moviesHeading)).toBeLessThan(
      screen.getAllByRole('heading').indexOf(tvSeriesHeading),
    )
    expect(resolvedMovieCard).toHaveTextContent("Le Fabuleux Destin d'Amélie Poulain")
    expect(resolvedMovieCard).toHaveTextContent('2000')
    expect(resolvedMovieCard).toHaveTextContent('TMDB 7.9')
    expect(resolvedMovieCard).toHaveTextContent('Mentioned as Amélie (2001)')
    expect(screen.queryByText('Mentioned as The Last of Us (2023)')).not.toBeInTheDocument()
    expect(
      within(resolvedMovieCard).getByRole('img', {
        name: "Poster unavailable for Le Fabuleux Destin d'Amélie Poulain",
      }),
    ).toBeVisible()

    const tvPoster = within(resolvedTvSeriesCard).getByRole('img', {
      name: 'Poster for The Last of Us',
    })
    expect(resolvedTvSeriesCard).toHaveTextContent('2023')
    expect(resolvedTvSeriesCard).toHaveTextContent('TMDB 8.6')
    fireEvent.error(tvPoster)
    expect(
      within(resolvedTvSeriesCard).getByRole('img', {
        name: 'Poster unavailable for The Last of Us',
      }),
    ).toBeVisible()
    expect(within(unresolvedMovieCard).getByText('Unresolved')).toBeVisible()
    expect(within(unresolvedTvSeriesCard).getByText('Unresolved')).toBeVisible()
    expect(screen.queryByText(/Result Statistics/)).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Tracks' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Music Releases' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Book Works' })).not.toBeInTheDocument()
  })

  it('should show verified Screen Work details and restore focus when a Result card is opened', async () => {
    const user = userEvent.setup()
    fetchMock.mockResolvedValueOnce(jsonResponse(createScreenWorkExtractionResponse()))
    render(<App />)

    await submitPublicVideo(user, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ')
    const resolvedTvSeriesCard = await screen.findByRole('button', {
      name: 'Open details for The Last of Us',
    })

    resolvedTvSeriesCard.focus()
    await user.keyboard('{Enter}')
    const resolvedDialog = await screen.findByRole('dialog', { name: 'The Last of Us details' })
    const tmdbLink = within(resolvedDialog).getByRole('link', {
      name: 'Open The Last of Us on TMDB, opens in a new tab',
    })

    expect(within(resolvedDialog).getByRole('button', { name: 'Close details' })).toHaveFocus()
    expect(
      within(resolvedDialog).getByText('A smuggler escorts a teenager across a ruined America.'),
    ).toBeVisible()
    expect(within(resolvedDialog).getByText('Craig Mazin, Neil Druckmann')).toBeVisible()
    expect(within(resolvedDialog).getByText('Pedro Pascal, Bella Ramsey')).toBeVisible()
    expect(within(resolvedDialog).getByText('Final air year')).toBeVisible()
    expect(within(resolvedDialog).getByText('Unavailable')).toBeVisible()
    expect(tmdbLink).toHaveTextContent('Open on TMDB')
    expect(tmdbLink).toHaveAttribute('href', 'https://www.themoviedb.org/tv/100088')
    expect(tmdbLink).toHaveAttribute('target', '_blank')
    expect(tmdbLink).toHaveAttribute('rel', 'noopener noreferrer')

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog', { name: 'The Last of Us details' })).not.toBeInTheDocument()
    expect(resolvedTvSeriesCard).toHaveFocus()

    const unresolvedMovieCard = screen.getByRole('button', { name: 'Open details for Unknown Movie' })
    unresolvedMovieCard.focus()
    await user.keyboard('{Enter}')
    const unresolvedDialog = await screen.findByRole('dialog', { name: 'Unknown Movie details' })

    expect(
      within(unresolvedDialog).getByText(
        'Reelio could not verify this Movie Mention against TMDB, so provider metadata is unavailable.',
      ),
    ).toBeVisible()
    expect(
      within(unresolvedDialog).getByRole('img', { name: 'Poster unavailable for Unknown Movie' }),
    ).toBeVisible()
    expect(
      within(unresolvedDialog).queryByText('A Parisian woman quietly improves the lives around her.'),
    ).not.toBeInTheDocument()
    expect(within(unresolvedDialog).queryByText('Directors')).not.toBeInTheDocument()
    expect(within(unresolvedDialog).queryByText('Cast')).not.toBeInTheDocument()
    expect(within(unresolvedDialog).queryByText('TMDB 7.9 / 10')).not.toBeInTheDocument()
    expect(within(unresolvedDialog).queryByRole('img', { name: /Poster for/ })).not.toBeInTheDocument()
    expect(within(unresolvedDialog).queryByRole('link', { name: /TMDB/ })).not.toBeInTheDocument()
  })

  it('should render Spotify-authoritative and unresolved cards when a completed Extraction contains music Results', async () => {
    const user = userEvent.setup()
    fetchMock.mockResolvedValueOnce(jsonResponse(createMusicExtractionResponse()))
    render(<App />)

    await submitPublicVideo(user, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ')
    const moviesHeading = await screen.findByRole('heading', { name: 'Movies' })
    const tvSeriesHeading = screen.getByRole('heading', { name: 'TV Series' })
    const tracksHeading = screen.getByRole('heading', { name: 'Tracks' })
    const musicReleasesHeading = screen.getByRole('heading', { name: 'Music Releases' })
    const resolvedTrackCard = screen.getByRole('button', {
      name: 'Open Spotify Track details for One More Time (2011 Remaster) by DAFT PUNK, Romanthony',
    })
    const unresolvedTrackCard = screen.getByRole('button', {
      name: 'Open unresolved Track Mention details for Unknown Track by Unknown Artist',
    })
    const resolvedMusicReleaseCard = screen.getByRole('button', {
      name: 'Open Spotify Music Release details for Random Access Memories by Daft Punk',
    })
    const unresolvedMusicReleaseCard = screen.getByRole('button', {
      name: 'Open unresolved Music Release Mention details for Unknown Release by Unknown Artist',
    })

    const headings = screen.getAllByRole('heading')
    expect(headings.indexOf(moviesHeading)).toBeLessThan(headings.indexOf(tvSeriesHeading))
    expect(headings.indexOf(tvSeriesHeading)).toBeLessThan(headings.indexOf(tracksHeading))
    expect(headings.indexOf(tracksHeading)).toBeLessThan(headings.indexOf(musicReleasesHeading))
    expect(resolvedTrackCard).toHaveTextContent('One More Time (2011 Remaster)')
    expect(resolvedTrackCard).toHaveTextContent('DAFT PUNK, Romanthony')
    expect(resolvedTrackCard).toHaveTextContent('Spotify Track')
    expect(resolvedTrackCard).toHaveTextContent(
      'Preferred release: Discovery (Deluxe Edition) · 2001-02-26',
    )
    expect(resolvedTrackCard).toHaveTextContent(
      'Mentioned as One More Time by Daft Punk, Romanthony · Discovery (2001)',
    )
    expect(
      within(resolvedTrackCard).getByRole('img', {
        name: 'Cover unavailable for One More Time (2011 Remaster) by DAFT PUNK, Romanthony',
      }),
    ).toBeVisible()
    expect(resolvedMusicReleaseCard).toHaveTextContent('Random Access Memories')
    expect(resolvedMusicReleaseCard).toHaveTextContent('Daft Punk')
    expect(resolvedMusicReleaseCard).toHaveTextContent('Spotify Album · 2013-05-17')
    expect(within(resolvedMusicReleaseCard).queryByText(/Mentioned as/)).not.toBeInTheDocument()

    const musicReleaseCover = within(resolvedMusicReleaseCard).getByRole('img', {
      name: 'Cover for Random Access Memories by Daft Punk',
    })
    fireEvent.error(musicReleaseCover)
    expect(
      within(resolvedMusicReleaseCard).getByRole('img', {
        name: 'Cover unavailable for Random Access Memories by Daft Punk',
      }),
    ).toBeVisible()

    expect(unresolvedTrackCard).toHaveTextContent('Unknown Track')
    expect(unresolvedTrackCard).toHaveTextContent('Unknown Artist')
    expect(within(unresolvedTrackCard).getAllByText('Unresolved')).toHaveLength(2)
    expect(within(unresolvedTrackCard).queryByText('Spotify Track')).not.toBeInTheDocument()
    expect(within(unresolvedTrackCard).queryByRole('link')).not.toBeInTheDocument()
    expect(unresolvedMusicReleaseCard).toHaveTextContent('Unknown Release')
    expect(unresolvedMusicReleaseCard).toHaveTextContent('Unknown Artist')
    expect(unresolvedMusicReleaseCard).toHaveTextContent('2024')
    expect(within(unresolvedMusicReleaseCard).getAllByText('Unresolved')).toHaveLength(2)
    expect(within(unresolvedMusicReleaseCard).queryByText(/Spotify/)).not.toBeInTheDocument()
    expect(within(unresolvedMusicReleaseCard).queryByRole('link')).not.toBeInTheDocument()
    expect(screen.queryByText(/Result Statistics/)).not.toBeInTheDocument()
    expect(screen.queryByText(/n_mentions|n_resolved|n_unresolved/)).not.toBeInTheDocument()
  })

  it('should expose only status-appropriate music details when a Result card is opened', async () => {
    const user = userEvent.setup()
    fetchMock.mockResolvedValueOnce(jsonResponse(createMusicExtractionResponse()))
    render(<App />)

    await submitPublicVideo(user, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ')
    const resolvedTrackCard = await screen.findByRole('button', {
      name: 'Open Spotify Track details for One More Time (2011 Remaster) by DAFT PUNK, Romanthony',
    })

    resolvedTrackCard.focus()
    await user.keyboard('{Enter}')
    const resolvedTrackDialog = await screen.findByRole('dialog', {
      name: 'One More Time (2011 Remaster) details',
    })
    const trackSpotifyLink = within(resolvedTrackDialog).getByRole('link', {
      name: 'Open One More Time (2011 Remaster) on Spotify, opens in a new tab',
    })

    expect(within(resolvedTrackDialog).getByRole('button', { name: 'Close details' })).toHaveFocus()
    expect(resolvedTrackDialog).toHaveTextContent('DAFT PUNK, Romanthony')
    expect(
      within(resolvedTrackDialog).getByText(
        'One More Time by Daft Punk, Romanthony · Discovery (2001)',
      ),
    ).toBeVisible()
    expect(within(resolvedTrackDialog).getByText('Discovery (Deluxe Edition)')).toBeVisible()
    expect(within(resolvedTrackDialog).getByText('2001-02-26')).toBeVisible()
    expect(within(resolvedTrackDialog).getByText('Album')).toBeVisible()
    expect(within(resolvedTrackDialog).getByText('spotify-track-one-more-time')).toBeVisible()
    expect(within(resolvedTrackDialog).getByText('spotify-album-discovery-deluxe')).toBeVisible()
    expect(trackSpotifyLink).toHaveTextContent('Open on Spotify')
    expect(trackSpotifyLink).toHaveAttribute(
      'href',
      'https://open.spotify.com/track/spotify-track-one-more-time',
    )
    expect(trackSpotifyLink).toHaveAttribute('target', '_blank')
    expect(trackSpotifyLink).toHaveAttribute('rel', 'noopener noreferrer')

    await user.keyboard('{Escape}')
    expect(
      screen.queryByRole('dialog', { name: 'One More Time (2011 Remaster) details' }),
    ).not.toBeInTheDocument()
    expect(resolvedTrackCard).toHaveFocus()

    const resolvedMusicReleaseCard = screen.getByRole('button', {
      name: 'Open Spotify Music Release details for Random Access Memories by Daft Punk',
    })
    await user.click(resolvedMusicReleaseCard)
    const resolvedMusicReleaseDialog = await screen.findByRole('dialog', {
      name: 'Random Access Memories details',
    })
    const musicReleaseSpotifyLink = within(resolvedMusicReleaseDialog).getByRole('link', {
      name: 'Open Random Access Memories on Spotify, opens in a new tab',
    })

    expect(within(resolvedMusicReleaseDialog).getByRole('button', { name: 'Close details' })).toHaveFocus()
    expect(within(resolvedMusicReleaseDialog).getByText('Daft Punk')).toBeVisible()
    expect(within(resolvedMusicReleaseDialog).getByText('2013-05-17')).toBeVisible()
    expect(within(resolvedMusicReleaseDialog).getByText('Album')).toBeVisible()
    expect(
      within(resolvedMusicReleaseDialog).getByText('spotify-album-random-access-memories'),
    ).toBeVisible()
    expect(musicReleaseSpotifyLink).toHaveAttribute(
      'href',
      'https://open.spotify.com/album/spotify-album-random-access-memories',
    )
    expect(musicReleaseSpotifyLink).toHaveAttribute('target', '_blank')
    expect(musicReleaseSpotifyLink).toHaveAttribute('rel', 'noopener noreferrer')

    await user.click(within(resolvedMusicReleaseDialog).getByRole('button', { name: 'Close details' }))
    expect(
      screen.queryByRole('dialog', { name: 'Random Access Memories details' }),
    ).not.toBeInTheDocument()
    expect(resolvedMusicReleaseCard).toHaveFocus()

    const unresolvedTrackCard = screen.getByRole('button', {
      name: 'Open unresolved Track Mention details for Unknown Track by Unknown Artist',
    })
    unresolvedTrackCard.focus()
    await user.keyboard('{Enter}')
    const unresolvedTrackDialog = await screen.findByRole('dialog', { name: 'Unknown Track details' })

    expect(within(unresolvedTrackDialog).getByRole('button', { name: 'Close details' })).toHaveFocus()
    expect(
      within(unresolvedTrackDialog).getByText(
        'Reelio could not verify this Track Mention against Spotify, so provider metadata and links are unavailable.',
      ),
    ).toBeVisible()
    expect(
      within(unresolvedTrackDialog).getByRole('img', {
        name: 'No verified cover for Unknown Track by Unknown Artist',
      }),
    ).toBeVisible()
    expect(within(unresolvedTrackDialog).queryByText('Spotify Track ID')).not.toBeInTheDocument()
    expect(within(unresolvedTrackDialog).queryByText('Spotify Album ID')).not.toBeInTheDocument()
    expect(within(unresolvedTrackDialog).queryByText('Preferred Music Release')).not.toBeInTheDocument()
    expect(within(unresolvedTrackDialog).queryByRole('img', { name: /Cover for/ })).not.toBeInTheDocument()
    expect(within(unresolvedTrackDialog).queryByRole('link', { name: /Spotify/ })).not.toBeInTheDocument()
  })

  it('should render Open Library and unresolved Book Work cards when a completed Extraction contains Book Work Results', async () => {
    const user = userEvent.setup()
    fetchMock.mockResolvedValueOnce(jsonResponse(createBookWorkExtractionResponse()))
    render(<App />)

    await submitPublicVideo(user, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ')
    const moviesHeading = await screen.findByRole('heading', { name: 'Movies' })
    const tvSeriesHeading = screen.getByRole('heading', { name: 'TV Series' })
    const tracksHeading = screen.getByRole('heading', { name: 'Tracks' })
    const musicReleasesHeading = screen.getByRole('heading', { name: 'Music Releases' })
    const bookWorksHeading = screen.getByRole('heading', { name: 'Book Works' })
    const resolvedBookCard = screen.getByRole('button', {
      name: 'Open Open Library Book Work details for Pride and Prejudice by Jane Austen',
    })
    const noEditionBookCard = screen.getByRole('button', {
      name: 'Open Open Library Book Work details for The Long Ships: A Saga of the Viking Age by Frans G. Bengtsson',
    })
    const unresolvedBookCard = screen.getByRole('button', {
      name: 'Open unresolved Book Mention details for Unknown Book by Unknown Author',
    })

    const headings = screen.getAllByRole('heading')
    expect(headings.indexOf(moviesHeading)).toBeLessThan(headings.indexOf(tvSeriesHeading))
    expect(headings.indexOf(tvSeriesHeading)).toBeLessThan(headings.indexOf(tracksHeading))
    expect(headings.indexOf(tracksHeading)).toBeLessThan(headings.indexOf(musicReleasesHeading))
    expect(headings.indexOf(musicReleasesHeading)).toBeLessThan(headings.indexOf(bookWorksHeading))
    expect(resolvedBookCard).toHaveTextContent('Pride and Prejudice')
    expect(resolvedBookCard).toHaveTextContent('Jane Austen')
    expect(resolvedBookCard).toHaveTextContent('Open Library Book Work')
    expect(resolvedBookCard).toHaveTextContent(
      "Preferred edition: Pride and Prejudice: A Collector's Edition · 1813",
    )
    expect(resolvedBookCard).toHaveTextContent('Mentioned as Pride & Prejudice by Jane Austen')
    expect(
      within(resolvedBookCard).getByRole('img', {
        name: 'Cover unavailable for Pride and Prejudice by Jane Austen',
      }),
    ).toBeVisible()
    expect(noEditionBookCard).toHaveTextContent('Preferred edition: Unavailable')
    expect(within(noEditionBookCard).queryByText(/Mentioned as/)).not.toBeInTheDocument()

    const longShipsCover = within(noEditionBookCard).getByRole('img', {
      name: 'Cover for The Long Ships: A Saga of the Viking Age by Frans G. Bengtsson',
    })
    fireEvent.error(longShipsCover)
    expect(
      within(noEditionBookCard).getByRole('img', {
        name: 'Cover unavailable for The Long Ships: A Saga of the Viking Age by Frans G. Bengtsson',
      }),
    ).toBeVisible()

    expect(unresolvedBookCard).toHaveTextContent('Unknown Book')
    expect(unresolvedBookCard).toHaveTextContent('Unknown Author')
    expect(within(unresolvedBookCard).getAllByText('Unresolved')).toHaveLength(2)
    expect(within(unresolvedBookCard).queryByText(/Open Library/)).not.toBeInTheDocument()
    expect(within(unresolvedBookCard).queryByText(/Preferred edition/)).not.toBeInTheDocument()
    expect(within(unresolvedBookCard).queryByRole('link')).not.toBeInTheDocument()
  })

  it('should expose only status-appropriate Book Work details when a Result card is opened', async () => {
    const user = userEvent.setup()
    fetchMock.mockResolvedValueOnce(jsonResponse(createBookWorkExtractionResponse()))
    render(<App />)

    await submitPublicVideo(user, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ')
    const resolvedBookCard = await screen.findByRole('button', {
      name: 'Open Open Library Book Work details for Pride and Prejudice by Jane Austen',
    })

    resolvedBookCard.focus()
    await user.keyboard('{Enter}')
    const resolvedBookDialog = await screen.findByRole('dialog', {
      name: 'Pride and Prejudice details',
    })
    const openLibraryLink = within(resolvedBookDialog).getByRole('link', {
      name: 'Open Pride and Prejudice on Open Library, opens in a new tab',
    })

    expect(within(resolvedBookDialog).getByRole('button', { name: 'Close details' })).toHaveFocus()
    expect(within(resolvedBookDialog).getAllByText('Jane Austen')).toHaveLength(2)
    expect(within(resolvedBookDialog).getByText('Pride & Prejudice by Jane Austen')).toBeVisible()
    expect(within(resolvedBookDialog).getByText('OL66554W')).toBeVisible()
    expect(
      within(resolvedBookDialog).getByText("Pride and Prejudice: A Collector's Edition · 1813"),
    ).toBeVisible()
    expect(
      within(resolvedBookDialog).getByText("Pride and Prejudice: A Collector's Edition"),
    ).toBeVisible()
    expect(within(resolvedBookDialog).getByText('1813')).toBeVisible()
    expect(within(resolvedBookDialog).getByText('T. Egerton')).toBeVisible()
    expect(within(resolvedBookDialog).getByText('0141439513')).toBeVisible()
    expect(within(resolvedBookDialog).getByText('9780141439518')).toBeVisible()
    expect(within(resolvedBookDialog).getByText('OL12345M')).toBeVisible()
    expect(openLibraryLink).toHaveTextContent('Open on Open Library')
    expect(openLibraryLink).toHaveAttribute('href', 'https://openlibrary.org/works/OL66554W')
    expect(openLibraryLink).toHaveAttribute('target', '_blank')
    expect(openLibraryLink).toHaveAttribute('rel', 'noopener noreferrer')

    await user.keyboard('{Escape}')
    expect(
      screen.queryByRole('dialog', { name: 'Pride and Prejudice details' }),
    ).not.toBeInTheDocument()
    expect(resolvedBookCard).toHaveFocus()

    const noEditionBookCard = screen.getByRole('button', {
      name: 'Open Open Library Book Work details for The Long Ships: A Saga of the Viking Age by Frans G. Bengtsson',
    })
    await user.click(noEditionBookCard)
    const noEditionBookDialog = await screen.findByRole('dialog', {
      name: 'The Long Ships: A Saga of the Viking Age details',
    })

    expect(within(noEditionBookDialog).getByText('Preferred Book Edition')).toBeVisible()
    expect(within(noEditionBookDialog).getByText('Unavailable')).toBeVisible()
    expect(within(noEditionBookDialog).queryByText('Open Library Edition title')).not.toBeInTheDocument()
    expect(within(noEditionBookDialog).queryByText('Book Edition publication year')).not.toBeInTheDocument()
    expect(within(noEditionBookDialog).queryByText('Publishers')).not.toBeInTheDocument()
    expect(within(noEditionBookDialog).queryByText('ISBN-10')).not.toBeInTheDocument()
    expect(within(noEditionBookDialog).queryByText('ISBN-13')).not.toBeInTheDocument()
    expect(within(noEditionBookDialog).queryByText('Open Library Edition ID')).not.toBeInTheDocument()

    await user.click(within(noEditionBookDialog).getByRole('button', { name: 'Close details' }))
    expect(noEditionBookCard).toHaveFocus()

    const unresolvedBookCard = screen.getByRole('button', {
      name: 'Open unresolved Book Mention details for Unknown Book by Unknown Author',
    })
    unresolvedBookCard.focus()
    await user.keyboard('{Enter}')
    const unresolvedBookDialog = await screen.findByRole('dialog', { name: 'Unknown Book details' })

    expect(within(unresolvedBookDialog).getByRole('button', { name: 'Close details' })).toHaveFocus()
    expect(
      within(unresolvedBookDialog).getByText(
        'Reelio could not verify this Book Mention against Open Library, so provider metadata and links are unavailable.',
      ),
    ).toBeVisible()
    expect(
      within(unresolvedBookDialog).getByRole('img', {
        name: 'No verified cover for Unknown Book by Unknown Author',
      }),
    ).toBeVisible()
    expect(within(unresolvedBookDialog).getAllByText('Unknown Author')).toHaveLength(2)
    expect(within(unresolvedBookDialog).queryByText('Open Library Work ID')).not.toBeInTheDocument()
    expect(within(unresolvedBookDialog).queryByText('Preferred Book Edition')).not.toBeInTheDocument()
    expect(within(unresolvedBookDialog).queryByText('Open Library Edition title')).not.toBeInTheDocument()
    expect(within(unresolvedBookDialog).queryByRole('img', { name: /Cover for/ })).not.toBeInTheDocument()
    expect(within(unresolvedBookDialog).queryByRole('link', { name: /Open Library/ })).not.toBeInTheDocument()
  })

  it('shows complete Transcript provenance and restores its trigger focus after closing', async () => {
    const user = userEvent.setup()
    const transcriptText =
      'First paragraph preserves the phrase marigold circuit.\n\nSecond paragraph preserves the phrase cobalt archive.'
    fetchMock.mockResolvedValueOnce(
      jsonResponse(
        createScreenWorkExtractionResponse({
          transcript: {
            text: transcriptText,
            language: 'en-GB',
            method: 'whisper',
          },
        }),
      ),
    )
    render(<App />)

    await submitPublicVideo(user, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ')
    const transcriptTrigger = await screen.findByRole('button', { name: 'View Transcript' })

    await user.click(transcriptTrigger)
    const dialog = await screen.findByRole('dialog', { name: 'Transcript' })
    expect(
      within(dialog).getByText((_, element) => element?.textContent === transcriptText, {
        selector: 'p',
      }),
    ).toBeVisible()
    expect(within(dialog).getByText('en-GB')).toBeVisible()
    expect(within(dialog).getByText('Speech transcription')).toBeVisible()
    expect(within(dialog).queryByText('whisper')).not.toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'Close Transcript' })).toHaveFocus()

    await user.click(within(dialog).getByRole('button', { name: 'Close Transcript' }))
    expect(screen.queryByRole('dialog', { name: 'Transcript' })).not.toBeInTheDocument()
    expect(transcriptTrigger).toHaveFocus()

    transcriptTrigger.focus()
    await user.keyboard('{Enter}')
    const reopenedDialog = await screen.findByRole('dialog', { name: 'Transcript' })
    expect(within(reopenedDialog).getByRole('button', { name: 'Close Transcript' })).toHaveFocus()

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog', { name: 'Transcript' })).not.toBeInTheDocument()
    expect(transcriptTrigger).toHaveFocus()
  })
})
