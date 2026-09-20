import { useEffect, useRef, useState, type KeyboardEvent, type MouseEvent } from 'react'
import type { Transcript, TranscriptMethod } from '../../types'

const transcriptMethodNames: Record<TranscriptMethod, string> = {
  youtube_captions: 'YouTube captions',
  whisper: 'Speech transcription',
  text_submission: 'Submitted text',
}

export function TranscriptDialog({ transcript }: { transcript: Transcript }) {
  const [isOpen, setIsOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!isOpen) {
      return
    }

    const dialog = dialogRef.current
    if (!dialog || dialog.open) {
      return
    }

    dialog.showModal()
    closeButtonRef.current?.focus()
  }, [isOpen])

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) {
      return
    }

    function handleNativeClose() {
      setIsOpen(false)
      triggerRef.current?.focus()
    }

    dialog.addEventListener('close', handleNativeClose)
    return () => dialog.removeEventListener('close', handleNativeClose)
  }, [])

  function closeDialog() {
    dialogRef.current?.close()
  }

  function handleBackdropClick(event: MouseEvent<HTMLDialogElement>) {
    if (event.target === event.currentTarget) {
      closeDialog()
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDialogElement>) {
    if (event.key === 'Escape') {
      event.preventDefault()
      closeDialog()
    }
  }


  return (
    <>
      <button ref={triggerRef} className="button secondary" type="button" onClick={() => setIsOpen(true)}>
        View Transcript
      </button>
      <dialog
        ref={dialogRef}
        className="transcript-dialog"
        aria-labelledby="transcript-dialog-title"
        onClick={handleBackdropClick}
        onKeyDown={handleKeyDown}
      >
        <div className="transcript-dialog-header">
          <div>
            <h2 id="transcript-dialog-title">Transcript</h2>
            <dl className="transcript-dialog-metadata">
              <div>
                <dt>Language</dt>
                <dd>{transcript.language}</dd>
              </div>
              <div>
                <dt>Acquisition method</dt>
                <dd>{transcriptMethodNames[transcript.method]}</dd>
              </div>
            </dl>
          </div>
          <button
            ref={closeButtonRef}
            className="button secondary"
            type="button"
            onClick={closeDialog}
          >
            Close Transcript
          </button>
        </div>
        <div className="transcript-dialog-body">
          <p className="transcript-dialog-text">{transcript.text}</p>
        </div>
      </dialog>
    </>
  )
}
