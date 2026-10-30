/**
 * UI sound design (Tone.js, lazy-loaded, muted by default, throttled).
 * - Activation / deactivation: synthesized MembraneSynth body plus a
 *   short melodic gesture — rising perfect fifth on, falling fifth off.
 * - Melodic cues (accept/done/error/mode) keep the pentatonic blip family.
 * - Supports custom pitch/tone transposition and synthesizer instruments.
 */
let tone: any = null
let synth: any = null
let membrane: any = null
let lastPlay = 0

export type SfxInstrument = 'triangle' | 'sine' | 'square' | 'sawtooth'

export function sfxEnabled(): boolean {
  return localStorage.getItem('byline.sfx') === '1'
}

export function setSfxEnabled(on: boolean) {
  localStorage.setItem('byline.sfx', on ? '1' : '0')
  if (!on && synth) {
    try {
      synth.releaseAll?.()
    } catch { /* noop */ }
  }
}

export function getSfxInstrument(): SfxInstrument {
  const saved = localStorage.getItem('byline.sfx.instrument')
  if (saved === 'sine' || saved === 'square' || saved === 'sawtooth' || saved === 'triangle') {
    return saved
  }
  return 'triangle'
}

export function setSfxInstrument(inst: SfxInstrument) {
  localStorage.setItem('byline.sfx.instrument', inst)
  if (synth) {
    try {
      synth.set({ oscillator: { type: inst } })
    } catch { /* noop */ }
  }
}

export function getSfxPitch(): number {
  const p = parseInt(localStorage.getItem('byline.sfx.pitch') || '0', 10)
  return isNaN(p) ? 0 : Math.max(-7, Math.min(7, p))
}

export function setSfxPitch(semitones: number) {
  const clamped = Math.max(-7, Math.min(7, semitones))
  localStorage.setItem('byline.sfx.pitch', String(clamped))
}

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

export function transposeNote(note: string, semitones: number): string {
  if (semitones === 0) return note
  const match = note.match(/^([A-G]#?|Eb|Bb)(\d)$/)
  if (!match) return note
  let [, name, octStr] = match
  if (name === 'Eb') name = 'D#'
  if (name === 'Bb') name = 'A#'
  const idx = NOTE_NAMES.indexOf(name)
  if (idx === -1) return note
  let oct = parseInt(octStr, 10)
  let newIdx = idx + semitones
  while (newIdx < 0) {
    newIdx += 12
    oct -= 1
  }
  while (newIdx >= 12) {
    newIdx -= 12
    oct += 1
  }
  return `${NOTE_NAMES[newIdx]}${oct}`
}

async function ensure() {
  if (synth) return synth
  tone = await import('tone')
  await tone.start()
  const comp = new tone.Compressor(-18, 3).toDestination()
  const master = new tone.Gain(0.9).connect(comp)
  const space = new tone.FeedbackDelay(0.16, 0.22)
  space.wet.value = 0.07
  space.connect(master)
  const filter = new tone.Filter(1400, 'lowpass').connect(space)
  const inst = getSfxInstrument()
  synth = new tone.PolySynth(tone.Synth, {
    oscillator: { type: inst },
    envelope: { attack: 0.005, decay: 0.22, sustain: 0, release: 0.35 },
  }).connect(filter)
  synth.volume.value = -26
  membrane = new tone.MembraneSynth({
    pitchDecay: 0.009,
    octaves: 5,
    oscillator: { type: 'sine' },
    envelope: { attack: 0.001, decay: 0.16, sustain: 0.01, release: 0.3 },
  }).connect(filter)
  membrane.volume.value = -18
  return synth
}

function notes(list: string[], step = 0.05, dur = '32n') {
  if (!sfxEnabled()) return
  const pitch = getSfxPitch()
  const transposed = pitch === 0 ? list : list.map(n => transposeNote(n, pitch))
  ensure()
    .then(s => transposed.forEach((n, i) => s.triggerAttackRelease(n, dur, tone.now() + i * step)))
    .catch(() => { /* audio unavailable: silent */ })
}

/** Activation: membrane body + rising fifth (C4 -> G4). Deactivation mirrors it down. */
function playActivate() {
  ensure()
    .then(() => {
      try {
        membrane?.triggerAttackRelease('C2', '32n')
      } catch { /* noop */ }
      if (synth) {
        const pitch = getSfxPitch()
        ;['C4', 'G4'].map(n => transposeNote(n, pitch)).forEach((n, i) =>
          synth.triggerAttackRelease(n, '16n', tone.now() + i * 0.055)
        )
      }
    })
    .catch(() => { /* silent */ })
}

function playDeactivate() {
  ensure()
    .then(() => {
      try {
        membrane?.triggerAttackRelease('G1', '32n')
      } catch { /* noop */ }
      if (synth) {
        const pitch = getSfxPitch()
        ;['G3', 'C3'].map(n => transposeNote(n, pitch)).forEach((n, i) =>
          synth.triggerAttackRelease(n, '16n', tone.now() + i * 0.055)
        )
      }
    })
    .catch(() => { /* silent */ })
}

export function sfxActivate() {
  if (sfxEnabled()) playActivate()
}
export function sfxDeactivate() {
  if (sfxEnabled()) playDeactivate()
}

const NOTES: Record<string, string[]> = {
  hover: ['E4'],
  select: ['C4'],
  open: ['E4', 'G4'],
  accept: ['C4', 'E4', 'G4'],
  dismiss: ['G3', 'E3'],
  toggle: ['A3', 'C4'],
  mode: ['D4', 'F#4', 'A4'],
  done: ['G3', 'C4', 'E4'],
  error: ['E4', 'Eb4'],
}

export function blip(kind: keyof typeof NOTES) {
  if (!sfxEnabled()) return
  const now = performance.now()
  if (now - lastPlay < 45) return
  lastPlay = now
  notes(NOTES[kind] || NOTES.select, 0.055)
}

/** Named melodic helpers. Scale-step blips on C pentatonic. */
const SCALE = ['C3', 'D3', 'E3', 'G3', 'A3', 'C4', 'D4', 'E4', 'G4', 'A4', 'C5']
export function sfxMuted(): boolean {
  return !sfxEnabled()
}

export function sfxToggle(): boolean {
  const next = !sfxEnabled()
  if (next) {
    setSfxEnabled(true)
    playActivate()
  } else {
    playDeactivate()
    setSfxEnabled(false)
  }
  return !next
}

export function sfxStep(n = 0) {
  notes([SCALE[Math.max(0, Math.min(SCALE.length - 1, n))]], 0.06)
}
export function sfxBack() {
  notes(['E4', 'C4'], 0.06)
}
export function sfxPick() {
  notes(['G3', 'C4'], 0.06)
}
export function sfxSuccess() {
  notes(['C4', 'E4', 'G4', 'C5'], 0.06)
}
export function sfxAccept() {
  blip('accept')
}
export function sfxDismiss() {
  blip('dismiss')
}
