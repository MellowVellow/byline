/** Tone.js melodic UI blips. Lazy-loaded, off until enabled, low volume, throttled. */
let tone: any = null
let synth: any = null
let lastPlay = 0
export function sfxEnabled(): boolean { return localStorage.getItem('byline.sfx') === '1' }
export function setSfxEnabled(on: boolean) { localStorage.setItem('byline.sfx', on ? '1' : '0'); if (!on && synth) { try { synth.releaseAll?.() } catch { /* noop */ } } }

async function ensure() {
  if (synth) return synth
  tone = await import('tone')
  await tone.start()
  synth = new tone.PolySynth(tone.Synth, { oscillator: { type: 'sine' }, envelope: { attack: 0.004, decay: 0.09, sustain: 0, release: 0.12 } }).toDestination()
  synth.volume.value = -20
  return synth
}

const NOTES: Record<string, string[]> = {
  hover: ['E6'],
  select: ['C6'],
  open: ['E6', 'G6'],
  accept: ['C6', 'E6', 'G6'],
  dismiss: ['G5', 'E5'],
  toggle: ['A5', 'C6'],
  mode: ['D6', 'F#6', 'A6'],
  done: ['G5', 'C6', 'E6'],
  error: ['E5', 'Eb5'],
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
const SCALE = ['C5', 'D5', 'E5', 'G5', 'A5', 'C6', 'D6', 'E6', 'G6', 'A6', 'C7']
function playNotes(notes: string[]) {
  if (!sfxEnabled()) return
  ensure().then(s => notes.forEach((n, i) => s.triggerAttackRelease(n, '32n', tone.now() + i * 0.06))).catch(() => {})
}
export function sfxMuted(): boolean { return !sfxEnabled() }
export function sfxToggle(): boolean { const next = !sfxEnabled(); setSfxEnabled(next); return !next }
export function sfxStep(n = 0) { playNotes([SCALE[Math.max(0, Math.min(SCALE.length - 1, n))]]) }
export function sfxBack() { playNotes(['E6', 'C6']) }
export function sfxPick() { playNotes(['G5', 'C6']) }
export function sfxSuccess() { playNotes(['C6', 'E6', 'G6', 'C7']) }
