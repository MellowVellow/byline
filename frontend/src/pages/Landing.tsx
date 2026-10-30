import { useState } from 'react'
import { api } from '../lib/api'
import { Logo, ThemeToggle } from '../components/Brand'

const FEATURES = [
  { color: '#C0281F', label: 'Language', sub: 'how it is worded' },
  { color: '#6D3BE0', label: 'Reader', sub: 'how it lands' },
  { color: '#1765CC', label: 'Sources', sub: 'what evidence says' },
  { color: '#626A75', label: 'Suggest', sub: 'not yours until you accept' },
  { color: '#8A5F00', label: 'Lint', sub: 'your rules, checked' },
]

const HOW_STEPS = [
  { n: '01', title: 'Set your intent', body: 'Tell Byline what you\'re writing, who\'s reading it, and what you want it to do. The setup wizard builds an outline and writing profile from your goals.' },
  { n: '02', title: 'Write freely', body: 'Type in the editor. Ghost completions appear as you pause — hints (1–3 words), phrases, sentences. Press Tab to accept. Press anything else to dismiss.' },
  { n: '03', title: 'Read the findings', body: 'The right rail shows what four AI personas noticed: Grammar (Red), Reader (Purple), Researcher (Blue), and Supervisor (Yellow). Nothing is applied until you decide.' },
  { n: '04', title: 'Act on what matters', body: 'Click a finding to jump to the passage. Accept a fix, reroll for alternatives, or ignore it. Every change is yours — Byline never rewrites without asking.' },
]

const WHY_POINTS = [
  { icon: '✦', title: 'Writer-controlled at every step', body: 'No auto-complete that pastes entire paragraphs. Byline proposes; you decide. Suggestions vanish the moment you keep typing.' },
  { icon: '⬡', title: 'Grounded in your context', body: 'Ghost completions are ranked against your outline, recent sentences, and vocabulary level — not generic internet text. The model knows your draft.' },
  { icon: '◎', title: 'Evidence before assertion', body: 'The Researcher persona extracts your claims and grades each one: Supports, Qualifies, or Contradicts — with live linked sources.' },
  { icon: '◈', title: 'Your rules, enforced', body: 'Write your own Lint rules — "never use passive voice here", "avoid jargon" — and Byline checks every sentence against them with yellow underlines.' },
  { icon: '⬜', title: 'No account, no cloud storage', body: 'Everything stays in your browser. No login. No upload. Your draft is yours.' },
  { icon: '⬟', title: 'Powered by Meta AI', body: 'All inference runs exclusively on Meta-authored models (Muse Spark Open, Llama 3.3). The allowlist is enforced server-side — no other models are ever called.' },
]

const TESTIMONIALS = [
  { quote: 'The margin queries feel like having a sharp editor reading over my shoulder — except I can ignore them without a conversation.', name: 'M.T.', role: 'Academic researcher' },
  { quote: 'I pasted in a draft I\'d been staring at for two days. The Reader rail showed exactly why a colleague had pushed back on the conclusion. Fixed in ten minutes.', name: 'S.K.', role: 'Technical writer' },
  { quote: 'Ghost completions are the only autocomplete I\'ve used that don\'t feel like autocorrect. Tab once, decide once.', name: 'A.L.', role: 'Essayist' },
  { quote: 'The Sources section changed how I write first drafts. I check claims as I go now, not in a panicked revision pass.', name: 'R.P.', role: 'Journalist' },
]

const FAQS = [
  { q: 'Does Byline rewrite my text automatically?', a: 'No. Every suggestion — ghost completion, paraphrase, grammar fix — stays dormant until you accept it. Typing anything else dismisses it immediately. You are always driving.' },
  { q: 'What AI models power Byline?', a: 'Byline strictly uses Meta-authored models: Muse Spark Open (via Baseten, primary) and Muse Spark 1.3 via the Meta Model API (fallback). An allowlist is enforced server-side — no non-Meta model is ever invoked.' },
  { q: 'Do I need an account?', a: 'No. Your document, outline, settings, and accepted suggestions are stored entirely in your browser. Nothing is uploaded to a server. The backend only receives the text you actively send for analysis.' },
  { q: 'What is the Lint layer?', a: 'Lint lets you define your own writing rules — "avoid hedging words", "no passive voice in abstracts", "flag unsupported statistics" — and runs them against every sentence. Yellow underlines mark violations; you fix or dismiss each one.' },
  { q: 'How does the Sources / Researcher persona work?', a: 'Byline extracts factual claims from your draft, runs each through a Meta Responses API web-search call, and returns a verdict (Supports / Qualifies / Contradicts) with a one-sentence summary and linked sources.' },
  { q: 'Can I run Byline offline?', a: 'Grammar checking (Harper.js) runs entirely in-browser via WebAssembly and works offline. AI features (ghost completions, annotations, sources) require an active connection to the Byline backend.' },
]

