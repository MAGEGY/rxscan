import { useEffect, useMemo, useRef, useState } from 'react'

export interface HelpFunction {
  label: string
  description: string
  action: () => void
}

export interface HelpHowTo {
  title: string
  body: string
}

interface Props {
  functions: HelpFunction[]
  howtos?: HelpHowTo[]
  color?: string
}

// Self-contained floating help: circular button (bottom-right) opens a
// searchable panel listing the app's functions (click = navigate/act)
// and step-by-step how-tos. Same UX as the PharmaPOS help search.
export default function FloatingHelp({ functions, howtos = [], color = '#0e7490' }: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [expanded, setExpanded] = useState<number | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setQuery('')
      setExpanded(null)
      const id = setTimeout(() => inputRef.current?.focus(), 50)
      return () => clearTimeout(id)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const q = query.trim().toLowerCase()
  const hit = (...texts: string[]) => !q || texts.some((x) => x.toLowerCase().includes(q))

  const fns = useMemo(() => functions.filter((f) => hit(f.label, f.description)), [functions, q])
  const guides = useMemo(() => howtos.filter((h) => hit(h.title, h.body)), [howtos, q])

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        title="Help & Guide"
        aria-label="Help & Guide"
        style={{
          position: 'fixed', bottom: 16, right: 16, zIndex: 70,
          width: 48, height: 48, borderRadius: '50%', border: 'none',
          background: color, color: '#fff', cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(0,0,0,0.25)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', fontSize: 22,
        }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      </button>
    )
  }

  return (
    <div
      onClick={() => setOpen(false)}
      style={{
        position: 'fixed', inset: 0, zIndex: 80, background: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: 16, boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
          maxWidth: 520, width: '100%', maxHeight: '85vh', display: 'flex',
          flexDirection: 'column', overflow: 'hidden', color: '#1e293b',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '1px solid #e2e8f0' }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color }}>?</span> Help & Guide
          </h2>
          <button
            onClick={() => setOpen(false)}
            style={{ border: 'none', background: 'transparent', fontSize: 20, cursor: 'pointer', color: '#94a3b8', padding: 4, borderRadius: 8 }}
          >
            ✕
          </button>
        </div>

        <div style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0' }}>
          <input
            ref={inputRef}
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search functions and how-to..."
            style={{
              width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1',
              borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box',
            }}
          />
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
          {fns.length === 0 && guides.length === 0 && (
            <p style={{ textAlign: 'center', color: '#94a3b8', padding: 24 }}>No results</p>
          )}

          {fns.length > 0 && (
            <>
              <h3 style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, color: '#94a3b8', margin: '0 0 8px' }}>
                Functions
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {fns.map((f) => (
                  <button
                    key={f.label}
                    onClick={() => { setOpen(false); f.action() }}
                    style={{
                      width: '100%', textAlign: 'left', border: 'none', background: 'transparent',
                      padding: '8px 10px', borderRadius: 8, cursor: 'pointer', fontSize: 14,
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#f1f5f9')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <span style={{ fontWeight: 600, color }}>{f.label}</span>
                    <span style={{ display: 'block', color: '#64748b', fontSize: 13 }}>{f.description}</span>
                  </button>
                ))}
              </div>
            </>
          )}

          {guides.length > 0 && (
            <>
              <h3 style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, color: '#94a3b8', margin: '16px 0 8px' }}>
                How-to
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {guides.map((h, i) => (
                  <div key={h.title} style={{ border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
                    <button
                      onClick={() => setExpanded(expanded === i ? null : i)}
                      style={{
                        width: '100%', textAlign: 'left', border: 'none', background: '#f8fafc',
                        padding: '8px 12px', cursor: 'pointer', fontSize: 14, fontWeight: 600,
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      }}
                    >
                      {h.title}
                      <span style={{ color: '#94a3b8' }}>{expanded === i ? '−' : '+'}</span>
                    </button>
                    {expanded === i && (
                      <p style={{ margin: 0, padding: '10px 12px', fontSize: 13, lineHeight: 1.6, color: '#475569' }}>
                        {h.body}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
