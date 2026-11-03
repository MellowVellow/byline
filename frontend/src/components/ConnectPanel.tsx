import React from 'react'
import {
  CONNECT_RELATIONS,
  type ConnectSession,
  unsourcedFigure,
} from '../lib/connect'

export interface ConnectPanelProps {
  session: ConnectSession
  onToggleSeam: (index: number) => void
  onCycleAlt: (seamIndex: number, dir: 1 | -1) => void
  onCycleRelation: (seamIndex: number) => void
  focus?: number
}

export default function ConnectPanel({
  session,
  onToggleSeam,
  onCycleAlt,
  onCycleRelation,
  focus = 0,
}: ConnectPanelProps) {
  const figure = unsourcedFigure(session.orig)

  return (
    <aside
      className="connect-popup caret-pop fade"
      aria-label="Connect options"
      onMouseDown={e => e.preventDefault()}
    >
      <div className="connect-popup-head">
        <div>
          <strong>Connect</strong>
          <div className="connect-popup-sub">Applied inline · {session.casual ? 'casual' : 'formal'} register</div>
        </div>
      </div>

      <div className="connect-popup-list">
        {session.seams.map((seam, i) => {
          const alts = session.alts[i] || []
          const alt = alts[seam.v] || alts[0]
          const removed = session.dels[i]
          return (
            <div key={i} className={`connect-seam${seam.on ? '' : ' off'}`}>
              <div
                className="connect-seam-top"
                style={i === focus ? { outline: '1px solid var(--ai)', borderRadius: 4 } : undefined}
              >
                <input
                  type="checkbox"
                  checked={seam.on}
                  onChange={() => onToggleSeam(i)}
                  aria-label={`Seam ${i + 1}`}
                />
                <button
                  type="button"
                  className="connect-rel"
                  onClick={() => onCycleRelation(i)}
                  title="Next relationship type"
                >
                  {CONNECT_RELATIONS[alt.rel] || ''}
                </button>
                <span className="connect-alt-count" title="Alternative pager">
                  {seam.v + 1}/{alts.length}
                </span>
              </div>
              <div className="connect-seam-main">
                <button
                  type="button"
                  className="connect-variant"
                  onClick={e => onCycleAlt(i, e.shiftKey ? -1 : 1)}
                  title="Click for next alternative (Shift+click for previous)"
                >
                  {alt.text}
                </button>
                {removed && <span className="connect-seam-muted">→ “{removed}”</span>}
              </div>
            </div>
          )
        })}
      </div>

      {figure && (
        <div className="connect-figure">Unsourced figure: “{figure}”. Flagged, not fixed.</div>
      )}

      <div className="connect-popup-hint">
        <kbd>`</kbd>/<kbd>Alt</kbd>+<kbd>`</kbd> cycle option · <kbd>Shift</kbd>+<kbd>Tab</kbd> next seam · <kbd>Tab</kbd> keep · <kbd>Esc</kbd> undo
      </div>
    </aside>
  )
}
