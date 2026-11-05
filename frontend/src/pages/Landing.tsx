import { useState } from 'react'
import { api } from '../lib/api'
import { Logo, ThemeToggle } from '../components/Brand'

const FEATURES = [
  { color: '#B094E9', label: 'Suggest', sub: 'assist levels at the cursor' },
  { color: '#626A75', label: 'Review', sub: 'feedback on passages' },
  { color: '#FEE180', label: 'Paraphrase', sub: 'options for selected text' },
  { color: '#D83343', label: 'Connect', sub: 'links between sentences' },
  { color: '#6FBDEC', label: 'Library', sub: 'grounded citations' },
]

const HOW_STEPS = [
  { n: '01', title: 'Write a line', body: 'Type in the editor. Byline does not wait for a prompt. It watches the next small decision.' },
  { n: '02', title: 'Receive bits', body: 'When you pause, Byline offers cues, phrases, sentences, and questions. Each is short. Each is one option among several.' },
  { n: '03', title: 'Accept or dismiss', body: 'Press Tab or a number to accept one. Keep typing to dismiss all. Nothing enters the draft by default.' },
  { n: '04', title: 'Read the Reader', body: 'The Reader rail leaves notes on exact passages. It suggests fixes. You accept or ignore each one.' },
]

const WHY_POINTS = [
  { icon: '✦', title: 'Bits, not blocks', body: 'Byline offers the next few words or a short phrase. It does not hand you a finished paragraph to swallow whole.' },
  { icon: '⬡', title: 'Options, not answers', body: 'Each pause gives several alternatives. You compare them in place, then accept one or none.' },
  { icon: '◎', title: 'You decide each change', body: 'Suggestions wait for approval. Ignored options close when you type. The draft changes only when you say so.' },
  { icon: '◈', title: 'Grounded sources', body: 'Source cards carry verbatim passages. Citations are deterministic APA from metadata, not model prose.' },
  { icon: '⬜', title: 'No account, local files', body: 'Drafts stay in your browser. There is no login. There is no upload.' },
  { icon: '⬟', title: 'Meta models only', body: 'All checks run on Meta models. The server allowlist blocks all other models.' },
]

const TESTIMONIALS = [
  { quote: 'Margin notes read like an editor review. I address them or I ignore them.', name: 'M.T.', role: 'Academic researcher' },
  { quote: 'I opened a draft I had left for two days. The Reader rail marked the weak conclusion. I fixed it in ten minutes.', name: 'S.K.', role: 'Technical writer' },
  { quote: 'Completions stay short. I press Tab once and decide once.', name: 'A.L.', role: 'Essayist' },
  { quote: 'I check claims in the Sources section during the first draft. I no longer delay checks to revision.', name: 'R.P.', role: 'Journalist' },
]

const FAQS = [
  { q: 'Does Byline change my text without approval?', a: 'No, except for small grammar fixes. Options and paraphrases wait until you accept them. Grammar fixes apply after a short red underline.' },
  { q: 'Which models run Byline?', a: 'Byline uses Meta models only: Muse Spark Open (via Baseten, primary) and Muse Spark 1.3 via the Meta Model API (fallback). The server allowlist blocks all other models.' },
  { q: 'Do I need an account?', a: 'No. Your document, outline, settings, and accepted options stay in your browser. The backend receives only text you send for a check.' },
  { q: 'How do Connect links work?', a: 'The ⇌ menu lists connectors (contrast, cause, sequence, example). It also drafts links from nearby sentences. Prompts send text only.' },
  { q: 'What does Explore do?', a: 'Explore takes a question and lists findings (facts, claims, terms, ideas) with source details. You can save rows to your Library. This build uses built-in sample data.' },
  { q: 'Can I run Byline offline?', a: 'Grammar checks (Harper.js) run in the browser via WebAssembly. They work offline. Checks for completions, notes, and sources need a link to the backend.' },
]