export default function Landing() {
  const [email, setEmail] = useState('')
  const [msg, setMsg] = useState('')
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  async function join(e: React.FormEvent) {
    e.preventDefault()
    const d = await api.waitlist(email)
    if (d?.ok) setMsg(`You're on the list. ✔︎`)
    else { localStorage.setItem('byline.waitlist', email); setMsg('Saved locally — will sync at launch. ✔︎') }
    setEmail('')
  }

  return (
    <div>
      <header className="topbar">
        <Logo /><div className="spacer" /><ThemeToggle />
        <a className="btn" href="/demo">Public demo</a>
        <a className="btn primary" href="/app">Open app</a>
      </header>

      <main>

        {/* ── HERO ── */}
        <section className="hero lp-section">
          <div className="hero-grid">
            <div className="hero-copy">
              <h1>You write.<br />Byline suggests.<br />You choose.</h1>
              <p>Other editors paste finished paragraphs. Byline gives options — hints, phrases, questions — grounded in your context. Then it reads your draft like a stranger and shows what sources say. Every word stays your choice.</p>

              <form className="waitlist" onSubmit={join}>
                <label className="sr-only" htmlFor="waitlist-email" />
                <input id="waitlist-email" type="email" autoComplete="email" inputMode="email" required placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} />
                <a className="btn primary" href="/demo">Try demo — no signup</a>
                <button type="submit">Join waitlist</button>
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

            {/* Demo pane — static editorial proof sheet */}
            <div className="proof-sheet" aria-label="Example marked draft">
              <h2>The case for deliberate writing</h2>
              <div className="proof-cols">
                <div>
                  <p>
                    <span style={{ textDecoration: 'underline wavy var(--lt) 1.5px', textUnderlineOffset: 4 }}>Studies show writers who revise less produces better work.</span>{' '}
                    <span style={{ textDecoration: 'underline dotted var(--ai) 1.5px', textUnderlineOffset: 4 }}>This is clearly obvious to anyone who has tried.</span>{' '}
                    <span style={{ background: 'color-mix(in srgb, var(--blue) 16%, transparent)', borderRadius: 2 }}>Deliberate revision improves clarity by 40%</span><span className="stamp">Qualifies</span>.{' '}
                    <span style={{ color: 'var(--grey)', fontStyle: 'italic' }}>One approach is to treat each draft as a conversation|</span>
                  </p>
                </div>
                <aside className="proof-margin" aria-label="Margin queries">
                  <div className="mq">mq — "produces" → "produce": agreement. <span style={{ color: 'var(--muted)' }}>Language</span></div>
                  <div className="mq">mq — "clearly obvious" is redundant. <span style={{ color: 'var(--muted)' }}>Reader</span></div>
                  <div className="mq">mq — source qualifies: no single figure. <span style={{ color: 'var(--muted)' }}>Sources</span></div>
                </aside>
              </div>
              <div className="proof-popup">
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                  <span className="chip" style={{ background: 'var(--grey)', color: '#fff', fontSize: 11, padding: '2px 7px' }}>Ghost</span>
                  <span style={{ fontFamily: 'var(--editor-font, "Source Serif 4", Georgia, serif)', fontSize: 15, color: 'var(--muted)' }}>Completing cursor…</span>
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
                  accept · <kbd style={{ border: '1px solid var(--border)', borderRadius: 3, padding: '1px 5px', fontSize: 11 }}>Tab</kbd> takes top · any key dismisses
                  &nbsp;&nbsp;<a className="btn" href="/demo" style={{ minHeight: 28, padding: '2px 10px', fontSize: 12 }}>Open live demo →</a>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── HOW IT WORKS ── */}
        <section className="lp-section lp-how" aria-labelledby="how-heading">
          <h2 id="how-heading" className="lp-section-title">How it works</h2>
          <p className="lp-section-sub">Four steps from blank page to polished draft — you stay in the driver's seat the whole way.</p>
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
        <section className="lp-section lp-why" aria-labelledby="why-heading">
          <h2 id="why-heading" className="lp-section-title">Why Byline</h2>
          <p className="lp-section-sub">Most AI writing tools remove the writer. Byline is designed around keeping you there.</p>
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
        <section className="lp-section lp-testimonials" aria-labelledby="testimonials-heading">
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
        <section className="lp-section lp-faq" aria-labelledby="faq-heading">
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
        <section className="lp-section lp-cta" aria-label="Get started">
          <h2>Start writing with Byline</h2>
          <p>No account. No upload. Works in your browser right now.</p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a className="btn primary" href="/demo" style={{ minHeight: 40, padding: '8px 24px', fontSize: 15 }}>Try the demo</a>
            <a className="btn" href="/app" style={{ minHeight: 40, padding: '8px 24px', fontSize: 15 }}>Open the app</a>
          </div>
        </section>

      </main>

      <footer className="lp-footer">
        <Logo />
        <span style={{ color: 'var(--muted)', fontSize: 13 }}>Writer-controlled AI writing. No login. Docs stay in browser.</span>
        <span style={{ color: 'var(--muted)', fontSize: 12 }}>Powered by Meta Muse · Built for the Meta Global AI Hackathon 2026</span>
      </footer>
    </div>
  )
}
