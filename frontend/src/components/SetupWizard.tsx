import React, { useState } from 'react'
import type { DocumentContext, OutlineNode, ThemeId } from '../domain/document'
import {
  COLOR_PRESETS,
  DEFAULT_SETTINGS,
  type AppSettings,
  type EditorFont,
  type PaperWidth,
} from '../lib/settings'
import { THEME_DEFINITIONS, SUPPORTED_LANGUAGES } from '../domain/writing-profile'
import {
  sfxPick,
  sfxSuccess,
  sfxBack,
  blip,
  sfxEnabled,
  setSfxEnabled,
  getSfxPitch,
  setSfxPitch,
  getSfxInstrument,
  setSfxInstrument,
  type SfxInstrument,
} from '../lib/sfx'
import { Logo } from './Brand'

export interface SetupResult {
  context: DocumentContext
  outline: OutlineNode[]
  initialHtml?: string
  theme?: ThemeId
  settings?: Partial<AppSettings>
}

export interface SetupWizardProps {
  isOpen: boolean
  onClose: () => void
  onComplete: (result: SetupResult) => void
  initialSettings?: AppSettings
}

const STEP_LABELS = [
  'Format',
  'Purpose',
  'Audience',
  'Topic',
  'Outline',
  'Theme & Lang',
  'Workspace',
]

const APPROVED_META_MODELS = [
  { id: 'meta-llama/llama-3.3-70b-instruct', label: 'Meta Llama 3.3 70B Instruct (Primary frontier reasoning)', provider: 'OpenRouter' },
  { id: 'meta-llama/llama-3.1-70b-instruct', label: 'Meta Llama 3.1 70B Instruct (High capability)', provider: 'OpenRouter' },
  { id: 'meta-llama/llama-3.1-8b-instruct', label: 'Meta Llama 3.1 8B Instruct (Ultra-fast latency)', provider: 'OpenRouter' },
  { id: 'muse-spark-1.3', label: 'Muse Spark 1.3 (Meta Model API)', provider: 'Meta API' },
  { id: 'muse-glimmer-30b', label: 'Muse Glimmer 30B (Meta Model API)', provider: 'Meta API' },
  { id: 'meta-llama/Llama-3.3-70B-Instruct', label: 'Meta Llama 3.3 70B (Baseten Hosted)', provider: 'Baseten' },
]

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
    name: 'Strategic / Policy Brief',
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