function MockDisplay() {
  const [active, setActive] = useState<'grammar' | 'reader'>('reader')
  const [applied, setApplied] = useState<Record<string, boolean>>({})

  return (
    <div className="mock-display-shell" aria-label="Mock display reading experience">
      <div className="mock-display-grid">
        <div className="mock-paper" aria-label="Sample marked draft">
          <div className="mock-paper-head">
            <span className="mock-paper-title">The case for careful writing</span>
            <div className="mock-toggles" role="group" aria-label="Underline layers">
              <button
                type="button"
                className={`mock-toggle ${active === 'grammar' ? 'on' : ''}`}
                onClick={() => setActive('grammar')}
              >
                Grammar
              </button>
              <button
                type="button"
                className={`mock-toggle ${active === 'reader' ? 'on' : ''}`}
                onClick={() => setActive('reader')}
              >
                Reader
              </button>
            </div>
          </div>
          <p className="mock-para">
            Studies show writers who revise less{' '}
            <span
              className={`mock-under mock-under-grammar ${active === 'grammar' ? 'active' : ''}`}
              onClick={() => setActive('grammar')}
            >
              produces
            </span>{' '}
            better work.{' '}
            <span
              className={`mock-under mock-under-reader ${active === 'reader' ? 'active' : ''}`}
              onClick={() => setActive('reader')}
            >
              This is clearly obvious
            </span>{' '}
            to anyone who has tried. One approach is to treat each draft as a conversation with a future reader.
          </p>
          <div className="mock-margin" aria-label="Margin notes">
            <div
              className={`mq mock-mq ${active === 'grammar' ? 'active' : ''}`}
              onClick={() => setActive('grammar')}
            >
              mq — “produces” → “produce”. <span style={{ color: 'var(--muted)' }}>Grammar</span>
            </div>
            <div
              className={`mq mock-mq ${active === 'reader' ? 'active' : ''}`}
              onClick={() => setActive('reader')}
            >
              mq — “clearly obvious” repeats one meaning. <span style={{ color: 'var(--muted)' }}>Reader</span>
            </div>
          </div>
          {active === 'grammar' && (
            <div className="proof-popup mock-popup">
              <div style={{ color: 'var(--muted)', fontSize: 12, lineHeight: 1.45, marginBottom: 6 }}>
                Subject-verb agreement: “writers … produce”.
              </div>
              <div className="lp-ghost-rows">
                <div className="lp-ghost-row">
                  <span className="lp-ghost-n">1</span>produce
                </div>
              </div>
              <div className="pp-hint" style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
                <button
                  type="button"
                  className="btn primary"
                  style={{ minHeight: 26, padding: '2px 10px', fontSize: 12 }}
                  onClick={() => setApplied((p) => ({ ...p, grammar: true }))}
                >
                  {applied.grammar ? 'Applied ✔' : 'Apply fix'}
                </button>
                <span>Tab to accept · Esc to dismiss</span>
              </div>
            </div>
          )}
          {active === 'reader' && (
            <div className="proof-popup mock-popup">
              <div style={{ color: 'var(--muted)', fontSize: 12, lineHeight: 1.45, marginBottom: 6 }}>
                “clearly obvious” repeats one meaning.
              </div>
              <div className="lp-ghost-rows">
                <div className="lp-ghost-row"><span className="lp-ghost-n">1</span>obvious</div>
                <div className="lp-ghost-row"><span className="lp-ghost-n">2</span>clear</div>
              </div>
              <div className="pp-hint" style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
                <button
                  type="button"
                  className="btn primary"
                  style={{ minHeight: 26, padding: '2px 10px', fontSize: 12 }}
                  onClick={() => setApplied((p) => ({ ...p, reader: true }))}
                >
                  {applied.reader ? 'Applied ✔' : 'Apply suggestion'}
                </button>
                <span>` next · alt+` prev</span>
              </div>
            </div>
          )}
        </div>
        <div className="mock-display-caption">
          <h3>Reading experience</h3>
          <p>
            The Reader rail anchors reader comments to exact spans. Grammar fixes arrive as red wavy underlines;
            reader observations as purple underlines. Click any underline to inspect and accept a replacement.
          </p>
          <div className="mock-legend">
            <span><i className="mock-swatch mock-swatch-grammar" /> Grammar (red wavy)</span>
            <span><i className="mock-swatch mock-swatch-reader" /> Reader (purple)</span>
            <span><i className="mock-swatch mock-swatch-ghost" /> Ghost text (grey)</span>
          </div>
        </div>
      </div>
    </div>
  )
}

