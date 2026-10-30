import React, { useState } from 'react'
import type { OutlineNode } from '../domain/document'
import { blip, sfxAccept } from '../lib/sfx'

export interface ExpandSectionModalProps {
  section: OutlineNode
  contextTopic?: string
  onConfirm: (contentToInsert: string) => void
  onClose: () => void
}

/**
 * Preview modal for expanding an outline section into proposed draft content.
 * Guarantees explicit user action and preview before inserting into the draft.
 * Never silently overwrites existing writing.
 */
export default function ExpandSectionModal({
  section,
  contextTopic = '',
  onConfirm,
  onClose,
}: ExpandSectionModalProps) {
  // Generate a structured draft proposal from the section's title and description/notes
  const generateInitialDraft = (): string => {
    const cleanTitle = section.title.replace(/^[\d.]+\s*/, '').trim()
    const desc = (section.description || section.notes || '').trim()

    let draft = `<h2>${section.title}</h2>\n<p>`
    if (desc) {
      draft += `${desc} `
    }
    if (contextTopic) {
      draft += `This section examines how ${cleanTitle.toLowerCase()} directly impacts ${contextTopic.toLowerCase()}. Key evidence and reasoning should be developed here to support the overall argument.`
    } else {
      draft += `Further elaboration, context, and supporting evidence for ${cleanTitle.toLowerCase()} should be articulated in this section.`
    }
    draft += `</p>`
    return draft
  }

  const [proposedContent, setProposedContent] = useState(generateInitialDraft)

  const handleInsert = () => {
    sfxAccept()
    onConfirm(proposedContent)
  }

  const handleCancel = () => {
    blip('select')
    onClose()
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        background: 'rgba(0, 0, 0, 0.55)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="expand-modal-title"
    >
      <div
        className="fade"
        style={{
          background: 'var(--paper, #fff)',
          color: 'var(--ink, #111)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg, 12px)',
          width: '100%',
          maxWidth: 580,
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90vh',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <h3 id="expand-modal-title" style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
              Expand Outline Section into Draft
            </h3>
            <p className="meta" style={{ margin: '3px 0 0', fontSize: 12 }}>
              Preview and adjust proposed content before explicitly inserting it at your editor cursor.
            </p>
          </div>
          <button
            type="button"
            onClick={handleCancel}
            aria-label="Close"
            style={{
              background: 'none',
              border: 'none',
              fontSize: 18,
              color: 'var(--muted)',
              cursor: 'pointer',
              padding: '4px 8px',
            }}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: 20, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Outline section reference */}
          <div
            style={{
              background: 'var(--hover, rgba(127,127,127,0.08))',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius, 8px)',
              padding: '10px 14px',
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Source Outline Section
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', marginTop: 2 }}>
              {section.title}
            </div>
            {(section.description || section.notes) && (
              <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 4, fontStyle: 'italic' }}>
                Note: {section.description || section.notes}
              </div>
            )}
          </div>

          {/* Editable proposed draft preview */}
          <div>
            <label
              htmlFor="proposed-draft-textarea"
              style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6, color: 'var(--ink)' }}
            >
              Proposed Draft Content (editable preview)
            </label>
            <textarea
              id="proposed-draft-textarea"
              rows={7}
              value={proposedContent}
              onChange={e => setProposedContent(e.target.value)}
              style={{
                width: '100%',
                fontSize: 13.5,
                lineHeight: 1.55,
                fontFamily: 'inherit',
                padding: '10px 12px',
                borderRadius: 'var(--radius, 8px)',
                border: '1px solid var(--border)',
                background: 'var(--bg)',
                color: 'var(--ink)',
                resize: 'vertical',
                boxSizing: 'border-box',
              }}
            />
            <p className="meta" style={{ margin: '6px 0 0', fontSize: 11.5 }}>
              This will be inserted at your current cursor location in the main draft without overwriting other text.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '12px 20px',
            borderTop: '1px solid var(--border)',
            background: 'var(--dock, transparent)',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 10,
          }}
        >
          <button
            type="button"
            onClick={handleCancel}
            style={{
              padding: '7px 14px',
              fontSize: 13,
              borderRadius: 'var(--radius, 6px)',
              border: '1px solid var(--border)',
              background: 'transparent',
              color: 'var(--ink)',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleInsert}
            disabled={!proposedContent.trim()}
            style={{
              padding: '7px 16px',
              fontSize: 13,
              fontWeight: 600,
              borderRadius: 'var(--radius, 6px)',
              border: '1px solid var(--blue, #1765CC)',
              background: 'var(--blue, #1765CC)',
              color: '#fff',
              cursor: 'pointer',
              opacity: proposedContent.trim() ? 1 : 0.5,
            }}
          >
            Insert into Draft
          </button>
        </div>
      </div>
    </div>
  )
}
