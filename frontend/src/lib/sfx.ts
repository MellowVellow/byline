/**
 * UI sound design (Tone.js, lazy-loaded, on unless muted, throttled).
 * - Activation / deactivation: synthesized MembraneSynth body plus a
 *   short melodic gesture — rising perfect fifth on, falling fifth off — so
 *   state changes are legible by ear alone.
 * - Melodic cues (accept/done/error/mode) keep the pentatonic blip family.
 * Master chain: Gain -> Compressor -> Destination (glue, no clipping).
 */
let tone: any = null
let synth: any = null
let membrane: any = null
let lastPlay = 0

export function sfxEnabled(): boolean { return localStorage.getItem('byline.sfx') !== '0' }
export function setSfxEnabled(on: boolean) { localStorage.setItem('byline.sfx', on ? '1' : '0'); if (!on && synth) { try { synth.releaseAll?.() } catch { /* noop */ } } }

async function ensure() {
  if (synth) return synth
  tone = await import('tone')
  await tone.start()
  const comp = new tone.Compressor(-18, 3).toDestination()
  const master = new tone.Gain(0.9).connect(comp)
  const space = new tone.FeedbackDelay(0.16, 0.22); space.wet.value = 0.07; space.connect(master)
  const filter = new tone.Filter(1400, 'lowpass').connect(space)
  synth = new tone.PolySynth(tone.Synth, { oscillator: { type: 'triangle' }, envelope: { attack: 0.005, decay: 0.22, sustain: 0, release: 0.35 } }).connect(filter)
  synth.volume.value = -26
  membrane = new tone.MembraneSynth({ pitchDecay: 0.009, octaves: 5, oscillator: { type: 'sine' }, envelope: { attack: 0.001, decay: 0.16, sustain: 0.01, release: 0.3 } }).connect(filter)
  membrane.volume.value = -18
  return synth
}

function notes(list: string[], step = 0.05, dur = '32n') {
  if (!sfxEnabled()) return
  ensure().then(s => list.forEach((n, i) => s.triggerAttackRelease(n, dur, tone.now() + i * step))).catch(() => { /* audio unavailable: silent */ })
}

/** Activation: membrane body + rising fifth (C4 -> G4). Deactivation mirrors it down. */
function playActivate() {
  ensure().then(() => {
    try { membrane?.triggerAttackRelease('C2', '32n') } catch { /* noop */ }
    if (synth) ['C4', 'G4'].forEach((n, i) => synth.triggerAttackRelease(n, '16n', tone.now() + i * 0.055))
  }).catch(() => { /* silent */ })
}
function playDeactivate() {
  ensure().then(() => {
    try { membrane?.triggerAttackRelease('G1', '32n') } catch { /* noop */ }
    if (synth) ['G3', 'C3'].forEach((n, i) => synth.triggerAttackRelease(n, '16n', tone.now() + i * 0.055))
  }).catch(() => { /* silent */ })
}
export function sfxActivate() { if (sfxEnabled()) playActivate() }
export function sfxDeactivate() { if (sfxEnabled()) playDeactivate() }

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

/** Named melodic helpers (wizard + global). Scale-step blips on C pentatonic. */
const SCALE = ['C3', 'D3', 'E3', 'G3', 'A3', 'C4', 'D4', 'E4', 'G4', 'A4', 'C5']
export function sfxMuted(): boolean { return !sfxEnabled() }
export function sfxToggle(): boolean {
  const next = !sfxEnabled()
  if (next) { setSfxEnabled(true); playActivate() } else { playDeactivate(); setSfxEnabled(false) }
  return !next
}
export function sfxStep(n = 0) { notes([SCALE[Math.max(0, Math.min(SCALE.length - 1, n))]], 0.06) }
export function sfxBack() { notes(['E4', 'C4'], 0.06) }
export function sfxPick() { notes(['G3', 'C4'], 0.06) }
export function sfxSuccess() { notes(['C4', 'E4', 'G4', 'C5'], 0.06) }
