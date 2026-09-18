import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent, { type UserEvent } from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import {
  createEmptyExtractionResponse,
  createNonEmptyExtractionResponse,
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
    const canonicalLink = screen.getByRole('link', { name: /Canonical returned Source on TikTok/ })
    expect(canonicalLink).toHaveAttribute('href', canonicalUrl)
    expect(canonicalLink).toHaveAttribute('target', '_blank')
    expect(screen.getByText(/TikTok · Channel unavailable · 1 hr 1 min 1 sec/)).toBeVisible()
    expect(screen.getByText('Effective Market: Japan')).toBeVisible()
    expect(emptyHeading).toHaveFocus()
    expect(screen.queryByText('Description that must not be rendered')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /transcript/i })).not.toBeInTheDocument()
    expect(screen.queryByText(/n_mentions|n_resolved|n_unresolved/)).not.toBeInTheDocument()
  })

  it('keeps a non-empty Extraction truthful until later Result renderers exist', async () => {
    const user = userEvent.setup()
    fetchMock.mockResolvedValueOnce(jsonResponse(createNonEmptyExtractionResponse()))
    render(<App />)

    await submitPublicVideo(user, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ')
    const completedHeading = await screen.findByRole('heading', { name: 'Extraction complete' })
    expect(completedHeading).toHaveFocus()
    expect(screen.queryByRole('heading', { name: 'No results found' })).not.toBeInTheDocument()
    expect(screen.queryByText('Unrendered Movie')).not.toBeInTheDocument()
    expect(screen.queryByText(/Result Statistics|Movies|TV Series|Tracks|Music Releases|Book Works/)).not.toBeInTheDocument()
  })
})