export default function SetupWizard({ isOpen, onClose, onComplete, initialSettings }: SetupWizardProps) {
  const [currentStep, setCurrentStep] = useState(0)

  // Questionnaire responses
  const [docType, setDocType] = useState('Essay')
  const [otherDocType, setOtherDocType] = useState('')

  const [purpose, setPurpose] = useState('Argue or persuade')
  const [otherPurpose, setOtherPurpose] = useState('')

  const [audience, setAudience] = useState('General audience')
  const [otherAudience, setOtherAudience] = useState('')

  const [topic, setTopic] = useState('')
  const [selectedTemplateId, setSelectedTemplateId] = useState('argumentative')

  // Misc Settings (matching updated Settings Menu)
  const [docLanguage, setDocLanguage] = useState(initialSettings?.language || 'en-US')
  const [writingTheme, setWritingTheme] = useState<ThemeId>(initialSettings?.writingTheme || 'neutral')
  const [autoApplyGrammar, setAutoApplyGrammar] = useState(initialSettings?.autoApplyGrammar ?? false)
  const [colorPresetKey, setColorPresetKey] = useState('byline')
  const [metaModel, setMetaModel] = useState(initialSettings?.metaModel || 'meta-llama/llama-3.3-70b-instruct')
  const [temperature, setTemperature] = useState(initialSettings?.temperature ?? 0.7)
  const [reasoningEffort, setReasoningEffort] = useState<'minimal' | 'low' | 'medium'>(initialSettings?.reasoningEffort || 'minimal')
  const [editorFont, setEditorFont] = useState<EditorFont>(initialSettings?.editorFont || 'serif')
  const [fontSize, setFontSize] = useState(initialSettings?.fontSize || 19)
  const [paperWidth, setPaperWidth] = useState<PaperWidth>(initialSettings?.paperWidth || 'normal')
  const [showWordCount, setShowWordCount] = useState(initialSettings?.showWordCount ?? true)

  // SFX Accessibility State
  const [sfxActive, setSfxActive] = useState(() => sfxEnabled())
  const [sfxPitchVal, setSfxPitchVal] = useState(() => getSfxPitch())
  const [sfxInst, setSfxInst] = useState<SfxInstrument>(() => getSfxInstrument())

  if (!isOpen) return null

  const totalSteps = 7

  const effectiveDocType = docType === 'Other' ? (otherDocType.trim() || 'Custom Document') : docType
  const effectivePurpose = purpose === 'Other' ? (otherPurpose.trim() || 'Custom Purpose') : purpose
  const effectiveAudience = audience === 'Other' ? (otherAudience.trim() || 'Custom Audience') : audience

  const handleLaunchDemoPreset = () => {
    const tpl = TEMPLATES[0] // Rail argument
    sfxSuccess()
    onComplete({
      context: tpl.defaultContext,
      outline: tpl.defaultOutline,
      initialHtml: tpl.sampleHtml,
      theme: 'neutral',
    })
    onClose()
  }

  const handleNext = () => {
    sfxPick()
    if (currentStep < totalSteps - 1) {
      setCurrentStep(s => s + 1)
    } else {
      handleFinish()
    }
  }

  const handleBack = () => {
    sfxBack()
    if (currentStep > 0) {
      setCurrentStep(s => s - 1)
    }
  }

  const handleFinish = (overrideBlank = false) => {
    sfxSuccess()
    const selectedPreset = COLOR_PRESETS[colorPresetKey] || COLOR_PRESETS.byline
    setSfxEnabled(sfxActive)
    setSfxPitch(sfxPitchVal)
    setSfxInstrument(sfxInst)
    const partialSettings: Partial<AppSettings> = {
      language: docLanguage,
      writingTheme,
      autoApplyGrammar,
      metaModel,
      temperature,
      reasoningEffort,
      editorFont,
      fontSize,
      paperWidth,
      showWordCount,
      ai: selectedPreset.ai,
      grammar: selectedPreset.grammar,
      sources: selectedPreset.sources,
      wordChoice: selectedPreset.wordChoice,
      suggest: selectedPreset.suggest,
      selection: selectedPreset.selection,
    }

    if (overrideBlank) {
      onComplete({
        context: {
          topic: topic || 'Untitled writing',
          purpose: effectivePurpose,
          audience: effectiveAudience,
        },
        outline: [
          { id: 'sec-1', title: '1. Introduction', description: 'Establish the core thesis or premise.', order: 1 },
          { id: 'sec-2', title: '2. Main Arguments', description: 'Develop supporting points and evidence.', order: 2 },
          { id: 'sec-3', title: '3. Conclusion', description: 'Synthesize conclusions.', order: 3 },
        ],
        initialHtml: '<p></p>',
        theme: writingTheme,
        settings: partialSettings,
      })
    } else {
      const tpl = TEMPLATES.find(t => t.id === selectedTemplateId) || TEMPLATES[0]
      onComplete({
        context: {
          topic: topic || tpl.defaultContext.topic,
          purpose: effectivePurpose,
          audience: effectiveAudience,
          keyIdeas: tpl.defaultContext.keyIdeas,
          constraints: tpl.defaultContext.constraints,
        },
        outline: tpl.defaultOutline,
        initialHtml: tpl.sampleHtml,
        theme: writingTheme,
        settings: partialSettings,
      })
    }
    onClose()
  }

  return (
    <div
      className="fade"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'var(--bg)',
        color: 'var(--ink)',
        display: 'flex',
        flexDirection: 'column',
      }}
      role="dialog"
      aria-modal="true"
    >
      {/* Top Bar inside Fullscreen Wizard */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 24px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--paper)',
          minHeight: 54,
          flexWrap: 'wrap',
          gap: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <Logo height={24} />
          <span style={{ fontFamily: '"Source Serif 4", serif', fontStyle: 'italic', fontSize: 17, fontWeight: 700, color: 'var(--ink)' }}>
            Byline Setup
          </span>
          {/* Clickable Step Pills to freely navigate back and forth */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 6, flexWrap: 'wrap' }}>
            {STEP_LABELS.map((name, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  if (idx < currentStep) sfxBack()
                  else sfxPick()
                  setCurrentStep(idx)
                }}
                title={`Jump to Step ${idx + 1}: ${name}`}
                style={{
                  padding: '3px 8px',
                  fontSize: 11,
                  fontWeight: idx === currentStep ? 700 : 500,
                  color: idx === currentStep ? 'var(--ink)' : 'var(--muted)',
                  background: idx === currentStep ? 'var(--dock)' : 'transparent',
                  border: idx === currentStep ? '1px solid var(--ai)' : '1px solid transparent',
                  borderRadius: 12,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {idx + 1}. {name}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            type="button"
            onClick={handleLaunchDemoPreset}
            style={{
              padding: '5px 12px',
              background: 'var(--lt)',
              color: 'var(--bg)',
              border: 'none',
              borderRadius: 'var(--radius)',
              fontWeight: 600,
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            ✦ Quick Demo Preset (1-Click)
          </button>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: '1px solid var(--border)',
              padding: '4px 10px',
              fontSize: 12,
              borderRadius: 'var(--radius)',
              cursor: 'pointer',
            }}
          >
            Exit to Editor <span className="kbd">Esc</span>
          </button>
        </div>
      </header>

      {/* Progress Bar */}
      <div style={{ width: '100%', height: 3, background: 'var(--border)' }}>
        <div
          style={{
            height: '100%',
            width: `${((currentStep + 1) / totalSteps) * 100}%`,
            background: 'var(--ai)',
            transition: 'width 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        />
      </div>

      {/* Main Single Question Stage */}
      <main
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px 24px 60px',
          maxWidth: 720,
          margin: '0 auto',
          width: '100%',
          overflowY: 'auto',
        }}
      >
        {/* Step 0: Document Format */}
        {currentStep === 0 && (
          <div key="step-0" className="fade" style={{ width: '100%', display: 'grid', gap: 20, textAlign: 'center' }}>
            <div>
              <span className="kind-label" style={{ color: 'var(--ai)' }}>Step 1 of 7</span>
              <h1 style={{ fontFamily: '"Source Serif 4", serif', fontSize: 32, margin: '8px 0', fontWeight: 700 }}>
                What are you writing?
              </h1>
              <p style={{ color: 'var(--muted)', fontSize: 15, margin: 0 }}>
                Select the format closest to your intended piece.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10 }}>
              {['Essay', 'Report', 'Article', 'Story', 'Other'].map(opt => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => {
                    setDocType(opt)
                    sfxPick()
                    if (opt !== 'Other') setCurrentStep(1)
                  }}
                  style={{
                    padding: '16px 12px',
                    borderRadius: 'var(--radius-lg)',
                    border: docType === opt ? '2px solid var(--ai)' : '1px solid var(--border)',
                    background: docType === opt ? 'var(--dock)' : 'var(--paper)',
                    fontSize: 15,
                    fontWeight: 600,
                    color: 'var(--ink)',
                    cursor: 'pointer',
                    boxShadow: 'var(--shadow-paper)',
                  }}
                >
                  {opt}
                </button>
              ))}
            </div>

            {/* Other Input Box */}
            {docType === 'Other' && (
              <div className="fade" style={{ textAlign: 'left', marginTop: 4 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>
                  Specify your custom format:
                </label>
                <input
                  type="text"
                  autoFocus
                  value={otherDocType}
                  placeholder="e.g. Grant proposal, Book chapter, Manifesto, Op-ed, Technical memo…"
                  onChange={e => setOtherDocType(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleNext() }}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    fontSize: 15,
                    borderRadius: 'var(--radius)',
                    border: '1px solid var(--border)',
                    background: 'var(--paper)',
                    color: 'var(--ink)',
                  }}
                />
              </div>
            )}
          </div>
        )}

        {/* Step 1: Purpose */}
        {currentStep === 1 && (
          <div key="step-1" className="fade" style={{ width: '100%', display: 'grid', gap: 20, textAlign: 'center' }}>
            <div>
              <span className="kind-label" style={{ color: 'var(--ai)' }}>Step 2 of 7</span>
              <h1 style={{ fontFamily: '"Source Serif 4", serif', fontSize: 32, margin: '8px 0', fontWeight: 700 }}>
                What are you trying to accomplish?
              </h1>
              <p style={{ color: 'var(--muted)', fontSize: 15, margin: 0 }}>
                Your core authorial intent will ground Supervisor and Reader reflection.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
              {['Explain', 'Argue or persuade', 'Inform', 'Analyze', 'Narrate', 'Other'].map(opt => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => {
                    setPurpose(opt)
                    sfxPick()
                    if (opt !== 'Other') setCurrentStep(2)
                  }}
                  style={{
                    padding: '16px 12px',
                    borderRadius: 'var(--radius-lg)',
                    border: purpose === opt ? '2px solid var(--ai)' : '1px solid var(--border)',
                    background: purpose === opt ? 'var(--dock)' : 'var(--paper)',
                    fontSize: 15,
                    fontWeight: 600,
                    color: 'var(--ink)',
                    cursor: 'pointer',
                    boxShadow: 'var(--shadow-paper)',
                  }}
                >
                  {opt}
                </button>
              ))}
            </div>

            {/* Other Input Box */}
            {purpose === 'Other' && (
              <div className="fade" style={{ textAlign: 'left', marginTop: 4 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>
                  Specify your authorial purpose:
                </label>
                <input
                  type="text"
                  autoFocus
                  value={otherPurpose}
                  placeholder="e.g. Inspire action, Debunk a common misconception, Reflect on personal experience…"
                  onChange={e => setOtherPurpose(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleNext() }}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    fontSize: 15,
                    borderRadius: 'var(--radius)',
                    border: '1px solid var(--border)',
                    background: 'var(--paper)',
                    color: 'var(--ink)',
                  }}
                />
              </div>
            )}
          </div>
        )}

        {/* Step 2: Audience */}
        {currentStep === 2 && (
          <div key="step-2" className="fade" style={{ width: '100%', display: 'grid', gap: 20, textAlign: 'center' }}>
            <div>
              <span className="kind-label" style={{ color: 'var(--ai)' }}>Step 3 of 7</span>
              <h1 style={{ fontFamily: '"Source Serif 4", serif', fontSize: 32, margin: '8px 0', fontWeight: 700 }}>
                Who will read it?
              </h1>
              <p style={{ color: 'var(--muted)', fontSize: 15, margin: 0 }}>
                Shapes vocabulary complexity, sentence rhythm, and background assumptions.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
              {['General audience', 'Students', 'Academic audience', 'Professionals', 'Other'].map(opt => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => {
                    setAudience(opt)
                    sfxPick()
                    if (opt !== 'Other') setCurrentStep(3)
                  }}
                  style={{
                    padding: '16px 12px',
                    borderRadius: 'var(--radius-lg)',
                    border: audience === opt ? '2px solid var(--ai)' : '1px solid var(--border)',
                    background: audience === opt ? 'var(--dock)' : 'var(--paper)',
                    fontSize: 15,
                    fontWeight: 600,
                    color: 'var(--ink)',
                    cursor: 'pointer',
                    boxShadow: 'var(--shadow-paper)',
                  }}
                >
                  {opt}
                </button>
              ))}
            </div>

            {/* Other Input Box */}
            {audience === 'Other' && (
              <div className="fade" style={{ textAlign: 'left', marginTop: 4 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>
                  Specify your target audience:
                </label>
                <input
                  type="text"
                  autoFocus
                  value={otherAudience}
                  placeholder="e.g. Venture investors, Municipal city planners, Non-native English speakers…"
                  onChange={e => setOtherAudience(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleNext() }}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    fontSize: 15,
                    borderRadius: 'var(--radius)',
                    border: '1px solid var(--border)',
                    background: 'var(--paper)',
                    color: 'var(--ink)',
                  }}
                />
              </div>
            )}
          </div>
        )}

        {/* Step 3: Topic / Thesis */}
        {currentStep === 3 && (
          <div key="step-3" className="fade" style={{ width: '100%', display: 'grid', gap: 20, textAlign: 'center' }}>
            <div>
              <span className="kind-label" style={{ color: 'var(--ai)' }}>Step 4 of 7</span>
              <h1 style={{ fontFamily: '"Source Serif 4", serif', fontSize: 32, margin: '8px 0', fontWeight: 700 }}>
                What is it about?
              </h1>
              <p style={{ color: 'var(--muted)', fontSize: 15, margin: 0 }}>
                State the central topic, question, or thesis in your own words.
              </p>
            </div>

            <div style={{ textAlign: 'left', marginTop: 10 }}>
              <input
                type="text"
                autoFocus
                value={topic}
                placeholder="e.g. Evaluating high-speed rail investment in North America…"
                onChange={e => setTopic(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleNext()
                  }
                }}
                style={{
                  width: '100%',
                  padding: '16px 18px',
                  fontSize: 18,
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--border)',
                  background: 'var(--paper)',
                  color: 'var(--ink)',
                  boxShadow: 'var(--shadow-paper)',
                }}
              />
            </div>
          </div>
        )}

        {/* Step 4: Outline Template */}
        {currentStep === 4 && (
          <div key="step-4" className="fade" style={{ width: '100%', display: 'grid', gap: 20 }}>
            <div style={{ textAlign: 'center' }}>
              <span className="kind-label" style={{ color: 'var(--ai)' }}>Step 5 of 7</span>
              <h1 style={{ fontFamily: '"Source Serif 4", serif', fontSize: 30, margin: '8px 0', fontWeight: 700 }}>
                Choose a Starting Outline
              </h1>
              <p style={{ color: 'var(--muted)', fontSize: 14, margin: 0 }}>
                Templates provide an initial structure you can edit anytime in the Intent dock.
              </p>
            </div>

            <div style={{ display: 'grid', gap: 10, marginTop: 4 }}>
              {TEMPLATES.map(t => (
                <div
                  key={t.id}
                  onClick={() => {
                    setSelectedTemplateId(t.id)
                    sfxPick()
                  }}
                  style={{
                    padding: '14px 16px',
                    borderRadius: 'var(--radius-lg)',
                    border: selectedTemplateId === t.id ? '2px solid var(--ai)' : '1px solid var(--border)',
                    background: selectedTemplateId === t.id ? 'var(--dock)' : 'var(--paper)',
                    cursor: 'pointer',
                    boxShadow: 'var(--shadow-paper)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong style={{ fontSize: 15, color: 'var(--ink)' }}>{t.name}</strong>
                    {selectedTemplateId === t.id && (
                      <span style={{ fontSize: 12, color: 'var(--ai)', fontWeight: 700 }}>Selected ✓</span>
                    )}
                  </div>
                  <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 4 }}>{t.description}</div>
                  <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 8 }}>
                    {t.defaultOutline.map(n => (
                      <span
                        key={n.id}
                        className="kbd"
                        style={{ fontSize: 11, background: 'var(--border)', color: 'var(--ink)' }}
                      >
                        {n.title}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 5: Document Language & Writing Theme */}
        {currentStep === 5 && (
          <div key="step-5" className="fade" style={{ width: '100%', display: 'grid', gap: 20 }}>
            <div style={{ textAlign: 'center' }}>
              <span className="kind-label" style={{ color: 'var(--ai)' }}>Step 6 of 7</span>
              <h1 style={{ fontFamily: '"Source Serif 4", serif', fontSize: 30, margin: '8px 0', fontWeight: 700 }}>
                Language & Writing Theme
              </h1>
              <p style={{ color: 'var(--muted)', fontSize: 14, margin: 0 }}>
                Configures the regional spelling rules and stylistic voice for AI completions.
              </p>
            </div>

            {/* Language Selector */}
            <div style={{ background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '14px 16px' }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', display: 'block', marginBottom: 6 }}>
                Primary Document Language
              </label>
              <select
                value={docLanguage}
                onChange={e => setDocLanguage(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', fontSize: 14, borderRadius: 4, border: '1px solid var(--border)', background: 'var(--dock)', color: 'var(--ink)' }}
              >
                {SUPPORTED_LANGUAGES.map(l => (
                  <option key={l.code} value={l.code}>{l.label}</option>
                ))}
              </select>
            </div>

            {/* Writing Theme Cards */}
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', display: 'block', marginBottom: 8 }}>
                Writing Theme Register
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 10 }}>
                {Object.values(THEME_DEFINITIONS).map(th => (
                  <div
                    key={th.id}
                    onClick={() => { setWritingTheme(th.id); sfxPick() }}
                    style={{
                      padding: '12px 14px',
                      borderRadius: 'var(--radius)',
                      border: writingTheme === th.id ? '2px solid var(--ai)' : '1px solid var(--border)',
                      background: writingTheme === th.id ? 'var(--dock)' : 'var(--paper)',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ fontSize: 14, color: 'var(--ink)' }}>{th.name}</strong>
                      {writingTheme === th.id && <span style={{ fontSize: 11, color: 'var(--ai)', fontWeight: 700 }}>Active ✓</span>}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3 }}>{th.tagline}</div>
                    <div style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 6, fontStyle: 'italic' }}>
                      “{th.sampleTone}”
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Auto-apply Grammar Fixes */}
            <div
              onClick={() => { setAutoApplyGrammar(v => !v); sfxPick() }}
              role="switch"
              aria-checked={autoApplyGrammar}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 14, cursor: 'pointer',
                padding: '14px 16px', borderRadius: 'var(--radius)',
                border: autoApplyGrammar ? '2px solid var(--grammar, #C0281F)' : '1px solid var(--border)',
                background: autoApplyGrammar ? 'var(--dock)' : 'var(--paper)',
              }}
            >
              <div
                style={{
                  flex: 'none', width: 40, height: 22, borderRadius: 99, marginTop: 1,
                  background: autoApplyGrammar ? 'var(--grammar, #C0281F)' : 'var(--border)',
                  position: 'relative', transition: 'background .18s ease',
                }}
              >
                <span
                  style={{
                    position: 'absolute', top: 2, left: autoApplyGrammar ? 20 : 2,
                    width: 18, height: 18, borderRadius: '50%', background: '#fff',
                    transition: 'left .18s ease', boxShadow: '0 1px 2px rgba(0,0,0,.2)',
                  }}
                />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <strong style={{ fontSize: 13.5, color: 'var(--ink)' }}>Automatically apply grammar fixes</strong>
                  <span className="kind-label" style={{ color: 'var(--grammar, #C0281F)' }}>Grammar</span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4, lineHeight: 1.5 }}>
                  In editing mode, spelling and grammar corrections apply as you write — corrected text
                  pops green, then fades into normal text so the change is never silent.
                </div>
              </div>
            </div>
          </div>
        )}
        {/* Step 6: Merged Long Scrollable Settings Overview */}
        {currentStep === 6 && (
          <div key="step-6" className="fade" style={{ width: '100%', minHeight: '100%', display: 'flex', flexDirection: 'column', gap: 0, overflow: 'hidden' }}>
            {/* Scrollable settings content */}
            <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 100, display: 'grid', gap: 18 }}>
              <div style={{ textAlign: 'center', paddingTop: 8 }}>
                <span className="kind-label" style={{ color: 'var(--ai)' }}>Step 7 of 7 · Writing Settings Overview</span>
                <h1 style={{ fontFamily: '"Source Serif 4", serif', fontSize: 30, margin: '8px 0', fontWeight: 700 }}>
                  Configure Your Workspace
                </h1>
                <p style={{ color: 'var(--muted)', fontSize: 14, margin: 0 }}>
                  Colors, AI engine, typography — everything shown below applies to your document.
                </p>
              </div>

              {/* Colors & Persona Palette */}
              <div style={{ background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '18px 20px', display: 'grid', gap: 12, boxShadow: 'var(--shadow-paper)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--ai)' }} />
                  <strong style={{ fontSize: 13, color: 'var(--ink)' }}>Colors & Persona Palette</strong>
                  <span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 'auto' }}>Annotation colors</span>
                </div>
                <div style={{ display: 'grid', gap: 8 }}>
                  {Object.entries(COLOR_PRESETS).filter(([key]) => !['default', 'ocean', 'forest'].includes(key)).map(([key, p]) => (
                    <div
                      key={key}
                      onClick={() => { setColorPresetKey(key); sfxPick() }}
                      style={{
                        padding: '10px 14px',
                        borderRadius: 'var(--radius)',
                        border: colorPresetKey === key ? '2px solid var(--ai)' : '1px solid var(--border)',
                        background: colorPresetKey === key ? 'var(--dock)' : 'var(--paper)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div>
                        <strong style={{ fontSize: 13, color: 'var(--ink)' }}>{p.label} Palette</strong>
                        <div style={{ display: 'flex', gap: 10, marginTop: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10.5, color: 'var(--muted)' }}>
                            <span style={{ width: 9, height: 9, borderRadius: '50%', background: p.grammar }} /> Grammar
                          </span>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10.5, color: 'var(--muted)' }}>
                            <span style={{ width: 9, height: 9, borderRadius: '50%', background: p.ai }} /> Reader
                          </span>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10.5, color: 'var(--muted)' }}>
                            <span style={{ width: 9, height: 9, borderRadius: '50%', background: p.wordChoice }} /> Supervisor
                          </span>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10.5, color: 'var(--muted)' }}>
                            <span style={{ width: 9, height: 9, borderRadius: '50%', background: p.sources }} /> Researcher
                          </span>
                        </div>
                      </div>
                      {colorPresetKey === key && <span style={{ fontSize: 11.5, color: 'var(--ai)', fontWeight: 700 }}>Selected ✓</span>}
                    </div>
                  ))}
                </div>
              </div>

              {/* Meta AI Inference Engine */}
              <div style={{ background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '18px 20px', display: 'grid', gap: 12, boxShadow: 'var(--shadow-paper)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--blue)' }} />
                  <strong style={{ fontSize: 13, color: 'var(--ink)' }}>Meta AI Inference Engine</strong>
                  <span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 'auto' }}>Model & parameters</span>
                </div>
                <div style={{ display: 'grid', gap: 10 }}>
                  <div>
                    <label style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink)', display: 'block', marginBottom: 4 }}>
                      Approved Meta Model
                    </label>
                    <select
                      value={metaModel}
                      onChange={e => setMetaModel(e.target.value)}
                      style={{ width: '100%', padding: '8px 12px', fontSize: 13, borderRadius: 4, border: '1px solid var(--border)', background: 'var(--dock)', color: 'var(--ink)' }}
                    >
                      {APPROVED_META_MODELS.map(m => (
                        <option key={m.id} value={m.id}>{m.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 3 }}>
                      <label style={{ fontWeight: 600, color: 'var(--ink)' }}>Temperature</label>
                      <span className="kbd" style={{ fontSize: 11 }}>{temperature.toFixed(2)}</span>
                    </div>
                    <input
                      type="range"
                      min="0.0"
                      max="1.0"
                      step="0.05"
                      value={temperature}
                      onChange={e => setTemperature(parseFloat(e.target.value))}
                      style={{ width: '100%', accentColor: 'var(--ai)' }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, color: 'var(--muted)' }}>
                      <span>0.0 Deterministic</span>
                      <span>1.0 Creative</span>
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink)', display: 'block', marginBottom: 4 }}>
                      Reasoning Effort
                    </label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {(['minimal', 'low', 'medium'] as const).map(effort => (
                        <button
                          key={effort}
                          type="button"
                          onClick={() => setReasoningEffort(effort)}
                          style={{
                            flex: 1,
                            padding: '8px 12px',
                            borderRadius: 4,
                            border: reasoningEffort === effort ? '2px solid var(--ai)' : '1px solid var(--border)',
                            background: reasoningEffort === effort ? 'var(--dock)' : 'var(--paper)',
                            fontSize: 12,
                            fontWeight: 600,
                            textTransform: 'capitalize',
                            cursor: 'pointer',
                          }}
                        >
                          {effort}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Editor UI & Typography */}
              <div style={{ background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '18px 20px', display: 'grid', gap: 12, boxShadow: 'var(--shadow-paper)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--yellow)' }} />
                  <strong style={{ fontSize: 13, color: 'var(--ink)' }}>Editor UI & Typography</strong>
                  <span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 'auto' }}>Paper & layout</span>
                </div>
                <div style={{ display: 'grid', gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink)', display: 'block', marginBottom: 4 }}>
                      Typeface Family
                    </label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {(
                        [
                          ['serif', 'Serif (Source Serif 4)'],
                          ['sans', 'Sans (Inter)'],
                          ['mono', 'Mono (Menlo)'],
                        ] as [EditorFont, string][]
                      ).map(([fKey, label]) => (
                        <button
                          key={fKey}
                          type="button"
                          onClick={() => setEditorFont(fKey)}
                          style={{
                            flex: 1,
                            padding: '10px 12px',
                            borderRadius: 4,
                            border: editorFont === fKey ? '2px solid var(--ai)' : '1px solid var(--border)',
                            background: editorFont === fKey ? 'var(--dock)' : 'var(--paper)',
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink)', display: 'block', marginBottom: 4 }}>
                      Paper Width
                    </label>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {(
                        [
                          ['narrow', 'Narrow (60ch)'],
                          ['normal', 'Normal (72ch)'],
                          ['wide', 'Wide (92ch)'],
                          ['full', 'Full (100% Span)'],
                        ] as [PaperWidth, string][]
                      ).map(([wKey, label]) => (
                        <button
                          key={wKey}
                          type="button"
                          onClick={() => setPaperWidth(wKey)}
                          style={{
                            flex: '1 1 calc(50% - 4px)',
                            padding: '8px 12px',
                            borderRadius: 4,
                            border: paperWidth === wKey ? '2px solid var(--ai)' : '1px solid var(--border)',
                            background: paperWidth === wKey ? 'var(--dock)' : 'var(--paper)',
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Word & Character Count Toggle */}
                  <div
                    onClick={() => { setShowWordCount(v => !v); sfxPick() }}
                    role="switch"
                    aria-checked={showWordCount}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '10px 12px', borderRadius: 4, border: '1px solid var(--border)',
                      background: 'var(--dock)', cursor: 'pointer', marginTop: 4,
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink)' }}>Show Word & Character Count</div>
                      <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>Display live counter in sticky drafting bar</div>
                    </div>
                    <div
                      style={{
                        width: 38, height: 20, borderRadius: 99,
                        background: showWordCount ? 'var(--ai)' : 'var(--border)',
                        position: 'relative', transition: 'background .18s ease', flexShrink: 0,
                      }}
                    >
                      <span
                        style={{
                          position: 'absolute', top: 2, left: showWordCount ? 20 : 2,
                          width: 16, height: 16, borderRadius: '50%', background: '#fff',
                          transition: 'left .18s ease', boxShadow: '0 1px 2px rgba(0,0,0,.2)',
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Accessibility & Sound Effects (SFX) */}
              <div style={{ background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '18px 20px', display: 'grid', gap: 12, boxShadow: 'var(--shadow-paper)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--lt)' }} />
                  <strong style={{ fontSize: 13, color: 'var(--ink)' }}>Accessibility & Sound Effects</strong>
                  <span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 'auto' }}>Audio cues</span>
                </div>
                <div style={{ display: 'grid', gap: 12 }}>
                  {/* SFX Toggle */}
                  <div
                    onClick={() => {
                      const next = !sfxActive
                      setSfxActive(next)
                      setSfxEnabled(next)
                      if (next) blip('toggle')
                    }}
                    role="switch"
                    aria-checked={sfxActive}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '10px 12px', borderRadius: 4, border: '1px solid var(--border)',
                      background: 'var(--dock)', cursor: 'pointer',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink)' }}>SFX Sound Effects</div>
                      <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>Interactive audio feedback on clicks, suggestions & review resolutions</div>
                    </div>
                    <div
                      style={{
                        width: 38, height: 20, borderRadius: 99,
                        background: sfxActive ? 'var(--ai)' : 'var(--border)',
                        position: 'relative', transition: 'background .18s ease', flexShrink: 0,
                      }}
                    >
                      <span
                        style={{
                          position: 'absolute', top: 2, left: sfxActive ? 20 : 2,
                          width: 16, height: 16, borderRadius: '50%', background: '#fff',
                          transition: 'left .18s ease', boxShadow: '0 1px 2px rgba(0,0,0,.2)',
                        }}
                      />
                    </div>
                  </div>

                  {/* Instrument & Pitch */}
                  {sfxActive && (
                    <div style={{ display: 'grid', gap: 10, padding: '10px 12px', background: 'var(--dock)', borderRadius: 4, border: '1px solid var(--border)' }}>
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)', display: 'block', marginBottom: 4 }}>
                          Audio Waveform Instrument
                        </label>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {(['triangle', 'sine', 'square', 'sawtooth'] as SfxInstrument[]).map(inst => (
                            <button
                              key={inst}
                              type="button"
                              onClick={() => {
                                setSfxInst(inst)
                                setSfxInstrument(inst)
                                blip('select')
                              }}
                              style={{
                                flex: 1,
                                padding: '6px 8px',
                                fontSize: 11.5,
                                fontWeight: 600,
                                borderRadius: 4,
                                border: sfxInst === inst ? '2px solid var(--ai)' : '1px solid var(--border)',
                                background: sfxInst === inst ? 'var(--paper)' : 'transparent',
                                cursor: 'pointer',
                                textTransform: 'capitalize',
                              }}
                            >
                              {inst}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
                          <label style={{ fontWeight: 600, color: 'var(--ink)' }}>Pitch Transposition</label>
                          <span className="kbd" style={{ fontSize: 11 }}>{sfxPitchVal >= 0 ? `+${sfxPitchVal}` : sfxPitchVal} st</span>
                        </div>
                        <input
                          type="range"
                          min="-7"
                          max="7"
                          step="1"
                          value={sfxPitchVal}
                          onChange={e => {
                            const val = parseInt(e.target.value, 10)
                            setSfxPitchVal(val)
                            setSfxPitch(val)
                            blip('select')
                          }}
                          style={{ width: '100%', accentColor: 'var(--ai)' }}
                        />
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--muted)' }}>
                          <span>-7 Semitones (Deep)</span>
                          <span>0 Normal</span>
                          <span>+7 Semitones (Crisp)</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Review Configuration Summary */}
              <div style={{ background: 'var(--dock)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px 24px', display: 'grid', gap: 14, boxShadow: 'var(--shadow-paper)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 2 }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--yellow)' }} />
                  <strong style={{ fontSize: 13, color: 'var(--ink)' }}>Review Your Configuration</strong>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
                  <div>
                    <span style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)', letterSpacing: '0.04em' }}>
                      Document Format & Purpose
                    </span>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink)', marginTop: 2 }}>
                      {effectiveDocType} — {effectivePurpose}
                    </div>
                  </div>

                  <div>
                    <span style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)', letterSpacing: '0.04em' }}>
                      Audience & Language
                    </span>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink)', marginTop: 2 }}>
                      {effectiveAudience} ({docLanguage})
                    </div>
                  </div>

                  <div>
                    <span style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)', letterSpacing: '0.04em' }}>
                      Writing Theme Register
                    </span>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink)', marginTop: 2 }}>
                      {THEME_DEFINITIONS[writingTheme]?.name || 'Neutral'}
                    </div>
                  </div>

                  <div>
                    <span style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)', letterSpacing: '0.04em' }}>
                      Color Palette
                    </span>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink)', marginTop: 2 }}>
                      {COLOR_PRESETS[colorPresetKey]?.label || 'Byline Classic'}
                    </div>
                  </div>

                  <div>
                    <span style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)', letterSpacing: '0.04em' }}>
                      Grammar Fixes
                    </span>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink)', marginTop: 2 }}>
                      {autoApplyGrammar ? 'Auto-apply while editing' : 'Suggest only'}
                    </div>
                  </div>

                  <div>
                    <span style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)', letterSpacing: '0.04em' }}>
                      Meta AI Model
                    </span>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink)', marginTop: 2 }}>
                      {APPROVED_META_MODELS.find(m => m.id === metaModel)?.label.split('(')[0] || metaModel}
                      <span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 6 }}>(T={temperature.toFixed(2)})</span>
                    </div>
                  </div>

                  <div>
                    <span style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)', letterSpacing: '0.04em' }}>
                      Typography & Paper Layout
                    </span>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink)', marginTop: 2 }}>
                      {editorFont} • {paperWidth} span • word count {showWordCount ? 'on' : 'off'}
                    </div>
                  </div>

                  <div>
                    <span style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)', letterSpacing: '0.04em' }}>
                      Audio Feedback
                    </span>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink)', marginTop: 2 }}>
                      {sfxActive ? `SFX on (${sfxInst}, ${sfxPitchVal >= 0 ? `+${sfxPitchVal}` : sfxPitchVal} st)` : 'Audio muted'}
                    </div>
                  </div>
                </div>

                {topic && (
                  <div style={{ borderTop: '1px solid var(--border)', paddingTop: 10, marginTop: 6 }}>
                    <span style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)', letterSpacing: '0.04em' }}>
                      Working Thesis / Topic
                    </span>
                    <div style={{ fontSize: 13.5, fontStyle: 'italic', color: 'var(--ink)', marginTop: 2 }}>
                      “{topic}”
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Final Action Buttons with prominent Back Button */}
            <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, borderTop: '1px solid var(--border)', background: 'var(--bg)', position: 'sticky', bottom: 0, zIndex: 10 }}>
              <button
                type="button"
                onClick={handleBack}
                style={{
                  padding: '10px 18px',
                  fontSize: 13,
                  fontWeight: 600,
                  borderRadius: 'var(--radius)',
                  border: '1px solid var(--border)',
                  background: 'var(--paper)',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                ← Back
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <button
                  type="button"
                  onClick={() => handleFinish(true)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--muted)',
                    cursor: 'pointer',
                    fontSize: 13,
                    textDecoration: 'underline',
                    padding: 0,
                  }}
                >
                  Skip template & start blank
                </button>

                <button
                  type="button"
                  onClick={() => handleFinish(false)}
                  className="primary"
                  style={{ padding: '12px 28px', fontSize: 15, fontWeight: 700, minHeight: 46 }}
                >
                  ✦ Enter Workspace →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Global Navigation Footer for Steps 0 to 5 */}
        {currentStep < 6 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginTop: 28 }}>
            <button
              type="button"
              disabled={currentStep === 0}
              onClick={handleBack}
              style={{
                padding: '8px 18px',
                fontSize: 13,
                fontWeight: 600,
                borderRadius: 'var(--radius)',
                border: '1px solid var(--border)',
                background: 'var(--paper)',
                cursor: currentStep === 0 ? 'default' : 'pointer',
                visibility: currentStep === 0 ? 'hidden' : 'visible',
              }}
            >
              ← Back
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="primary"
              style={{ padding: '8px 22px', fontSize: 13, fontWeight: 600 }}
            >
              Next →
            </button>
          </div>
        )}
      </main>
    </div>
  )
}
