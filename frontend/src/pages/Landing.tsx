import { useState } from 'react'
import { api } from '../lib/api'
import { Logo, ThemeToggle } from '../components/Brand'

const CARDS = [
  { color: '#D93025', title: 'Red — Language: how it is worded', items: [['Dogs needs daily walks.', 'Grammar · dark red squiggle'], ['A plethora of reasons.', 'Word choice · red underline, checks your level'], ['Cats are quiet. Dogs bark.', 'Cohesion · light red underline, uses your context']] },
  { color: '#7C4DFF', title: 'Purple — Reader: how it lands', items: [['Cats are independent, as I said.', 'Questions and clarity · dotted line'], ['“You already mentioned this.” “This contradicts your first point.”', ''], ['Finally, cats are just cute.', 'Feedback and coherence · dotted line']] },
  { color: '#1A73E8', title: 'Blue — Sources: what evidence says', items: [['Cats live longer than dogs.', 'Claim → verdict (supports / qualifies / contradicts) → evidence sentence → linked source'], ['Sources agent activates per outline section', 'Notebook-style sources workspace']] },
  { color: '#9AA0A6', title: 'Grey — Suggest: not yours until you accept', items: [['cost of care', 'Hint · 1–3 words, ranked by your own accept history'], ['Dogs, by comparison, need', 'Phrase, grounded in context + top library facts + last two sentences'], ['What does a dog cost?', 'Question prompt']] },
  { color: '#D99A06', title: 'Yellow — Lint: your rules, checked', items: [['Studies show our algorithm is dramatically faster.', 'Unsupported claim · yellow underline, no highlight'], ['Mistakes were made.', 'Passive blame · yellow underline']] },
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
      <header className="topbar"><Logo /><div className="spacer" /><ThemeToggle /><a href="/demo"><button>Public demo</button></a><a href="/app"><button className="primary">Open app</button></a></header>
      <section className="hero">
        <div style={{ display: 'flex', justifyContent: 'center' }}><Logo height={72} /></div>
        <h1>You write.<br />Byline suggests.<br />You choose.</h1>
        <p>Other editors give finished text. Byline gives options — hints, phrases, questions, sentences — grounded in your context and vocabulary level. Then it reads your draft like a stranger, and shows what sources say. Every word stays your choice.</p>
        <form className="waitlist" onSubmit={join}>
          <input type="email" required placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} />
          <button className="primary" type="submit">Join waitlist</button>
          <a href="/demo"><button type="button">Try demo — no signup</button></a>
        </form>
        {msg && <p className="fade">{msg}</p>}
      </section>
      <div className="grid4">{CARDS.map(c => (
        <div className="card" key={c.title}><h3 style={{ marginTop: 0 }}><span className="swatch" style={{ background: c.color }} /> {c.title}</h3>
          {c.items.map(([q, m], i) => <div key={i} style={{ borderTop: '1px solid var(--border)', padding: '8px 0' }}><div className="quote-serif">{q}</div>{m && <div className="meta" style={{ color: 'var(--muted)', fontSize: 12 }}>{m}</div>}</div>)}
        </div>))}
      </div>
      <section className="section"><h2>Demo moment</h2><p>Demo opens in Drafting. Guided flow: accept a ghost suggestion, switch to Editing and fix a red underline, open Sources for claim verdicts, run Lint for yellow rule checks. Setup wizard generates an outline that replaces the table-of-contents list, stays linked to the editor, and activates the sources agent per section. Click the top-bar metrics pill for live latency / tokens / full prompts plus benchmark tables.</p>
        <h2>Intent gap</h2><p>You write what you mean in context box. Byline shows what reader perceives. Sentences causing gap get highlighted — red for wording, purple for landing, blue for outside world, gray for proposals.</p>
        <h2>Benchmarked, not guessed</h2><p>Ghost text runs Meta Muse Spark 1.3 (<code>reasoning_effort=minimal</code>), quote-anchored — no ID tags, no offset guessing. Verbatim-quote validation: 100% across Muse 1.1–1.3, Wonder 1.0, Gemini 2.5 Flash Lite. Full table in <code>BENCHMARK.md</code>.</p>
      </section>
      <footer className="section" style={{ color: 'var(--muted)', fontSize: 13 }}>Byline — challenge whole notion of AI writing. No login. Docs stay in browser.</footer>
    </div>
  )
}
