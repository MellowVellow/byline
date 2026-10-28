import { useState } from 'react'
import { api } from '../lib/api'
import { Logo, ThemeToggle } from '../components/Brand'

const CARDS = [
  { color: '#C0281F', title: 'Red — Language: how it is worded', items: [['Dogs needs daily walks.', 'Grammar · dark red squiggle'], ['A plethora of reasons.', 'Word choice · red underline, checks your level'], ['Cats are quiet. Dogs bark.', 'Cohesion · light red underline, uses your context']] },
  { color: '#6D3BE0', title: 'Purple — Reader: how it lands', items: [['Cats are independent, as I said.', 'Questions and clarity · dotted line'], ['“You already mentioned this.” “This contradicts your first point.”', ''], ['Finally, cats are just cute.', 'Feedback and coherence · dotted line']] },
  { color: '#1765CC', title: 'Blue — Sources: what evidence says', items: [['Cats live longer than dogs.', 'Claim → verdict (supports / qualifies / contradicts) → evidence sentence → linked source'], ['Sources agent activates per outline section', 'Notebook-style sources workspace']] },
  { color: '#626A75', title: 'Grey — Suggest: not yours until you accept', items: [['cost of care', 'Hint · 1–3 words, ranked by your own accept history'], ['Dogs, by comparison, need', 'Phrase, grounded in context + top library facts + last two sentences'], ['What does a dog cost?', 'Question prompt']] },
  { color: '#8A5F00', title: 'Yellow — Lint: your rules, checked', items: [['Studies show our algorithm is dramatically faster.', 'Unsupported claim · yellow underline, no highlight'], ['Mistakes were made.', 'Passive blame · yellow underline']] },
]

export default function Landing() {
  const [email, setEmail] = useState(''); const [msg, setMsg] = useState('')
  async function join(e: any) {
    e.preventDefault()
    const d = await api.waitlist(email)
    if (d?.ok) setMsg(`On waitlist (${d.store}). Watch inbox. ✔︎`)
    else { localStorage.setItem('byline.waitlist', email); setMsg('Saved locally — backend offline, will sync at launch. ✔︎') }
    setEmail('')
  }
  return (
    <div>
      <header className="topbar"><Logo /><div className="spacer" /><ThemeToggle /><a className="btn" href="/demo">Public demo</a><a className="btn primary" href="/app">Open app</a></header>
      <main>
      <section className="hero">
        <div className="hero-grid">
          <div className="hero-copy">
            <h1>You write.<br />Byline suggests.<br />You choose.</h1>
            <p>Other editors give finished text. Byline gives options — hints, phrases, questions, sentences — grounded in your context and vocabulary level. Then it reads your draft like a stranger, and shows what sources say. Every word stays your choice.</p>
            <form className="waitlist" onSubmit={join}>
              <label className="sr-only" htmlFor="waitlist-email">Email address</label>
              <input id="waitlist-email" type="email" autoComplete="email" inputMode="email" required placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} />
              <a className="btn primary" href="/demo">Try demo — no signup</a>
              <button type="submit">Join waitlist</button>
            </form>
            {msg && <p className="fade" role="status" aria-live="polite">{msg}</p>}
          </div>
          <div className="proof-sheet" aria-label="Example marked draft">
            <h2>Cats or dogs: choosing a first pet</h2>
            <div className="proof-cols">
              <div>
                <p>Cats are independent, as I said. <span style={{ textDecoration: 'underline wavy var(--lt) 1.5px', textUnderlineOffset: 4 }}>Dogs needs daily walks.</span> <span style={{ textDecoration: 'underline wavy var(--lt) 1.5px', textUnderlineOffset: 4 }}>A plethora of reasons</span> exist for choosing a cat. <span style={{ background: 'color-mix(in srgb, var(--blue) 18%, transparent)' }}>Cats live longer than dogs</span><span className="stamp">Supports</span>, so they are clearly the better long-term choice.</p>
              </div>
              <aside className="proof-margin" aria-label="Margin queries">
                <div className="mq">mq — “needs” → “need”: agreement. <span style={{ color: 'var(--muted)' }}>Language</span></div>
                <div className="mq">mq — a plethora, at your level? <span style={{ color: 'var(--muted)' }}>Word choice</span></div>
              </aside>
            </div>
            <div className="proof-popup">
              <span className="chip" style={{ background: 'var(--lt)' }}>Grammar</span>
              <div className="pp-q">“Dogs needs daily walks”</div>
              <div>Subject–verb agreement: “Dogs need”. Fix it, ignore it, or add the word — your call.</div>
              <div className="pp-hint"><a className="btn" href="/demo" style={{ minHeight: 32, padding: '3px 10px' }}>Open this proof in the live demo</a></div>
            </div>
          </div>
        </div>
        <div className="ink-key" aria-label="The five layers">
          {CARDS.map(c => <span key={c.title} className="chip" style={{ background: 'var(--dock)', color: 'var(--ink)', border: '1px solid var(--border)', fontSize: 11 }}><span className="swatch" style={{ background: c.color }} aria-hidden="true" /> {c.title.split('—')[1]?.trim() || c.title}</span>)}
        </div>
      </section>
      <section className="grid4" aria-label="How Byline marks your draft">{CARDS.map(c => (
        <article className="card" key={c.title}><h3><span className="swatch" style={{ background: c.color }} aria-hidden="true" /> {c.title}</h3>
          <ul>{c.items.map(([q, m], i) => <li key={i}><div className="quote-serif">{q}</div>{m && <div className="meta">{m}</div>}</li>)}</ul>
        </article>))}
      </section>
      <section className="section"><h2>Demo moment</h2><p>Demo opens in Drafting. Guided flow: accept a ghost suggestion, switch to Editing and fix a red underline, open Sources for claim verdicts, run Lint for yellow rule checks. Setup wizard generates an outline that replaces the table-of-contents list, stays linked to the editor, and activates the sources agent per section. Click the top-bar metrics pill for live latency / tokens / full prompts plus benchmark tables.</p>
        <h2>Intent gap</h2><p>You write what you mean in context box. Byline shows what reader perceives. Sentences causing gap get highlighted — red for wording, purple for landing, blue for outside world, gray for proposals.</p>
        <h2>Benchmarked, not guessed</h2><p>Ghost text runs Meta Muse Spark 1.3 (<code>reasoning_effort=minimal</code>), quote-anchored — no ID tags, no offset guessing. Verbatim-quote validation: 100% across Muse 1.1–1.3, Wonder 1.0, Gemini 2.5 Flash Lite. Full table in <code>BENCHMARK.md</code>.</p>
      </section>
      </main>
      <footer className="section" style={{ color: 'var(--muted)', fontSize: 13 }}>Byline — challenge whole notion of AI writing. No login. Docs stay in browser.</footer>
    </div>
  )
}
