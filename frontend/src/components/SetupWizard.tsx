import React, { useState } from 'react'
import type { DocumentContext, OutlineNode, ThemeId } from '../domain/document'
import { sfxPick, sfxSuccess } from '../lib/sfx'
import '../styles/setup-wizard.css'

export interface SetupResult {
  context: DocumentContext
  outline: OutlineNode[]
  initialHtml?: string
  theme?: ThemeId
}

export interface SetupWizardProps {
  isOpen: boolean
  onClose: () => void
  onComplete: (result: SetupResult) => void
}

const TEMPLATES: Array<{
  id: string
  name: string
  description: string
  defaultContext: DocumentContext
  defaultOutline: OutlineNode[]
  sampleHtml: string
}> = [
  {
    id: 'argumentative',
    name: 'Argumentative Essay',
    description: 'Thesis-driven structure evaluating evidence, concessions, and synthesized conclusions.',
    defaultContext: {
      topic: 'Intercity Rail Infrastructure vs. Highway Expansion',
      purpose: 'Argue that strategic rail electrification delivers higher economic yields than highway expansion.',
      audience: 'Urban policy makers and undecided regional voters',
      background: 'Regional air corridors and highway networks face worsening congestion and carbon debt.',
      keyIdeas: [
        'Airport runway saturation compounds productivity losses.',
        'High upfront capital expenditure can be amortized via land-value capture.',
        'Core-to-core rail connectivity accelerates regional labor market mobility.',
      ],
      constraints: ['Ground arguments in economic and transit data', 'Directly address municipal debt risks'],
    },
    defaultOutline: [
      { id: 'sec-1', title: '1. The Congestion Dilemma', description: 'Introduce runway and highway saturation.', order: 1 },
      { id: 'sec-2', title: '2. The Capital Cost Critique', description: 'Examine debt loads and suburban density limits.', order: 2 },
      { id: 'sec-3', title: '3. Comparative Economic Yields', description: 'Analyze travel predictability and carbon savings.', order: 3 },
      { id: 'sec-4', title: '4. Dialectical Synthesis', description: 'Frame investment as a balanced infrastructure portfolio.', order: 4 },
    ],
    sampleHtml: `<h1>The Infrastructure Dilemma: High-Speed Rail in North America</h1><p>Critics frequently point to astronomical upfront capital expenditure and persistent debt loads incurred by regional transit authorities. In sprawling metropolitan regions, low population density often lengthens the payback horizon of dedicated rights-of-way.</p><p>Intercity air travel corridors face worsening ground delays and saturated runways that constrain economic productivity. Strategic electrification of mid-distance transit hubs offers exponential reductions in carbon intensity while interconnecting regional labor markets.</p>`,
  },
  {
    id: 'analytical',
    name: 'Analytical Essay (Pets & Wellbeing)',
    description: 'Comparative inquiry contrasting lifestyle autonomy, costs, and emotional companionship.',
    defaultContext: {
      topic: 'Cats or dogs: choosing a first pet',
      purpose: 'Analyze lifestyle trade-offs between felines and canines for first-time owners.',
      audience: 'Undecided first-time pet adopters',
      background: 'Adopters often underestimate time commitments and spatial requirements.',
      keyIdeas: ['Cats offer schedule flexibility', 'Dogs provide high-energy companionship but require routine'],
    },
    defaultOutline: [
      { id: 'sec-1', title: '1. Introduction & Lifestyle Fit', description: 'Frame the decision around daily schedule constraints.', order: 1 },
      { id: 'sec-2', title: '2. Independence vs. Demands', description: 'Compare feline autonomy with canine exercise routines.', order: 2 },
      { id: 'sec-3', title: '3. Long-term Considerations', description: 'Assess lifespan, healthcare, and financial obligations.', order: 3 },
      { id: 'sec-4', title: '4. Conclusion', description: 'Guide readers to identify their household baseline.', order: 4 },
    ],
    sampleHtml: `<h1>Cats or dogs: choosing a first pet</h1><p>Cats are independent, as I said. Dogs needs daily walks. A plethora of reasons exist for choosing a cat. Cats live longer than dogs, so they are clearly the better long-term choice.</p><p>Cats are quiet. Dogs bark. Studies show that dog owners are always happier than cat owners. The utilisation of a litter box facilitates a paradigm shift in home hygiene. Finally, cats are just cute.</p>`,
  },
  {
    id: 'report',
    name: 'Technical / Strategic Report',
    description: 'Executive briefing framing operational challenges, architecture, and phased implementation.',
    defaultContext: {
      topic: 'Decarbonizing Regional Logistics Corridors',
      purpose: 'Deliver an executive roadmap for battery-electric freight transitions.',
      audience: 'Fleet operators and regional logistics directors',
      keyIdeas: ['Grid interconnection limits', 'Depot fast-charging economics', 'Total cost of ownership parity'],
    },
    defaultOutline: [
      { id: 'sec-1', title: '1. Executive Summary', description: 'Core problem and cost parity timeline.', order: 1 },
      { id: 'sec-2', title: '2. Grid & Depot Infrastructure', description: 'Interconnection delays and peak charging loads.', order: 2 },
      { id: 'sec-3', title: '3. Operational Transition', description: 'Phased route electrification strategy.', order: 3 },
    ],
    sampleHtml: `<h1>Executive Briefing: Logistics Corridor Electrification</h1><p>Freight fleet operators face urgent decarbonization mandates alongside razor-thin operating margins. While long-haul battery chemistry continues to mature, depot charging capacity represents the primary bottleneck to medium-duty adoption.</p>`,
  },
]