const MOCK_GHOST_OPTIONS: Record<string, string[]> = {
  cue: ['quietly reshaped', 'changed team rhythms', 'rewritten collaboration'],
  fragment: ['quietly reshaped how teams collaborate.', 'changed the rhythm of daily work.', 'rewritten the way teams meet.'],
  sentence: ['quietly reshaped how teams collaborate across time zones.', 'changed the rhythm of daily work for everyone.', 'rewritten the way teams meet and decide.'],
  question: ['How has remote work reshaped collaboration?', 'What changed in daily teamwork?', 'Which habits survived the shift?'],
}

const MOCK_GHOST_LABELS: Record<string, string> = {
  cue: 'cue',
  fragment: 'fragment',
  sentence: 'sentence',
  question: 'question',
}

function MockWriting() {
  const [level, setLevel] = useState('fragment')
  const [idx, setIdx] = useState(0)
  const [accepted, setAccepted] = useState('')
  const options = MOCK_GHOST_OPTIONS[level] || []
  const ghost = options[idx % Math.max(1, options.length)] || ''
  const levels = ['cue', 'fragment', 'sentence', 'question']

  return (
    <div className="mock-writing-shell" aria-label="Mock writing composition experience">
      <div className="mock-display-grid mock-writing-grid">
        <div className="mock-editor" aria-label="Sample composition editor">
          <div className="mock-paper-head">
            <span className="mock-paper-title">Composition</span>
            <div className="mock-toggles" role="group" aria-label="Ghost levels">
              {levels.map((l) => (
                <button
                  key={l}
                  type="button"
                  className={`mock-toggle ${level === l ? 'on' : ''}`}
                  onClick={() => {
                    setLevel(l)
                    setIdx(0)
                  }}
                >
                  {MOCK_GHOST_LABELS[l]}
                </button>
              ))}
            </div>
          </div>
          <p className="mock-para mock-editor-para">
            The shift to remote work has{accepted}
            <span className="mock-ghost">{ghost ? ` ${ghost}` : ''}</span>
            <span className="mock-caret" aria-hidden="true">|</span>
          </p>
          <div className="proof-popup mock-popup">
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
              <span className="chip" style={{ background: 'var(--grey)', color: '#fff', fontSize: 11, padding: '2px 7px' }}>Options</span>
              <span style={{ fontFamily: 'var(--editor-font, "Source Serif 4", Georgia, serif)', fontSize: 15, color: 'var(--muted)' }}>
                Options at cursor…
              </span>
            </div>
            <div className="lp-ghost-rows">
              {options.map((o, i) => (
                <div
                  key={i}
                  className="lp-ghost-row"
                  style={i === idx ? { color: 'var(--ink)', fontWeight: 600, background: 'color-mix(in srgb, var(--ai) 8%, var(--bg))' } : undefined}
                  onClick={() => setIdx(i)}
                >
                  <span className="lp-ghost-n">{i + 1}</span>
                  {o}
                </div>
              ))}
            </div>
            <div className="pp-hint" style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <button
                type="button"
                className="btn primary"
                style={{ minHeight: 26, padding: '2px 10px', fontSize: 12 }}
                onClick={() => {
                  if (ghost) {
                    setAccepted((a) => a + ` ${ghost}`)
                    setIdx((i) => (i + 1) % Math.max(1, options.length))
                  }
                }}
              >
                Accept (Tab)
              </button>
              <button
                type="button"
                className="btn"
                style={{ minHeight: 26, padding: '2px 10px', fontSize: 12 }}
                onClick={() => setIdx((i) => (i + 1) % Math.max(1, options.length))}
              >
                Reroll (` )
              </button>
              <button
                type="button"
                className="btn"
                style={{ minHeight: 26, padding: '2px 10px', fontSize: 12 }}
                onClick={() => {
                  setAccepted('')
                  setIdx(0)
                }}
              >
                Reset
              </button>
              <span>1-9 choose · typing dismisses</span>
            </div>
          </div>
        </div>
        <div className="mock-display-caption">
          <h3>Composition experience</h3>
          <p>
            Ghost text offers cues, fragments, sentences, and questions at the cursor. Cycle levels, pick an
            option, or reroll. Gradients and motion keep the mockup feeling live. Nothing enters the draft until you
            accept.
          </p>
          <div className="mock-legend">
            <span><i className="mock-swatch mock-swatch-ghost" /> Ghost suggestion</span>
            <span><i className="mock-swatch mock-swatch-ai" /> Accepted text</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Landing() {
  const [email, setEmail] = useState('')
  const [msg, setMsg] = useState('')
  const [pending, setPending] = useState(false)
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  async function join(e: React.FormEvent) {
    e.preventDefault()
    const value = email.trim()
    if (!value || pending) return
    setPending(true)
    setMsg('')
    try {
      const d = await api.waitlist(value)
      if (d?.ok) {
        setMsg(d.already ? 'You are already on the list. ✔︎' : 'Added to waitlist. ✔︎')
        setEmail('')
      } else if (d?.error === 'waitlist_unavailable') {
        setMsg('Waitlist is temporarily unavailable. Try again shortly.')
      } else {
        setMsg('Could not join the waitlist. Check the email and try again.')
      }
    } finally {
      setPending(false)
    }
  }

  return (
    <div>
      <header className="topbar">
        <Logo /><div className="spacer" />
        <nav className="desktop-only-btn" aria-label="Homepage sections" style={{ display: 'inline-flex', alignItems: 'center', gap: 16, marginRight: 8, fontSize: 13 }}>
          <a href="#how" style={{ color: 'var(--muted)', textDecoration: 'none' }}>How it works</a>
          <a href="#why" style={{ color: 'var(--muted)', textDecoration: 'none' }}>Why Byline</a>
          <a href="#testimonials" style={{ color: 'var(--muted)', textDecoration: 'none' }}>Writers</a>
          <a href="#faq" style={{ color: 'var(--muted)', textDecoration: 'none' }}>FAQ</a>
        </nav>
        <a className="btn" href="/demo">Try it</a>
        <ThemeToggle />
      </header>

      <main>

        {/* ── HERO ── */}
        <section className="hero lp-section">
          <div className="hero-grid">
            <div className="hero-copy">
              <h1>Think it.<br />Write it.</h1>
              <p>Byline does not complete your draft. It offers suggest levels, review feedback, paraphrases, phrase connections, and grounded library citations. You accept each change.</p>

              <form className="waitlist" onSubmit={join}>
                <label className="sr-only" htmlFor="waitlist-email" />
                <input id="waitlist-email" type="email" autoComplete="email" inputMode="email" required placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} disabled={pending} />
                <a className="btn primary" href="/demo">Try demo</a>
                <button type="submit" disabled={pending}>{pending ? 'Joining…' : 'Join waitlist'}</button>
              </form>
              {msg && <p className="fade" role="status" aria-live="polite">{msg}</p>}

              <div className="lp-feature-pills">
                {FEATURES.map(f => (
                  <span key={f.label} className="lp-pill">
                    <span className="swatch" style={{ background: f.color }} aria-hidden="true" />
                    <strong>{f.label}:</strong>&nbsp;{f.sub}
                  </span>
                ))}
              </div>
            </div>


          </div>
        </section>

        {/* ── MOCK DISPLAY ── */}
        <section id="mock-display" className="lp-section lp-mock-display" aria-labelledby="mock-display-heading">
          <h2 id="mock-display-heading" className="lp-section-title">Mock display</h2>
          <p className="lp-section-sub">A live reading surface: underlines, margin notes, and reader comments you can inspect.</p>
          <MockDisplay />
        </section>

        {/* ── MOCK WRITING ── */}
        <section id="mock-writing" className="lp-section lp-mock-writing" aria-labelledby="mock-writing-heading">
          <h2 id="mock-writing-heading" className="lp-section-title">Mock writing</h2>
          <p className="lp-section-sub">A live composition surface: ghost text, levels, and options you can accept or dismiss.</p>
          <MockWriting />
        </section>

        {/* ── HOW IT WORKS ── */}
        <section id="how" className="lp-section lp-how" aria-labelledby="how-heading">
          <h2 id="how-heading" className="lp-section-title">How it works</h2>
          <p className="lp-section-sub">Four steps from blank page to finished draft. You approve each change.</p>
          <div className="lp-steps">
            {HOW_STEPS.map(s => (
              <div className="lp-step" key={s.n}>
                <div className="lp-step-n">{s.n}</div>
                <h3>{s.title}</h3>
                <p>{s.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── WHY BYLINE ── */}
        <section id="why" className="lp-section lp-why" aria-labelledby="why-heading">
          <h2 id="why-heading" className="lp-section-title">Why Byline</h2>
          <p className="lp-section-sub">Most writing tools replace the writer with a paragraph. Byline keeps the next decision small.</p>
          <div className="lp-why-grid">
            {WHY_POINTS.map(w => (
              <div className="lp-why-card" key={w.title}>
                <div className="lp-why-icon">{w.icon}</div>
                <h3>{w.title}</h3>
                <p>{w.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── TESTIMONIALS ── */}
        <section id="testimonials" className="lp-section lp-testimonials" aria-labelledby="testimonials-heading">
          <h2 id="testimonials-heading" className="lp-section-title">What writers say</h2>
          <div className="lp-testi-grid">
            {TESTIMONIALS.map((t, i) => (
              <figure className="lp-testi" key={i}>
                <blockquote>"{t.quote}"</blockquote>
                <figcaption><strong>{t.name}</strong> · {t.role}</figcaption>
              </figure>
            ))}
          </div>
        </section>

        {/* ── FAQ ── */}
        <section id="faq" className="lp-section lp-faq" aria-labelledby="faq-heading">
          <h2 id="faq-heading" className="lp-section-title">FAQ</h2>
          <div className="lp-faq-list">
            {FAQS.map((f, i) => (
              <div className="lp-faq-item" key={i}>
                <button
                  className="lp-faq-q"
                  aria-expanded={openFaq === i}
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                >
                  {f.q}
                  <span className="lp-faq-chevron" aria-hidden="true">{openFaq === i ? '−' : '+'}</span>
                </button>
                {openFaq === i && <div className="lp-faq-a">{f.a}</div>}
              </div>
            ))}
          </div>
        </section>

        {/* ── FINAL CTA ── */}
        <section id="waitlist" className="lp-section lp-cta" aria-label="Get started">
          <h2>Start writing with Byline</h2>
          <p>No account. No upload. Runs in your browser.</p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a className="btn primary" href="/demo" style={{ minHeight: 40, padding: '8px 24px', fontSize: 15 }}>Try the demo</a>
            <a className="btn" href="/app" style={{ minHeight: 40, padding: '8px 24px', fontSize: 15 }}>Open the app</a>
          </div>
        </section>

      </main>

      <footer className="lp-footer">
        <Logo />
        <span style={{ color: 'var(--muted)', fontSize: 13 }}>Writer-controlled writing. No login. Drafts stay in browser.</span>
        <span style={{ color: 'var(--muted)', fontSize: 12 }}>Uses Meta Muse · Built for Meta Global Hackathon 2026</span>
      </footer>
    </div>
  )
}
