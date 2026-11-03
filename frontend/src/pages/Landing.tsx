import { useState } from 'react'
import { api } from '../lib/api'
import { Logo, ThemeToggle } from '../components/Brand'

const FEATURES = [
  { color: '#6D3BE0', label: 'Reader', sub: 'shows how draft reads' },
  { color: '#626A75', label: 'Suggest', sub: 'inactive until accepted' },
  { color: '#8A5F00', label: 'Connect', sub: 'links between paragraphs' },
  { color: '#C0281F', label: 'Grammar', sub: 'fixes as you type' },
]

const HOW_STEPS = [
  { n: '01', title: 'Explore a question', body: 'Enter a question about your topic. Explore lists findings in a table. Save rows to your Library.' },
  { n: '02', title: 'Write freely', body: 'Type in the editor. Short completions show when you pause. Press Tab to accept. Type to dismiss.' },
  { n: '03', title: 'Read the Reader', body: 'The right rail shows Reader notes. Each note points to one passage. Nothing changes until you accept.' },
  { n: '04', title: 'Accept or dismiss', body: 'Select a note to show the passage. Accept a fix or dismiss it. Grammar corrections apply directly.' },
]

const WHY_POINTS = [
  { icon: '✦', title: 'You decide each change', body: 'Byline lists options. You accept or dismiss each one. Ignored options close when you type.' },
  { icon: '⬡', title: 'No setup form', body: 'Completions use nearby sentences only. They do not use a topic form or outline. Open the app and type.' },
  { icon: '◎', title: 'One Reader', body: 'One reviewer notes questions, unclear parts, and broad claims. It gives no scores and no grades.' },
  { icon: '◈', title: 'Links on demand', body: 'A list of connectors plus drafted bridges (Ctrl+/) joins paragraphs. Use them when needed.' },
  { icon: '⬜', title: 'No account, local files', body: 'Drafts stay in your browser. There is no login. There is no upload.' },
  { icon: '⬟', title: 'Meta models only', body: 'All checks run on Meta models (Muse Spark Open, Llama 3.3). The server allowlist blocks all other models.' },
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
              <h1>You write.<br />Byline lists options.<br />You decide.</h1>
              <p>Other editors insert full paragraphs. Byline lists hints, phrases, and questions from nearby sentences. It then shows how a stranger may read the draft. You accept each change.</p>

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

            {/* Demo pane — sample marked draft */}
            <div className="proof-sheet" aria-label="Sample marked draft">
              <h2>The case for careful writing</h2>
              <div className="proof-cols">
                <div>
                  <p>
                    <span style={{ textDecoration: 'underline wavy var(--lt) 1.5px', textUnderlineOffset: 4, textDecorationSkipInk: 'none' }}>Studies show writers who revise less produces better work.</span>{' '}
                    <span style={{ borderBottom: '2px solid var(--ai)', paddingBottom: 1 }}>This is clearly obvious to anyone who has tried.</span>{' '}
                    <span style={{ color: 'var(--grey)', fontStyle: 'italic' }}>One approach is to treat each draft as a conversation|</span>
                  </p>
                </div>
                <aside className="proof-margin" aria-label="Margin notes">
                  <div className="mq">mq — “produces” fixed to “produce”. <span style={{ color: 'var(--muted)' }}>Grammar</span></div>
                  <div className="mq">mq — “clearly obvious” repeats one meaning. <span style={{ color: 'var(--muted)' }}>Reader</span></div>
                </aside>
              </div>
              <div className="proof-popup">
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                  <span className="chip" style={{ background: 'var(--grey)', color: '#fff', fontSize: 11, padding: '2px 7px' }}>Options</span>
                  <span style={{ fontFamily: 'var(--editor-font, "Source Serif 4", Georgia, serif)', fontSize: 15, color: 'var(--muted)' }}>Options at cursor…</span>
                </div>
                <div className="lp-ghost-rows">
                  <div className="lp-ghost-row"><span className="lp-ghost-n">1</span>to treat each draft as a dialogue with a future reader.</div>
                  <div className="lp-ghost-row"><span className="lp-ghost-n">2</span>to slow down and notice what you actually meant to say.</div>
                  <div className="lp-ghost-row"><span className="lp-ghost-n">3</span>to separate generating from judging — two different modes.</div>
                </div>
                <div className="pp-hint" style={{ marginTop: 8 }}>
                  <kbd style={{ border: '1px solid var(--border)', borderRadius: 3, padding: '1px 5px', fontSize: 11 }}>1</kbd>{' '}
                  <kbd style={{ border: '1px solid var(--border)', borderRadius: 3, padding: '1px 5px', fontSize: 11 }}>2</kbd>{' '}
                  <kbd style={{ border: '1px solid var(--border)', borderRadius: 3, padding: '1px 5px', fontSize: 11 }}>3</kbd>{' '}
                  accept · <kbd style={{ border: '1px solid var(--border)', borderRadius: 3, padding: '1px 5px', fontSize: 11 }}>Tab</kbd> accepts top · typing dismisses
                  &nbsp;&nbsp;<a className="btn" href="/demo" style={{ minHeight: 28, padding: '2px 10px', fontSize: 12 }}>Open demo →</a>
                </div>
              </div>
            </div>
          </div>
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
          <p className="lp-section-sub">Most writing tools replace the writer. Byline keeps the writer in control.</p>
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