export default function SetupWizard({ isOpen, onClose, onComplete }: SetupWizardProps) {
  const [step, setStep] = useState<'survey' | 'template'>('survey')

  // Survey answers
  const [docType, setDocType] = useState('Essay')
  const [purpose, setPurpose] = useState('Argue or persuade')
  const [audience, setAudience] = useState('General audience')
  const [topic, setTopic] = useState('')

  // Template selection
  const [selectedTemplateId, setSelectedTemplateId] = useState('argumentative')

  if (!isOpen) return null

  const handleNextToTemplates = () => {
    sfxPick()
    setStep('template')
  }

  const handleApplyPreset = (templateId: string) => {
    const tpl = TEMPLATES.find(t => t.id === templateId) || TEMPLATES[0]
    sfxSuccess()
    onComplete({
      context: tpl.defaultContext,
      outline: tpl.defaultOutline,
      initialHtml: tpl.sampleHtml,
      theme: 'neutral',
    })
    onClose()
  }

  const handleCompleteCustom = () => {
    const tpl = TEMPLATES.find(t => t.id === selectedTemplateId) || TEMPLATES[0]
    sfxSuccess()
    onComplete({
      context: {
        topic: topic || tpl.defaultContext.topic,
        purpose: purpose || tpl.defaultContext.purpose,
        audience: audience || tpl.defaultContext.audience,
        keyIdeas: tpl.defaultContext.keyIdeas,
        constraints: tpl.defaultContext.constraints,
      },
      outline: tpl.defaultOutline,
      initialHtml: tpl.sampleHtml,
      theme: 'neutral',
    })
    onClose()
  }

  const handleBlankDocument = () => {
    sfxSuccess()
    onComplete({
      context: {
        topic: topic || 'Untitled writing',
        purpose: purpose || 'Explain or explore an idea',
        audience: audience || 'General readers',
      },
      outline: [
        { id: 'sec-1', title: '1. Introduction', description: 'Establish the core thesis or topic.', order: 1 },
        { id: 'sec-2', title: '2. Supporting Content', description: 'Develop the key arguments or narrative.', order: 2 },
        { id: 'sec-3', title: '3. Conclusion', description: 'Summarize implications.', order: 3 },
      ],
      initialHtml: '<p></p>',
      theme: 'neutral',
    })
    onClose()
  }

  return (
    <div className="wz-back" onMouseDown={onClose}>
      <div className="wz-card" role="dialog" aria-modal="true" onMouseDown={e => e.stopPropagation()}>
        {/* Header */}
        <div className="wz-row" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontFamily: '"Source Serif 4", serif', fontStyle: 'italic', fontSize: 18, fontWeight: 600, color: '#A93226' }}>
              Byline
            </span>
            <span style={{ fontSize: 12, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: 1 }}>
              Document Setup
            </span>
          </div>
          <button className="wz-icon" aria-label="Close" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Quick Demo Preset Banner */}
        <div
          style={{
            background: 'var(--paper-2, #FBF6EE)',
            border: '1px solid var(--ink-2, #D9CEBE)',
            borderRadius: 6,
            padding: '10px 14px',
            marginBottom: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--ink-5, #2C2523)' }}>
              Evaluate Hackathon Golden Path
            </div>
            <div style={{ fontSize: 12, color: 'var(--ink-4, #73685F)' }}>
              1-click pre-populated draft with verified Meta AI reflections, Connect, and paraphrase.
            </div>
          </div>
          <button
            onClick={() => handleApplyPreset('argumentative')}
            style={{
              padding: '6px 12px',
              background: '#A93226',
              color: '#fff',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: 12,
              whiteSpace: 'nowrap',
            }}
          >
            Launch Demo Preset →
          </button>
        </div>

        {/* Steps Navigation */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <button
            className={`wz-chip ${step === 'survey' ? 'on' : ''}`}
            onClick={() => setStep('survey')}
          >
            1. Survey (Intent)
          </button>
          <button
            className={`wz-chip ${step === 'template' ? 'on' : ''}`}
            onClick={() => setStep('template')}
          >
            2. Template & Outline
          </button>
        </div>

        {/* Step 1: Survey */}
        {step === 'survey' && (
          <div style={{ display: 'grid', gap: 14 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-4)', textTransform: 'uppercase' }}>
                What are you writing?
              </label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                {['Essay', 'Report', 'Article', 'Story', 'Other'].map(opt => (
                  <button
                    key={opt}
                    type="button"
                    className={`wz-pill ${docType === opt ? 'active' : ''}`}
                    onClick={() => { setDocType(opt); sfxPick() }}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-4)', textTransform: 'uppercase' }}>
                What are you trying to accomplish?
              </label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                {['Explain', 'Argue or persuade', 'Inform', 'Analyze', 'Narrate'].map(opt => (
                  <button
                    key={opt}
                    type="button"
                    className={`wz-pill ${purpose === opt ? 'active' : ''}`}
                    onClick={() => { setPurpose(opt); sfxPick() }}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-4)', textTransform: 'uppercase' }}>
                Who will read it?
              </label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                {['General audience', 'Students', 'Academic audience', 'Professionals'].map(opt => (
                  <button
                    key={opt}
                    type="button"
                    className={`wz-pill ${audience === opt ? 'active' : ''}`}
                    onClick={() => { setAudience(opt); sfxPick() }}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-4)', textTransform: 'uppercase' }}>
                What is it about? (Topic or thesis)
              </label>
              <input
                className="wz-input"
                style={{ marginTop: 4 }}
                value={topic}
                placeholder="e.g. Evaluating high-speed rail investment in North America…"
                onChange={e => setTopic(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
              <button
                type="button"
                onClick={handleBlankDocument}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--ink-4)',
                  cursor: 'pointer',
                  fontSize: 13,
                  textDecoration: 'underline',
                }}
              >
                Skip to Blank Document
              </button>
              <button
                type="button"
                className="wz-btn-primary"
                onClick={handleNextToTemplates}
              >
                Choose Template & Outline →
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Template Selection */}
        {step === 'template' && (
          <div style={{ display: 'grid', gap: 14 }}>
            <div style={{ fontSize: 13, color: 'var(--ink-4)' }}>
              Templates provide an editable starting outline and context structure. You can edit every node inside the workspace.
            </div>

            <div style={{ display: 'grid', gap: 10 }}>
              {TEMPLATES.map(t => (
                <div
                  key={t.id}
                  onClick={() => { setSelectedTemplateId(t.id); sfxPick() }}
                  style={{
                    padding: '12px 14px',
                    borderRadius: 6,
                    border: selectedTemplateId === t.id ? '2px solid #A93226' : '1px solid var(--ink-2)',
                    background: selectedTemplateId === t.id ? 'var(--paper-2)' : 'var(--paper-1)',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--ink-5)' }}>{t.name}</span>
                    {selectedTemplateId === t.id && (
                      <span style={{ fontSize: 12, color: '#A93226', fontWeight: 600 }}>Selected</span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--ink-4)', marginTop: 4 }}>{t.description}</div>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 8 }}>
                    {t.defaultOutline.map(node => (
                      <span
                        key={node.id}
                        style={{
                          fontSize: 11,
                          padding: '2px 6px',
                          background: 'var(--ink-1, #EDE4D8)',
                          borderRadius: 3,
                          color: 'var(--ink-5)',
                        }}
                      >
                        {node.title}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
              <button
                type="button"
                className="wz-btn-secondary"
                onClick={() => setStep('survey')}
              >
                ← Back to Survey
              </button>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  className="wz-btn-secondary"
                  onClick={handleBlankDocument}
                >
                  Start Blank
                </button>
                <button
                  type="button"
                  className="wz-btn-primary"
                  onClick={handleCompleteCustom}
                >
                  Enter Workspace →
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
