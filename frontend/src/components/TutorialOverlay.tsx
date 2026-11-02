import React, { useState, useEffect, useRef } from 'react'
import { blip, sfxPick, sfxAccept } from '../lib/sfx'

export interface TutorialOverlayProps {
  isOpen: boolean
  onClose: () => void
  onHighlightFeature?: (feature: string | null) => void
}

interface Step {
  id: string
  title: string
  description: string
  tag: string
  tagColor: string
  // Position of the tooltip card relative to the highlighted area
  cardAlign?: 'center' | 'left' | 'right'
  // Optional: CSS selector to spotlight (cutout in overlay)
  spotlightSelector?: string
  shortcut?: string
  icon: string
}

const STEPS: Step[] = [
  {
    id: 'welcome',
    title: 'Welcome to Byline',
    description:
      'Byline lists hints, phrases, and source notes. Each item enters the draft only after approval.',
    tag: 'Core Use',
    tagColor: 'var(--ai)',
    icon: '✦',
    cardAlign: 'center',
  },
  {
    id: 'library',
    title: 'Left Dock: Conversation & Library',
    description:
      'The left dock has two sections. Conversation lists past questions. Each keeps its own summary and table. Library keeps saved rows.',
    tag: 'Left Rail',
    tagColor: 'var(--ai)',
    icon: '📚',
    spotlightSelector: '.rail:first-of-type',
    cardAlign: 'right',
    shortcut: '› to expand',
  },
  {
    id: 'draft',
    title: 'Draft Mode & Completions',
    description:
      'Completions show as faint text when you pause. Tab accepts the first item. Keys 1–3 select other items. Set the level (Hint to Sentence) in Context.',
    tag: 'Editor · Draft',
    tagColor: 'var(--grey)',
    icon: '✏️',
    spotlightSelector: 'main',
    cardAlign: 'left',
    shortcut: 'Ctrl + Space',
  },
  {
    id: 'connect',
    title: 'Connect Transitions',
    description:
      'Use the ⇌ list in the top bar to insert links — concession, cause, synthesis. Open Connect Studio to draft links from nearby sentences.',
    tag: 'Top Bar · ⇌',
    tagColor: 'var(--yellow)',
    icon: '⇌',
    spotlightSelector: '.topbar',
    cardAlign: 'center',
    shortcut: 'Ctrl + /',
  },
  {
    id: 'reflection',
    title: 'Reader Dock',
    description:
      'Open Edit mode and select Run Review. The Reader marks passages with purple lines and margin notes. Grammar corrections apply in both modes.',
    tag: 'Right Rail · Edit Mode',
    tagColor: 'var(--ai)',
    icon: '🔍',
    spotlightSelector: '.rail.right-rail',
    cardAlign: 'left',
    shortcut: 'Switch mode → Edit',
  },
]

export const TOUR_SEEN_KEY = 'byline.tour_seen'

export function isTourSeen(): boolean {
  try { return localStorage.getItem(TOUR_SEEN_KEY) === 'true' } catch { return false }
}

export function markTourSeen() {
  try { localStorage.setItem(TOUR_SEEN_KEY, 'true') } catch {}
  try { sessionStorage.setItem('byline.tour_opened', '1') } catch {}
}

function getSpotlightRect(selector?: string): DOMRect | null {
  if (!selector) return null
  try {
    const el = document.querySelector(selector)
    if (!el) return null
    const rect = el.getBoundingClientRect()
    return rect
  } catch {
    return null
  }
}

