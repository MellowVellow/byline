/** Tone.js melodic UI blips. Lazy-loaded, on unless muted, low volume, throttled. */
let tone: any = null
let synth: any = null
let lastPlay = 0
export function sfxEnabled(): boolean { return localStorage.getItem('byline.sfx') !== '0' }
export function setSfxEnabled(on: boolean) { localStorage.setItem('byline.sfx', on ? '1' : '0'); if (!on && synth) { try { synth.releaseAll?.() } catch { /* noop */ } } }

async function ensure() {
  if (synth) return synth
  tone = await import('tone')
  await tone.start()
  const filter = new tone.Filter(1100, 'lowpass').toDestination()
  synth = new tone.PolySynth(tone.Synth, { oscillator: { type: 'triangle' }, envelope: { attack: 0.03, decay: 0.22, sustain: 0, release: 0.35 } }).connect(filter)
  synth.volume.value = -30
  return synth
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
  ensure().then(s => {
    const notes = NOTES[kind] || NOTES.select
    notes.forEach((n, i) => s.triggerAttackRelease(n, '32n', tone.now() + i * 0.055))
  }).catch(() => { /* audio unavailable: silent */ })
}

/** Named melodic helpers (wizard + global). Scale-step blips on C pentatonic. */
const SCALE = ['C3', 'D3', 'E3', 'G3', 'A3', 'C4', 'D4', 'E4', 'G4', 'A4', 'C5']
function playNotes(notes: string[]) {
  if (!sfxEnabled()) return
  ensure().then(s => notes.forEach((n, i) => s.triggerAttackRelease(n, '32n', tone.now() + i * 0.06))).catch(() => {})
}
export function sfxMuted(): boolean { return !sfxEnabled() }
export function sfxToggle(): boolean { const next = !sfxEnabled(); setSfxEnabled(next); return !next }
export function sfxStep(n = 0) { playNotes([SCALE[Math.max(0, Math.min(SCALE.length - 1, n))]]) }
export function sfxBack() { playNotes(['E4', 'C4']) }
export function sfxPick() { playNotes(['G3', 'C4']) }
export function sfxSuccess() { playNotes(['C4', 'E4', 'G4', 'C5']) }
