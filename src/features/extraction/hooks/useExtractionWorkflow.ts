import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ExtractionApiError,
  type ExtractionFailureCode,
  runSourceExtraction,
} from '../services/extractionApi'
import { DEFAULT_EFFECTIVE_MARKET, type EffectiveMarketCode } from '../constants/markets'
import { hasExtractionResults, type ExtractionResponse } from '../types'

interface WorkflowBaseState {
  url: string
  market: EffectiveMarketCode
}

interface ReadyState extends WorkflowBaseState {
  phase: 'ready'
}

interface PendingState extends WorkflowBaseState {
  phase: 'pending'
}

interface StoppedWaitingState extends WorkflowBaseState {
  phase: 'stopped-waiting'
  title: string
  message: string
}

interface ValidationErrorState extends WorkflowBaseState {
  phase: 'validation-error'
  message: string
  focusTarget: 'url' | 'status'
}

interface RecoveryErrorState extends WorkflowBaseState {
  title: string
  message: string
}

interface ServiceErrorState extends RecoveryErrorState {
  phase: 'service-error'
}

interface UnexpectedErrorState extends RecoveryErrorState {
  phase: 'unexpected-error'
}

interface EmptyState extends WorkflowBaseState {
  phase: 'empty'
  response: ExtractionResponse
}

interface CompletedState extends WorkflowBaseState {
  phase: 'completed'
  response: ExtractionResponse
}

export type ExtractionWorkflowState =
  | ReadyState
  | PendingState
  | StoppedWaitingState
  | ValidationErrorState
  | ServiceErrorState
  | UnexpectedErrorState
  | EmptyState
  | CompletedState

interface ExtractionWorkflow {
  state: ExtractionWorkflowState
  setUrl: (url: string) => void
  setMarket: (market: EffectiveMarketCode) => void
  submit: () => void
  stopWaiting: () => void
  retry: () => void
  startAnotherSource: () => void
}

const unexpectedRecovery: Pick<RecoveryErrorState, 'title' | 'message'> = {
  title: 'Something went wrong',
  message: 'Try again. Your public video link is still here.',
}

function getUrlValidationMessage(url: string): string | undefined {
  if (url.length === 0) {
    return 'Enter a public video link.'
  }

  if (url.length > 2048) {
    return 'Keep the public video link under 2,048 characters.'
  }

  try {
    const parsed = new URL(url)
    if ((parsed.protocol !== 'http:' && parsed.protocol !== 'https:') || !parsed.hostname) {
      return 'Enter a valid public video link.'
    }
  } catch {
    return 'Enter a valid public video link.'
  }

  return undefined
}

function getServiceRecovery(code: ExtractionFailureCode): Pick<RecoveryErrorState, 'title' | 'message'> {
  switch (code) {
    case 'source_unavailable':
      return {
        title: 'This video is unavailable',
        message: 'Make sure it is public, check the link, or choose another video.',
      }
    case 'duration_limit_exceeded':
      return {
        title: 'This video is too long',
        message: 'Choose a shorter public video.',
      }
    case 'interpretation_input_too_large':
      return {
        title: 'This video has more material than Reelio can process',
        message: 'Choose another video.',
      }
    case 'metadata_provider_failed':
    case 'transcription_failed':
      return {
        title: "Reelio couldn't read this video",
        message: 'Try again later or choose another video.',
      }
    case 'mention_interpretation_failed':
    case 'invalid_llm_response':
    case 'enrichment_failed':
    case 'catalog_provider_failed':
      return {
        title: "Reelio couldn't finish checking this video",
        message: 'Try again. If it keeps happening, choose another video.',
      }
    case 'pipeline_timeout':
      return {
        title: 'Checking this video took too long',
        message: 'Try again. Your public video link is still here.',
      }
    default:
      return unexpectedRecovery
  }
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError'
}

export function useExtractionWorkflow(): ExtractionWorkflow {
  const [state, setState] = useState<ExtractionWorkflowState>({
    phase: 'ready',
    url: '',
    market: DEFAULT_EFFECTIVE_MARKET,
  })
  const controllerRef = useRef<AbortController | null>(null)
  const requestGenerationRef = useRef(0)

  useEffect(() => {
    return () => {
      requestGenerationRef.current += 1
      controllerRef.current?.abort()
      controllerRef.current = null
    }
  }, [])

  const startRequest = useCallback((rawUrl: string, market: EffectiveMarketCode) => {
    const url = rawUrl.trim()
    const validationMessage = getUrlValidationMessage(url)
    if (validationMessage !== undefined) {
      setState({
        phase: 'validation-error',
        url,
        market,
        message: validationMessage,
        focusTarget: 'url',
      })
      return
    }

    requestGenerationRef.current += 1
    const generation = requestGenerationRef.current
    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller
    setState({ phase: 'pending', url, market })

    void runSourceExtraction({ url, market }, controller.signal)
      .then((response) => {
        if (requestGenerationRef.current !== generation) {
          return
        }

        controllerRef.current = null
        setState({
          phase: hasExtractionResults(response.results) ? 'completed' : 'empty',
          url,
          market,
          response,
        })
      })
      .catch((error: unknown) => {
        if (requestGenerationRef.current !== generation || isAbortError(error)) {
          return
        }

        controllerRef.current = null
        if (error instanceof ExtractionApiError) {
          switch (error.code) {
            case 'invalid_source':
              setState({
                phase: 'validation-error',
                url,
                market,
                message: 'Enter a valid public video link.',
                focusTarget: 'url',
              })
              return
            case 'unsupported_platform':
              setState({
                phase: 'validation-error',
                url,
                market,
                message: 'Use a public YouTube, Instagram, Facebook, TikTok, or X link.',
                focusTarget: 'url',
              })
              return
            case 'invalid_request':
              setState({
                phase: 'validation-error',
                url,
                market,
                message: 'Check the public video link and Region, then try again.',
                focusTarget: 'status',
              })
              return
            default: {
              const recovery = getServiceRecovery(error.code)
              setState({ phase: 'service-error', url, market, ...recovery })
              return
            }
          }
        }

        setState({ phase: 'unexpected-error', url, market, ...unexpectedRecovery })
      })
  }, [])

  const setUrl = useCallback((url: string) => {
    setState((current) => {
      if (current.phase === 'pending') {
        return current
      }

      return { phase: 'ready', url, market: current.market }
    })
  }, [])

  const setMarket = useCallback((market: EffectiveMarketCode) => {
    setState((current) => {
      if (current.phase === 'pending') {
        return current
      }

      return { phase: 'ready', url: current.url, market }
    })
  }, [])

  const submit = useCallback(() => {
    if (state.phase !== 'pending') {
      startRequest(state.url, state.market)
    }
  }, [startRequest, state])

  const stopWaiting = useCallback(() => {
    if (state.phase !== 'pending') {
      return
    }

    requestGenerationRef.current += 1
    controllerRef.current?.abort()
    controllerRef.current = null
    setState({
      phase: 'stopped-waiting',
      url: state.url,
      market: state.market,
      title: 'Stopped waiting',
      message: 'You stopped waiting in this browser. Reelio may still be checking the video on the server.',
    })
  }, [state])

  const retry = useCallback(() => {
    if (state.phase !== 'pending') {
      startRequest(state.url, state.market)
    }
  }, [startRequest, state])

  const startAnotherSource = useCallback(() => {
    requestGenerationRef.current += 1
    controllerRef.current?.abort()
    controllerRef.current = null
    setState({ phase: 'ready', url: '', market: state.market })
  }, [state.market])

  return { state, setUrl, setMarket, submit, stopWaiting, retry, startAnotherSource }
}