export default function TutorialOverlay({ isOpen, onClose, onHighlightFeature }: TutorialOverlayProps) {
  const [currentIdx, setCurrentIdx] = useState(0)
  const [spotlightRect, setSpotlightRect] = useState<DOMRect | null>(null)
  const rafRef = useRef<number>(0)
  const cardRef = useRef<HTMLDivElement>(null)
  const reduceMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

  const step = STEPS[currentIdx]
  const isFirst = currentIdx === 0
  const isLast = currentIdx === STEPS.length - 1

  // Update spotlight rect on each animation frame when open
  useEffect(() => {
    if (!isOpen) {
      setSpotlightRect(null)
      onHighlightFeature?.(null)
      return
    }
    onHighlightFeature?.(step.id)

    const update = () => {
      setSpotlightRect(getSpotlightRect(step.spotlightSelector))
      rafRef.current = requestAnimationFrame(update)
    }
    rafRef.current = requestAnimationFrame(update)
    return () => cancelAnimationFrame(rafRef.current)
  }, [isOpen, currentIdx])

  useEffect(() => {
    if (!isOpen) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); handleFinish() }
      else if (e.key === 'ArrowRight' || e.key === 'Enter') { e.preventDefault(); handleNext() }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); handlePrev() }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [isOpen, currentIdx])

  // Focus the card on open + step change so keyboard users land smoothly
  useEffect(() => {
    if (!isOpen) return
    const t = setTimeout(() => cardRef.current?.focus(), 60)
    return () => clearTimeout(t)
  }, [isOpen, currentIdx])

  if (!isOpen) return null

  const handleNext = () => {
    if (isLast) { handleFinish(); return }
    sfxPick()
    setCurrentIdx(c => c + 1)
  }
  const handlePrev = () => {
    if (!isFirst) { sfxPick(); setCurrentIdx(c => c - 1) }
  }
  const handleFinish = () => {
    sfxAccept()
    markTourSeen()
    onClose()
  }

  // Build SVG clip path for spotlight cutout
  const PAD = 10
  const RADIUS = 8
  const vw = window.innerWidth
  const vh = window.innerHeight

  let spotlightSvg: React.ReactNode = null
  let cardPosition: { top?: number | string; bottom?: number | string; left?: number | string; right?: number | string; transform?: string } = {
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
  }

  if (spotlightRect && spotlightRect.width > 0) {
    const x = Math.max(0, spotlightRect.left - PAD)
    const y = Math.max(0, spotlightRect.top - PAD)
    const w = Math.min(vw, spotlightRect.width + PAD * 2)
    const h = Math.min(vh, spotlightRect.height + PAD * 2)

    const cx = x + w / 2
    const cy = y + h / 2

    // Card positioning based on step.cardAlign and spotlight location
    const CARD_W = 460
    const CARD_MARGIN = 16
    const below = cy < vh * 0.55 // spotlight in upper half → card below
    const cardTop = below ? Math.min(y + h + 20, vh - 260) : Math.max(y - 240, 10)

    if (step.cardAlign === 'left') {
      cardPosition = { top: cardTop, left: Math.max(CARD_MARGIN, x), transform: 'none' }
    } else if (step.cardAlign === 'right') {
      cardPosition = { top: cardTop, right: CARD_MARGIN, transform: 'none' }
    } else {
      const cardLeft = Math.max(CARD_MARGIN, Math.min(cx - CARD_W / 2, vw - CARD_W - CARD_MARGIN))
      cardPosition = { top: cardTop, left: cardLeft, transform: 'none' }
    }

    // SVG hole
    spotlightSvg = (
      <svg
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <mask id="tour-mask">
            <rect width={vw} height={vh} fill="white" />
            <rect x={x} y={y} width={w} height={h} rx={RADIUS} fill="black" />
          </mask>
        </defs>
        <rect width={vw} height={vh} fill="rgba(10,12,16,0.82)" mask="url(#tour-mask)" />
        {/* Glow border around spotlight */}
        <rect x={x} y={y} width={w} height={h} rx={RADIUS} fill="none" stroke={step.tagColor} strokeWidth={1.5} opacity={0.6} />
      </svg>
    )
  }

  return (
    <div
      className="tutorial-backdrop"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: spotlightRect ? 'transparent' : 'rgba(10,12,16,0.82)',
        backdropFilter: spotlightRect ? 'none' : 'blur(2px)',
      }}
      onClick={() => handleFinish()}
    >
      {/* SVG backdrop with cutout */}
      {spotlightSvg}

      {/* No spotlight — full dimmed backdrop (click-through to dismiss) */}
      {!spotlightRect && !step.spotlightSelector && (
        <div style={{ position: 'absolute', inset: 0, backdropFilter: 'blur(3px)', pointerEvents: 'none' }} />
      )}

      {/* Tutorial card */}
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-label="Interactive Workspace Tour"
        tabIndex={-1}
        style={{
          position: 'absolute',
          width: 'min(460px, calc(100vw - 32px))',
          background: 'var(--paper)',
          border: '1px solid var(--border)',
          borderRadius: 8,
          boxShadow: '0 24px 60px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.06)',
          padding: '20px 22px',
          color: 'var(--ink)',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          zIndex: 10000,
          transition: reduceMotion ? 'none' : 'top 0.28s cubic-bezier(0.16, 1, 0.3, 1), left 0.28s cubic-bezier(0.16, 1, 0.3, 1), right 0.28s cubic-bezier(0.16, 1, 0.3, 1), transform 0.28s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.2s ease',
          ...cardPosition,
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 16 }}>{step.icon}</span>
            <span
              style={{
                fontSize: 10.5,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.07em',
                padding: '3px 8px',
                borderRadius: 3,
                background: `color-mix(in srgb, ${step.tagColor} 15%, transparent)`,
                color: step.tagColor,
                border: `1px solid color-mix(in srgb, ${step.tagColor} 30%, transparent)`,
              }}
            >
              {step.tag}
            </span>
            <span style={{ fontSize: 10.5, color: 'var(--muted)' }}>{currentIdx + 1} / {STEPS.length}</span>
          </div>
          <button
            type="button"
            onClick={handleFinish}
            title="Skip Tour (Esc)"
            style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: 15, cursor: 'pointer', padding: '2px 6px', minHeight: 'auto', borderRadius: 4 }}
          >
            ✕
          </button>
        </div>

        {/* Title */}
        <div>
          <h2 style={{ margin: '0 0 5px', fontSize: 17, fontWeight: 700, lineHeight: 1.25 }}>{step.title}</h2>
          <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.6, color: 'var(--ink)', opacity: 0.85 }}>{step.description}</p>
        </div>

        {step.shortcut && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: 'var(--muted)' }}>
            <span>Shortcut:</span>
            <kbd style={{ background: 'var(--dock)', border: '1px solid var(--border)', borderRadius: 4, padding: '2px 7px', fontSize: 11, fontWeight: 600, color: 'var(--ink)' }}>
              {step.shortcut}
            </kbd>
          </div>
        )}

        {/* Progress dots + nav */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border)', paddingTop: 12, marginTop: 2 }}>
          <div style={{ display: 'flex', gap: 5 }}>
            {STEPS.map((_, i) => (
              <span
                key={i}
                onClick={() => { sfxPick(); setCurrentIdx(i) }}
                style={{
                  width: i === currentIdx ? 18 : 6,
                  height: 6,
                  borderRadius: 3,
                  background: i === currentIdx ? step.tagColor : 'var(--border)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'block',
                }}
              />
            ))}
          </div>

          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <button
              type="button"
              onClick={handleFinish}
              style={{ background: 'none', border: 'none', fontSize: 12, color: 'var(--muted)', cursor: 'pointer', padding: '4px 8px', minHeight: 28 }}
            >
              Skip
            </button>
            {!isFirst && (
              <button
                type="button"
                onClick={handlePrev}
                style={{ padding: '4px 12px', fontSize: 12, minHeight: 28, background: 'var(--dock)' }}
              >
                Back
              </button>
            )}
            <button
              type="button"
              className="primary"
              onClick={handleNext}
              style={{ padding: '4px 14px', fontSize: 12, fontWeight: 600, minHeight: 28 }}
            >
              {isLast ? 'Get Started ✦' : 'Next →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
