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
  await user.click(screen.getByRole('button', { name: 'Discover' }))
}

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})

describe('video discovery application', () => {
  it('should reject blank, malformed, and overlong URLs without calling the API', async () => {
    const user = userEvent.setup()
    render(<App />)
    const input = screen.getByLabelText('Public video link')

    await user.click(screen.getByRole('button', { name: 'Discover' }))
    expect(await screen.findByText('Enter a public video link.')).toBeVisible()
    expect(input).toHaveFocus()

    await user.type(input, 'not a public URL')
    await user.click(screen.getByRole('button', { name: 'Discover' }))
    expect(await screen.findByText('Enter a valid public video link.')).toBeVisible()
    expect(input).toHaveFocus()

    fireEvent.change(input, { target: { value: `https://example.com/${'a'.repeat(2049)}` } })
    await user.click(screen.getByRole('button', { name: 'Discover' }))
    expect(
      await screen.findByText('Keep the public video link under 2,048 characters.'),
    ).toBeVisible()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('should accept every supported platform URL and send each trimmed request when submitted', async () => {
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

      await user.click(screen.getByRole('button', { name: 'Check another video' }))
    }
  })

  it('should preserve Region in page memory and reset it after remount when checking another video', async () => {
    const user = userEvent.setup()
    const rendered = render(<App />)

    expect(screen.getByRole('heading', { name: 'Discover movies, music & more' })).toBeVisible()
    expect(
      screen.getByText('Find the movies, shows, songs, and books hiding in your favorite videos'),
    ).toBeVisible()
    expect(screen.getByRole('button', { name: 'Discover' })).toBeVisible()
    expect(screen.getByText('Advanced options').closest('details')).not.toHaveAttribute('open')

    await user.click(screen.getByText('Advanced options'))
    expect(screen.getByText('Advanced options').closest('details')).toHaveAttribute('open')
    const marketSelect = screen.getByLabelText('Region')
    expect(marketSelect).toHaveValue('US')
    expect(marketSelect).toHaveDisplayValue('United States')

    await user.selectOptions(marketSelect, 'JP')
    fetchMock.mockResolvedValueOnce(jsonResponse(createEmptyExtractionResponse({ market: 'JP' })))
    await submitPublicVideo(user, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ')
    expect(await screen.findByText('Region: Japan')).toBeVisible()
    expect(JSON.parse(String((fetchMock.mock.calls[0] as [string, RequestInit])[1].body))).toEqual({
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      market: 'JP',
    })

    await user.click(screen.getByRole('button', { name: 'Check another video' }))
    expect(screen.getByLabelText('Region')).toHaveValue('JP')
    expect(screen.getByLabelText('Public video link')).toHaveValue('')
    expect(screen.getByLabelText('Public video link')).toHaveFocus()
    expect(screen.getByText('Advanced options').closest('details')).not.toHaveAttribute('open')

    rendered.unmount()
    render(<App />)
    expect(screen.getByLabelText('Region')).toHaveValue('US')
  })

  it('should keep cancellation honest and retry freshly when a request remains pending', async () => {
    const user = userEvent.setup()
    const signals: AbortSignal[] = []
    fetchMock.mockImplementation((_: string, request: RequestInit) => {
      signals.push(request.signal as AbortSignal)
      return new Promise<Response>(() => { })
    })
    render(<App />)

    await submitPublicVideo(user, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ')
    expect(await screen.findByRole('heading', { name: 'Checking this video...' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Discover' })).toBeDisabled()
    expect(screen.getByLabelText('Public video link')).toBeDisabled()
    expect(screen.getByLabelText('Region')).toBeDisabled()
    expect(document.querySelectorAll('.pending-placeholder')).toHaveLength(4)
    expect(screen.queryByText(/Movies|TV Series|Songs|Books/)).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(await screen.findByText('You can start a new discovery anytime.')).toBeVisible()
    expect(signals[0]?.aborted).toBe(true)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(screen.getByLabelText('Public video link')).toBeEnabled()
    expect(screen.getByRole('heading', { name: 'Discovery cancelled' })).toHaveFocus()

    await user.click(screen.getByRole('button', { name: 'Try again' }))
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
    expect(signals[1]).not.toBe(signals[0])
    expect(signals[1]?.aborted).toBe(false)
    expect(fetchMock.mock.calls.every(([path]) => path === '/api/extractions')).toBe(true)
  })

  it('should render plain-language recovery actions without backend details when known failures occur', async () => {
    const user = userEvent.setup()
    render(<App />)
    const cases = [
      [
        404,
        'source_unavailable',
        'This video is unavailable',
        'Make sure it is public, check the link, or choose another video.',
      ],
      [413, 'duration_limit_exceeded', 'This video is too long', 'Choose a shorter public video.'],
      [
        413,
        'interpretation_input_too_large',
        'This video has more material than Reelio can process',
        'Choose another video.',
      ],
      [
        502,
        'metadata_provider_failed',
        "Reelio couldn't read this video",
        'Try again later or choose another video.',
      ],
      [
        502,
        'mention_interpretation_failed',
        "Reelio couldn't finish checking this video",
        'Try again. If it keeps happening, choose another video.',
      ],
      [
        504,
        'pipeline_timeout',
        'Checking this video took too long',
        'Try again. Your public video link is still here.',
      ],
    ] as const

    fetchMock.mockResolvedValueOnce(jsonResponse({ detail: ['ignored'] }, 422))
    await submitPublicVideo(user, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ')
    expect(
      await screen.findByText('Check the public video link and Region, then try again.'),
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
      expect(screen.getByRole('button', { name: 'Choose another video' })).toBeVisible()

      await user.click(screen.getByRole('button', { name: 'Choose another video' }))
      expect(screen.getByLabelText('Public video link')).toHaveFocus()
    }
  })

  it('should recover safely when network and malformed response failures occur', async () => {
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

      await user.click(screen.getByRole('button', { name: 'Choose another video' }))
    }
  })

  it('should show canonical video context without statistics when results are empty', async () => {
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
    const videoRegion = screen.getByRole('region', { name: 'Video' })
    const canonicalLink = screen.getByRole('link', { name: /Canonical returned Source on TikTok/ })
    expect(canonicalLink).toHaveAttribute('href', canonicalUrl)
    expect(canonicalLink).toHaveAttribute('target', '_blank')
    expect(screen.getByText(/TikTok · Channel unavailable · 1 hr 1 min 1 sec/)).toBeVisible()
    expect(screen.getByText('Region: Japan')).toBeVisible()
    expect(emptyHeading).toHaveFocus()
    expect(screen.queryByText('Description that must not be rendered')).not.toBeInTheDocument()
    expect(within(videoRegion).getByRole('button', { name: 'View Transcript' })).toBeVisible()
    expect(within(videoRegion).getByRole('button', { name: 'Check another video' })).toBeVisible()
    expect(screen.queryByText(/n_mentions|n_resolved|n_unresolved/)).not.toBeInTheDocument()
  })

  it('should use a plain platform-video fallback when the provider title is absent', async () => {
    const user = userEvent.setup()
    const canonicalUrl = 'https://x.com/reelio/status/123456789'
    fetchMock.mockResolvedValueOnce(
      jsonResponse(
        createEmptyExtractionResponse({
          source: {
            platform: 'x',
            url: canonicalUrl,
            title: '',
          },
        }),
      ),
    )
    render(<App />)

    await submitPublicVideo(user, canonicalUrl)
    const videoLink = await screen.findByRole('link', {
      name: 'X video on X, opens in a new tab',
    })

    expect(videoLink).toHaveTextContent('X video')
    expect(videoLink).toHaveAttribute('href', canonicalUrl)
  })

  it('should announce and focus Results with associated level-two category headings when results complete', async () => {
    const user = userEvent.setup()
    fetchMock.mockResolvedValueOnce(jsonResponse(createBookWorkExtractionResponse()))
    render(<App />)

    await submitPublicVideo(user, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ')
    const resultsRegion = await screen.findByRole('region', { name: 'Results' })
    const categoryHeadings = screen.getAllByRole('heading', { level: 2 })

    expect(categoryHeadings.map(({ textContent }) => textContent)).toEqual([
      'Movies',
      'TV Series',
      'Songs',
      'Albums',
      'Books',
    ])
    for (const heading of categoryHeadings) {
      const region = screen.getByRole('region', { name: heading.textContent ?? '' })
      expect(region).toHaveAttribute('aria-labelledby', heading.id)
      expect(within(region).getByRole('list')).toBeVisible()
    }
    expect(screen.getByRole('link', { name: 'Skip to main content' })).toHaveAttribute('href', '#main')
    expect(screen.getByRole('status')).toHaveTextContent('Results ready')
    expect(resultsRegion).toHaveFocus()
    expect(screen.queryByRole('heading', { name: 'Extraction complete' })).not.toBeInTheDocument()
    expect(screen.queryByText('Result Statistics')).not.toBeInTheDocument()
    expect(screen.queryByText(/n_mentions|n_resolved|n_unresolved/)).not.toBeInTheDocument()
  })

  it('should omit empty result categories while preserving order when results are partial', async () => {
    const user = userEvent.setup()
    const response = createBookWorkExtractionResponse()
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        ...response,
        results: {
          ...response.results,
          movies: [],
          music_releases: [],
        },
      }),
    )
    render(<App />)

    await submitPublicVideo(user, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ')
    await screen.findByRole('region', { name: 'Results' })

    expect(
      screen.getAllByRole('heading', { level: 2 }).map(({ textContent }) => textContent),
    ).toEqual(['TV Series', 'Songs', 'Books'])
  })

  it('should render resolved and unverified Movies and TV Series when completed results contain Screen Works', async () => {
    const user = userEvent.setup()
    fetchMock.mockResolvedValueOnce(jsonResponse(createScreenWorkExtractionResponse()))
    render(<App />)

    await submitPublicVideo(user, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ')
    const resultsRegion = await screen.findByRole('region', { name: 'Results' })
    const moviesHeading = screen.getByRole('heading', { name: 'Movies' })
    const tvSeriesHeading = screen.getByRole('heading', { name: 'TV Series' })
    const resolvedMovieCard = screen.getByRole('button', {
      name: "Open details for Le Fabuleux Destin d'Amélie Poulain",
    })
    const unverifiedMovieCard = screen.getByRole('button', { name: 'Open details for Unknown Movie' })
    const resolvedTvSeriesCard = screen.getByRole('button', { name: 'Open details for The Last of Us' })
    const unverifiedTvSeriesCard = screen.getByRole('button', {
      name: 'Open details for Unknown TV Series',
    })

    expect(resultsRegion).toHaveFocus()
    expect(screen.getAllByRole('heading').indexOf(moviesHeading)).toBeLessThan(
      screen.getAllByRole('heading').indexOf(tvSeriesHeading),
    )
    expect(resolvedMovieCard).toHaveTextContent("Le Fabuleux Destin d'Amélie Poulain")
    expect(resolvedMovieCard).toHaveTextContent('2000')
    expect(resolvedMovieCard).toHaveTextContent('7.9')
    expect(resolvedMovieCard).not.toHaveTextContent('TMDB')
    expect(resolvedMovieCard).not.toHaveTextContent('/ 10')
    expect(screen.queryByText(/Mentioned as/)).not.toBeInTheDocument()
    expect(
      within(resolvedMovieCard).getByRole('img', {
        name: "Poster unavailable for Le Fabuleux Destin d'Amélie Poulain",
      }),
    ).toBeVisible()

    const tvPoster = within(resolvedTvSeriesCard).getByRole('img', {
      name: 'Poster for The Last of Us',
    })
    expect(resolvedTvSeriesCard).toHaveTextContent('2023')
    expect(resolvedTvSeriesCard).toHaveTextContent('8.6')
    expect(resolvedTvSeriesCard).not.toHaveTextContent('TMDB')
    expect(resolvedTvSeriesCard).not.toHaveTextContent('/ 10')
    fireEvent.error(tvPoster)
    expect(
      within(resolvedTvSeriesCard).getByRole('img', {
        name: 'Poster unavailable for The Last of Us',
      }),
    ).toBeVisible()
    expect(within(unverifiedMovieCard).getByText('Not verified')).toBeVisible()
    expect(within(unverifiedTvSeriesCard).getByText('Not verified')).toBeVisible()
    expect(within(unverifiedMovieCard).queryByRole('img')).not.toBeInTheDocument()
    expect(within(unverifiedTvSeriesCard).queryByRole('img')).not.toBeInTheDocument()
    expect(screen.queryByText(/Result Statistics/)).not.toBeInTheDocument()
  })

  it('should show useful verified details and restore focus when a Result card is opened', async () => {
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
    expect(within(resolvedDialog).getByText('First aired')).toBeVisible()
    expect(within(resolvedDialog).getByText('Last aired')).toBeVisible()
    expect(within(resolvedDialog).getByText('Not available')).toBeVisible()
    expect(within(resolvedDialog).getByText('Score')).toBeVisible()
    expect(within(resolvedDialog).getByText('8.6')).toBeVisible()
    expect(within(resolvedDialog).queryByText('Interpreted as')).not.toBeInTheDocument()
    expect(tmdbLink).toHaveTextContent('Open on TMDB')
    expect(tmdbLink).toHaveAttribute('href', 'https://www.themoviedb.org/tv/100088')
    expect(tmdbLink).toHaveAttribute('target', '_blank')
    expect(tmdbLink).toHaveAttribute('rel', 'noopener noreferrer')

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog', { name: 'The Last of Us details' })).not.toBeInTheDocument()
    expect(resolvedTvSeriesCard).toHaveFocus()

    const resolvedMovieCard = screen.getByRole('button', {
      name: "Open details for Le Fabuleux Destin d'Amélie Poulain",
    })
    await user.click(resolvedMovieCard)
    const movieDialog = await screen.findByRole('dialog', {
      name: "Le Fabuleux Destin d'Amélie Poulain details",
    })

    expect(within(movieDialog).getByText('Interpreted as')).toBeVisible()
    expect(within(movieDialog).getByText('Amélie (2001)')).toBeVisible()
    expect(within(movieDialog).queryByText(/Mentioned as/)).not.toBeInTheDocument()

    await user.keyboard('{Escape}')

    const unverifiedMovieCard = screen.getByRole('button', { name: 'Open details for Unknown Movie' })
    unverifiedMovieCard.focus()
    await user.keyboard('{Enter}')
    const unverifiedDialog = await screen.findByRole('dialog', { name: 'Unknown Movie details' })

    expect(within(unverifiedDialog).getByText('Not verified')).toBeVisible()
    expect(
      within(unverifiedDialog).getByText(
        'We could not verify this movie from the video, so confirmed details are unavailable.',
      ),
    ).toBeVisible()
    expect(within(unverifiedDialog).queryByRole('img')).not.toBeInTheDocument()
    expect(
      within(unverifiedDialog).queryByText('A Parisian woman quietly improves the lives around her.'),
    ).not.toBeInTheDocument()
    expect(within(unverifiedDialog).queryByText('Directors')).not.toBeInTheDocument()
    expect(within(unverifiedDialog).queryByText('Cast')).not.toBeInTheDocument()
    expect(within(unverifiedDialog).queryByText('Score')).not.toBeInTheDocument()
    expect(within(unverifiedDialog).queryByRole('link', { name: /TMDB/ })).not.toBeInTheDocument()
  })

  it('should render Songs and Albums without provider copy when a completed Extraction contains music Results', async () => {
    const user = userEvent.setup()
    fetchMock.mockResolvedValueOnce(jsonResponse(createMusicExtractionResponse()))
    render(<App />)

    await submitPublicVideo(user, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ')
    const songsSection = await screen.findByRole('region', { name: 'Songs' })
    const albumsSection = screen.getByRole('region', { name: 'Albums' })
    const resolvedSongCard = within(songsSection).getByRole('button', {
      name: 'Open details for One More Time (2011 Remaster)',
    })
    const metadataMissingSongCard = within(songsSection).getByRole('button', {
      name: 'Open details for Metadata Missing',
    })
    const unverifiedSongCard = within(songsSection).getByRole('button', {
      name: 'Open details for Unknown Track',
    })
    const resolvedAlbumCard = within(albumsSection).getByRole('button', {
      name: 'Open details for Random Access Memories',
    })
    const singleAlbumCard = within(albumsSection).getByRole('button', {
      name: 'Open details for A Single Evening',
    })
    const compilationAlbumCard = within(albumsSection).getByRole('button', {
      name: 'Open details for Collected Nights',
    })
    const unverifiedAlbumCard = within(albumsSection).getByRole('button', {
      name: 'Open details for Unknown Release',
    })

    expect(resolvedSongCard).toHaveTextContent('One More Time (2011 Remaster)')
    expect(resolvedSongCard).toHaveTextContent('DAFT PUNK, Romanthony')
    expect(resolvedSongCard).toHaveTextContent('Discovery (Deluxe Edition)')
    expect(
      within(resolvedSongCard).getByRole('img', {
        name: 'Cover unavailable for One More Time (2011 Remaster) by DAFT PUNK, Romanthony',
      }),
    ).toBeVisible()
    expect(within(metadataMissingSongCard).queryByText(/Released/)).not.toBeInTheDocument()
    expect(within(resolvedSongCard).queryByText(/Spotify|Preferred release|Mentioned as/)).not.toBeInTheDocument()

    expect(within(resolvedAlbumCard).queryByText('2013-05-17')).not.toBeInTheDocument()
    expect(within(singleAlbumCard).queryByText('2022-10-07')).not.toBeInTheDocument()
    expect(within(compilationAlbumCard).queryByText(/\d{4}-\d{2}-\d{2}/)).not.toBeInTheDocument()
    expect(within(resolvedAlbumCard).queryByText(/Spotify|Album type|Mentioned as/)).not.toBeInTheDocument()
    expect(within(albumsSection).getAllByRole('button')).toHaveLength(4)

    const musicReleaseCover = within(resolvedAlbumCard).getByRole('img', {
      name: 'Cover for Random Access Memories by Daft Punk',
    })
    fireEvent.error(musicReleaseCover)
    expect(
      within(resolvedAlbumCard).getByRole('img', {
        name: 'Cover unavailable for Random Access Memories by Daft Punk',
      }),
    ).toBeVisible()

    expect(unverifiedSongCard).toHaveTextContent('Unknown Track')
    expect(unverifiedSongCard).toHaveTextContent('Unknown Artist')
    expect(unverifiedSongCard).toHaveTextContent('Not verified')
    expect(within(unverifiedSongCard).queryByRole('img')).not.toBeInTheDocument()
    expect(within(unverifiedSongCard).queryByText(/Spotify|Unresolved/)).not.toBeInTheDocument()
    expect(unverifiedAlbumCard).toHaveTextContent('Unknown Release')
    expect(unverifiedAlbumCard).not.toHaveTextContent('2024')
    expect(unverifiedAlbumCard).toHaveTextContent('Not verified')
    expect(within(unverifiedAlbumCard).queryByRole('img')).not.toBeInTheDocument()
    expect(within(unverifiedAlbumCard).queryByText(/Spotify|Unresolved/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Result Statistics|n_mentions|n_resolved|n_unresolved/)).not.toBeInTheDocument()
  })

  it('should expose plain music details and restore focus when a Result card is opened', async () => {
    const user = userEvent.setup()
    fetchMock.mockResolvedValueOnce(jsonResponse(createMusicExtractionResponse()))
    render(<App />)

    await submitPublicVideo(user, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ')
    const resolvedSongCard = await screen.findByRole('button', {
      name: 'Open details for One More Time (2011 Remaster)',
    })

    resolvedSongCard.focus()
    await user.keyboard('{Enter}')
    const resolvedSongDialog = await screen.findByRole('dialog', {
      name: 'One More Time (2011 Remaster) details',
    })
    const songSpotifyLink = within(resolvedSongDialog).getByRole('link', {
      name: 'Open One More Time (2011 Remaster) on Spotify, opens in a new tab',
    })

    expect(within(resolvedSongDialog).getByRole('button', { name: 'Close details' })).toHaveFocus()
    expect(within(resolvedSongDialog).getByText('Song title')).toBeVisible()
    expect(within(resolvedSongDialog).getByText('Artist')).toBeVisible()
    expect(within(resolvedSongDialog).getByText('Album')).toBeVisible()
    expect(within(resolvedSongDialog).getByText('Released')).toBeVisible()
    expect(within(resolvedSongDialog).getByText('Interpreted as')).toBeVisible()
    expect(
      within(resolvedSongDialog).getByText(
        'One More Time by Daft Punk, Romanthony · Discovery (2001)',
      ),
    ).toBeVisible()
    expect(within(resolvedSongDialog).queryByText(/Spotify (Track|Album) ID|Preferred Music Release|Music Release type/)).not.toBeInTheDocument()
    expect(songSpotifyLink).toHaveTextContent('Open on Spotify')
    expect(songSpotifyLink).toHaveAttribute(
      'href',
      'https://open.spotify.com/track/spotify-track-one-more-time',
    )
    expect(songSpotifyLink).toHaveAttribute('target', '_blank')
    expect(songSpotifyLink).toHaveAttribute('rel', 'noopener noreferrer')

    await user.keyboard('{Escape}')
    expect(resolvedSongCard).toHaveFocus()

    const resolvedAlbumCard = screen.getByRole('button', {
      name: 'Open details for Random Access Memories',
    })
    await user.click(resolvedAlbumCard)
    const resolvedAlbumDialog = await screen.findByRole('dialog', {
      name: 'Random Access Memories details',
    })
    const albumSpotifyLink = within(resolvedAlbumDialog).getByRole('link', {
      name: 'Open Random Access Memories on Spotify, opens in a new tab',
    })

    expect(within(resolvedAlbumDialog).getByRole('button', { name: 'Close details' })).toHaveFocus()
    expect(within(resolvedAlbumDialog).getByText('Album')).toBeVisible()
    expect(within(resolvedAlbumDialog).getByText('Artist')).toBeVisible()
    expect(within(resolvedAlbumDialog).getByText('Released')).toBeVisible()
    expect(within(resolvedAlbumDialog).queryByText('Interpreted as')).not.toBeInTheDocument()
    expect(within(resolvedAlbumDialog).queryByText(/Spotify Album ID|Music Release type/)).not.toBeInTheDocument()
    expect(albumSpotifyLink).toHaveAttribute(
      'href',
      'https://open.spotify.com/album/spotify-album-random-access-memories',
    )
    expect(albumSpotifyLink).toHaveAttribute('target', '_blank')
    expect(albumSpotifyLink).toHaveAttribute('rel', 'noopener noreferrer')

    await user.click(within(resolvedAlbumDialog).getByRole('button', { name: 'Close details' }))
    expect(resolvedAlbumCard).toHaveFocus()

    const unverifiedSongCard = screen.getByRole('button', { name: 'Open details for Unknown Track' })
    unverifiedSongCard.focus()
    await user.keyboard('{Enter}')
    const unverifiedSongDialog = await screen.findByRole('dialog', {
      name: 'Unknown Track details',
    })

    expect(within(unverifiedSongDialog).getByRole('button', { name: 'Close details' })).toHaveFocus()
    expect(within(unverifiedSongDialog).getByText('Not verified')).toBeVisible()
    expect(within(unverifiedSongDialog).getByText('Song title')).toBeVisible()
    expect(within(unverifiedSongDialog).getByText('Artist')).toBeVisible()
    expect(
      within(unverifiedSongDialog).getByText(
        'We could not verify this song from the video, so confirmed details are unavailable.',
      ),
    ).toBeVisible()
    expect(within(unverifiedSongDialog).queryByRole('img')).not.toBeInTheDocument()
    expect(within(unverifiedSongDialog).queryByText(/Spotify|Interpreted as/)).not.toBeInTheDocument()
    expect(within(unverifiedSongDialog).queryByRole('link')).not.toBeInTheDocument()

    await user.keyboard('{Escape}')
    expect(unverifiedSongCard).toHaveFocus()
  })

  it('should display verified and Not verified Books without provider card copy when results contain Book Work Results', async () => {
    const user = userEvent.setup()
    const response = createBookWorkExtractionResponse()
    const noMetadataBook = response.results.books[1]

    if (noMetadataBook === undefined || noMetadataBook.status !== 'resolved') {
      throw new Error('Book fixture must contain a resolved result without an edition.')
    }

    noMetadataBook.book.authors = []
    fetchMock.mockResolvedValueOnce(jsonResponse(response))
    render(<App />)

    await submitPublicVideo(user, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ')
    await screen.findByRole('heading', { name: 'Books' })
    const resolvedBookCard = screen.getByRole('button', {
      name: 'Open details for Pride and Prejudice by Jane Austen',
    })
    const noMetadataBookCard = screen.getByRole('button', {
      name: 'Open details for The Long Ships: A Saga of the Viking Age',
    })
    const unverifiedBookCard = screen.getByRole('button', {
      name: 'Open details for Unknown Book by Unknown Author',
    })

    expect(resolvedBookCard).toHaveTextContent('Pride and Prejudice')
    expect(resolvedBookCard).toHaveTextContent('Jane Austen')
    expect(resolvedBookCard).toHaveTextContent('1813')
    expect(
      within(resolvedBookCard).getByRole('img', {
        name: 'Cover unavailable for Pride and Prejudice by Jane Austen',
      }),
    ).toBeVisible()
    expect(
      within(resolvedBookCard).queryByText(/Open Library|Preferred edition|Mentioned as/),
    ).not.toBeInTheDocument()

    expect(noMetadataBookCard).not.toHaveTextContent('Author Credits unavailable')
    expect(noMetadataBookCard).not.toHaveTextContent('Published')
    const longShipsCover = within(noMetadataBookCard).getByRole('img', {
      name: 'Cover for The Long Ships: A Saga of the Viking Age',
    })
    fireEvent.error(longShipsCover)
    expect(
      within(noMetadataBookCard).getByRole('img', {
        name: 'Cover unavailable for The Long Ships: A Saga of the Viking Age',
      }),
    ).toBeVisible()

    expect(unverifiedBookCard).toHaveTextContent('Unknown Book')
    expect(unverifiedBookCard).toHaveTextContent('Unknown Author')
    expect(within(unverifiedBookCard).getByText('Not verified')).toBeVisible()
    expect(within(unverifiedBookCard).queryByRole('img')).not.toBeInTheDocument()
    expect(within(unverifiedBookCard).queryByText(/Open Library|Published/)).not.toBeInTheDocument()
    expect(within(unverifiedBookCard).queryByRole('link')).not.toBeInTheDocument()
  })

  it('should show useful Book details and restore focus when a Result card is opened', async () => {
    const user = userEvent.setup()
    fetchMock.mockResolvedValueOnce(jsonResponse(createBookWorkExtractionResponse()))
    render(<App />)

    await submitPublicVideo(user, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ')
    const resolvedBookCard = await screen.findByRole('button', {
      name: 'Open details for Pride and Prejudice by Jane Austen',
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
    expect(within(resolvedBookDialog).getByText('Book title')).toBeVisible()
    expect(within(resolvedBookDialog).getByText('Author')).toBeVisible()
    expect(within(resolvedBookDialog).getByText('Interpreted as')).toBeVisible()
    expect(within(resolvedBookDialog).getByText('Pride & Prejudice by Jane Austen')).toBeVisible()
    expect(within(resolvedBookDialog).getByText('Published')).toBeVisible()
    expect(within(resolvedBookDialog).getByText('Publisher')).toBeVisible()
    expect(within(resolvedBookDialog).getByText('ISBN-10')).toBeVisible()
    expect(within(resolvedBookDialog).getByText('ISBN-13')).toBeVisible()
    expect(within(resolvedBookDialog).getByText('1813')).toBeVisible()
    expect(within(resolvedBookDialog).getByText('T. Egerton')).toBeVisible()
    expect(within(resolvedBookDialog).getByText('0141439513')).toBeVisible()
    expect(within(resolvedBookDialog).getByText('9780141439518')).toBeVisible()
    expect(within(resolvedBookDialog).queryByText(/Open Library (title|Work ID|Edition)/)).not.toBeInTheDocument()
    expect(within(resolvedBookDialog).queryByText('Preferred Book Edition')).not.toBeInTheDocument()
    expect(within(resolvedBookDialog).queryByText('OL66554W')).not.toBeInTheDocument()
    expect(within(resolvedBookDialog).queryByText('OL12345M')).not.toBeInTheDocument()
    expect(openLibraryLink).toHaveTextContent('Open on Open Library')
    expect(openLibraryLink).toHaveAttribute('href', 'https://openlibrary.org/works/OL66554W')
    expect(openLibraryLink).toHaveAttribute('target', '_blank')
    expect(openLibraryLink).toHaveAttribute('rel', 'noopener noreferrer')

    await user.keyboard('{Escape}')
    expect(
      screen.queryByRole('dialog', { name: 'Pride and Prejudice details' }),
    ).not.toBeInTheDocument()
    expect(resolvedBookCard).toHaveFocus()

    const noMetadataBookCard = screen.getByRole('button', {
      name: 'Open details for The Long Ships: A Saga of the Viking Age by Frans G. Bengtsson',
    })
    await user.click(noMetadataBookCard)
    const noMetadataBookDialog = await screen.findByRole('dialog', {
      name: 'The Long Ships: A Saga of the Viking Age details',
    })

    expect(within(noMetadataBookDialog).queryByText('Published')).not.toBeInTheDocument()
    expect(within(noMetadataBookDialog).queryByText('Publisher')).not.toBeInTheDocument()
    expect(within(noMetadataBookDialog).queryByText('ISBN-10')).not.toBeInTheDocument()
    expect(within(noMetadataBookDialog).queryByText('ISBN-13')).not.toBeInTheDocument()

    await user.click(within(noMetadataBookDialog).getByRole('button', { name: 'Close details' }))
    expect(noMetadataBookCard).toHaveFocus()

    const unverifiedBookCard = screen.getByRole('button', {
      name: 'Open details for Unknown Book by Unknown Author',
    })
    unverifiedBookCard.focus()
    await user.keyboard('{Enter}')
    const unverifiedBookDialog = await screen.findByRole('dialog', { name: 'Unknown Book details' })

    expect(within(unverifiedBookDialog).getByRole('button', { name: 'Close details' })).toHaveFocus()
    expect(within(unverifiedBookDialog).getByText('Book title')).toBeVisible()
    expect(within(unverifiedBookDialog).getByText('Author')).toBeVisible()
    expect(within(unverifiedBookDialog).getByText('Not verified')).toBeVisible()
    expect(
      within(unverifiedBookDialog).getByText(
        'We could not verify this book from the video, so confirmed details are unavailable.',
      ),
    ).toBeVisible()
    expect(within(unverifiedBookDialog).queryByRole('img')).not.toBeInTheDocument()
    expect(within(unverifiedBookDialog).queryByText(/Open Library|Published|Publisher|ISBN/)).not.toBeInTheDocument()
    expect(within(unverifiedBookDialog).queryByRole('link')).not.toBeInTheDocument()

    await user.keyboard('{Escape}')
    expect(unverifiedBookCard).toHaveFocus()
  })

  it('should preserve Transcript context and trigger focus when pointer and keyboard actions close it', async () => {
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
    const backdropDialog = await screen.findByRole('dialog', { name: 'Transcript' })
    fireEvent.click(backdropDialog)
    expect(screen.queryByRole('dialog', { name: 'Transcript' })).not.toBeInTheDocument()
    expect(transcriptTrigger).toHaveFocus()

    await user.keyboard('{Enter}')
    const reopenedDialog = await screen.findByRole('dialog', { name: 'Transcript' })
    expect(within(reopenedDialog).getByRole('button', { name: 'Close Transcript' })).toHaveFocus()

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog', { name: 'Transcript' })).not.toBeInTheDocument()
    expect(transcriptTrigger).toHaveFocus()
  })
})
