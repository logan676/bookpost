import type { Magazine } from '../types'

interface Props {
  magazine: Magazine
  onBack: () => void
}

export default function MagazineReader({ magazine, onBack }: Props) {
  const pdfUrl = `/api/magazines/${magazine.id}/pdf`

  return (
    <div className="magazine-reader">
      <header className="reader-header">
        <button className="back-btn" onClick={onBack}>Back</button>
        <h1 className="reader-title">{magazine.title}</h1>
      </header>

      <div className="reader-content">
        <div className="pdf-panel full-width">
          <iframe
            src={pdfUrl}
            title="PDF Viewer"
            className="pdf-iframe"
          />
        </div>
      </div>
    </div>
  )
}
