import { ExtractionContainer } from '../../features/extraction'
import './ExtractionPage.css'

export function ExtractionPage() {
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to main content
      </a>
      <header className="site-header">
        <a className="brand" href="#main">
          Reelio
        </a>
      </header>
      <main id="main" tabIndex={-1}>
        <ExtractionContainer />
      </main>
    </>
  )
}
