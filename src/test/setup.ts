import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

if (typeof HTMLDialogElement !== 'undefined') {
  const dialogPrototype = HTMLDialogElement.prototype

  if (typeof dialogPrototype.showModal !== 'function') {
    Object.defineProperty(dialogPrototype, 'showModal', {
      configurable: true,
      value: function showModal(this: HTMLDialogElement) {
        this.open = true
      },
    })
  }

  if (typeof dialogPrototype.close !== 'function') {
    Object.defineProperty(dialogPrototype, 'close', {
      configurable: true,
      value: function close(this: HTMLDialogElement) {
        this.open = false
        this.dispatchEvent(new Event('close'))
      },
    })
  }
}

afterEach(cleanup)
