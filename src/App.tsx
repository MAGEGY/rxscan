import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { parseMedicinesCsv, searchMedicines } from './lib/medicineSearch'
import type { Medicine, OcrLine } from './lib/types'

type Status = 'loading-db' | 'idle' | 'camera' | 'ocr' | 'done' | 'error'

export default function App() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [status, setStatus] = useState<Status>('loading-db')
  const [dbError, setDbError] = useState('')
  const [db, setDb] = useState<Medicine[]>([])
  const [lang, setLang] = useState('eng')
  const [lines, setLines] = useState<OcrLine[]>([])
  const [matches, setMatches] = useState<Medicine[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(import.meta.env.BASE_URL + 'medicines.csv')
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.text()
      })
      .then((csv) => {
        setDb(parseMedicinesCsv(csv))
        setStatus('idle')
      })
      .catch((e) => {
        setDbError(`Failed to load medicine database: ${e.message}`)
        setStatus('error')
      })
    return () => streamRef.current?.getTracks().forEach((t) => t.stop())
  }, [])

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 } },
      })
      streamRef.current = stream
      if (videoRef.current) videoRef.current.srcObject = stream
      setStatus('camera')
    } catch {
      setError('Camera not available. Use "Upload image" instead.')
      setStatus('error')
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
  }

  async function runOcr(canvas: HTMLCanvasElement) {
    setStatus('ocr')
    stopCamera()
    try {
      const result = await window.Tesseract.recognize(canvas, lang)
      const ocrLines = result.data.text
        .split('\n')
        .filter((l) => l.trim())
        .map((text) => ({ id: crypto.randomUUID(), text: text.trim(), isEdited: false }))
      setLines(ocrLines)
      runSearch(ocrLines.map((l) => l.text).join(' '))
      setStatus('done')
    } catch {
      setError('OCR failed. Please try again.')
      setStatus('error')
    }
  }

  function capture() {
    const video = videoRef.current
    if (!video) return
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d')!.drawImage(video, 0, 0)
    runOcr(canvas)
  }

  function onUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      canvas.getContext('2d')!.drawImage(img, 0, 0)
      runOcr(canvas)
    }
    img.src = URL.createObjectURL(file)
  }

  function runSearch(text: string) {
    setMatches(searchMedicines(text, db))
  }

  function updateLine(id: string, newText: string) {
    const updated = lines.map((l) => (l.id === id ? { ...l, text: newText, isEdited: true } : l))
    setLines(updated)
    runSearch(updated.map((l) => l.text).join(' '))
  }

  function discardLine(id: string) {
    const updated = lines.filter((l) => l.id !== id)
    setLines(updated)
    runSearch(updated.map((l) => l.text).join(' '))
  }

  function clearAll() {
    setLines([])
    setMatches([])
    setError('')
    setStatus('idle')
  }

  return (
    <div className="app">
      <header className="header">
        <h1>💊 RxScan</h1>
        <p className="subtitle">
          Scan prescriptions, match medicines by brand or composition ({db.length} medicines)
        </p>
      </header>

      {status === 'loading-db' && <p className="loading">⏳ Loading medicine database…</p>}
      {dbError && <p className="error">{dbError}</p>}

      {(status === 'idle' || status === 'error') && !dbError && (
        <div className="actions">
          <button className="primary" onClick={startCamera}>📷 Start camera</button>
          <label className="primary upload">
            🖼 Upload image
            <input type="file" accept="image/*" onChange={onUpload} hidden />
          </label>
          <select value={lang} onChange={(e) => setLang(e.target.value)}>
            <option value="eng">English</option>
            <option value="ara">Arabic</option>
          </select>
          {error && <p className="error">{error}</p>}
        </div>
      )}

      {status === 'camera' && (
        <div className="camera">
          <video ref={videoRef} autoPlay playsInline />
          <div className="actions">
            <button className="primary" onClick={capture}>📸 Capture & scan</button>
            <button onClick={clearAll}>Cancel</button>
          </div>
        </div>
      )}

      {status === 'ocr' && <p className="loading">⏳ Running OCR… first scan downloads the language model.</p>}

      {status === 'done' && (
        <>
          <section className="card">
            <h2>Recognized lines (editable)</h2>
            <ul className="line-list">
              {lines.map((l) => (
                <li key={l.id}>
                  <input
                    value={l.text}
                    onChange={(e) => updateLine(l.id, e.target.value)}
                    className={l.isEdited ? 'line-input edited' : 'line-input'}
                  />
                  <button className="small danger" onClick={() => discardLine(l.id)}>✕</button>
                </li>
              ))}
            </ul>
            <div className="actions">
              <button className="small" onClick={() => runSearch(lines.map((l) => l.text).join(' '))}>🔄 Re-match</button>
              <button className="small" onClick={() => window.print()}>🖨 Print matches</button>
              <button className="small" onClick={clearAll}>Clear</button>
            </div>
          </section>

          <section className="card">
            <h2>Matches ({matches.length})</h2>
            {matches.length === 0 && <p>No medicines matched. Edit the lines above and re-match.</p>}
            <ul className="match-list">
              {matches.map((m) => (
                <li key={m.id}>
                  <div className="match-row">
                    <strong>{m.brandName}</strong>
                    <span className="price">{m.price} EGP</span>
                  </div>
                  <div className="muted">{m.genericName} · {m.composition}</div>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}

      <footer className="footer">Prices in EGP from the bundled database. Verify with a pharmacist.</footer>
    </div>
  )
}
