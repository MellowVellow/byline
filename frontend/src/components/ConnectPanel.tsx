import React from 'react'
import {
  type ConnectSession,
  connectRelationLabel,
  connectVariantLabel,
  isLinked,
  unsourcedFigure,
} from '../lib/connect'

export interface ConnectPanelProps {
  session: ConnectSession
  onToggleSeam: (index: number) => void
  onCycleRelation: (index: number) => void
  onCycleVariant: (index: number) => void
  onReroll: () => void
  onKeep: () => void
  onUndo: () => void
}

export default function ConnectPanel({
  session,
  onToggleSeam,
  onCycleRelation,
  onCycleVariant,
  onReroll,
  onKeep,
  onUndo,
}: ConnectPanelProps) {
  const figure = unsourcedFigure(session.orig)

  return (
    <aside
      className="connect-rail"
      aria-label="Connect options"
      onMouseDown={e => e.preventDefault()}
    >
      <div className="connect-rail-head">
        <div>
          <strong>Connect</strong>
          <div className="connect-rail-sub">Applied inline · {session.casual ? 'casual' : 'formal'} register</div>
        </div>
        <button type="button" className="connect-rail-reroll" onClick={onReroll} title="Reroll connectors (Alt+R)">
          ↻
        </button>
      </div>

      <div className="connect-rail-list">
        {session.seams.map((seam, i) => {
          const linked = isLinked(session.sents[i + 1] || '')
          const removed = session.dels[i]
          return (
            <div key={i} className={`connect-seam${seam.on ? '' : ' off'}`}>
              <input
                type="checkbox"
                checked={seam.on}
                onChange={() => onToggleSeam(i)}
                aria-label={`Seam ${i + 1}`}
              />
              <span className="connect-seam-n">{i + 1}</span>
              {linked ? (
                <span className="connect-seam-muted">already linked</span>
              ) : (
                <>
                  <button
                    type="button"
                    className="connect-rel"
                    onClick={() => onCycleRelation(i)}
                    title="Change relationship"
                  >
                    {connectRelationLabel(seam)}
                  </button>
                  <button
                    type="button"
                    className="connect-variant"
                    onClick={() => onCycleVariant(i)}
                    title="Change connector"
                  >
                    {connectVariantLabel(seam, session.casual)}
                  </button>
                  <span className="connect-seam-muted">
                    {removed ? `replaces “${removed}”` : 'added'}
                  </span>
                </>
              )}
            </div>
          )
        })}
      </div>

      {figure && (
        <div className="connect-figure">Unsourced figure: “{figure}”. Flagged, not fixed.</div>
      )}

      <div className="connect-rail-foot">
        <button type="button" className="connect-keep" onClick={onKeep}>
          Keep <kbd>Tab</kbd>
        </button>
        <button type="button" className="connect-undo" onClick={onUndo}>
          Undo <kbd>Esc</kbd>
        </button>
      </div>
      <div className="connect-rail-hint">
        <kbd>Alt</kbd>+<kbd>1–9</kbd> toggles a seam · <kbd>Alt</kbd>+<kbd>R</kbd> rerolls
      </div>
    </aside>
  )
}
