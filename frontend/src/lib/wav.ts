/** Record mic → 24kHz mono WAV. onSilence fires after speech + 1.2s silence (VAD). */
export async function recordWav(seconds = 20, onSilence?: () => void): Promise<{ stop: () => Promise<Blob> }> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
  const ctx = new AudioContext({ sampleRate: 24000 })
  const src = ctx.createMediaStreamSource(stream)
  const proc = ctx.createScriptProcessor(4096, 1, 1)
  const analyser = ctx.createAnalyser(); analyser.fftSize = 2048; src.connect(analyser)
  const chunks: Float32Array[] = []
  proc.onaudioprocess = e => chunks.push(new Float32Array(e.inputBuffer.getChannelData(0)))
  src.connect(proc); proc.connect(ctx.destination)
  let spoke = false, silentSince = 0, vadDone = false
  const vad = setInterval(() => {
    const buf = new Float32Array(analyser.fftSize); analyser.getFloatTimeDomainData(buf)
    const rms = Math.sqrt(buf.reduce((a, v) => a + v * v, 0) / buf.length)
    if (rms > 0.02) { spoke = true; silentSince = 0 } else if (spoke) { silentSince += 150; if (silentSince >= 1200 && !vadDone) { vadDone = true; onSilence?.() } }
  }, 150)
  const done = new Promise<Blob>(resolve => {
    setTimeout(() => finish(), seconds * 1000)
    ;(window as any).__wavFinish = finish
    function finish() {
      clearInterval(vad); proc.disconnect(); src.disconnect(); stream.getTracks().forEach(t => t.stop()); ctx.close()
      const total = chunks.reduce((a, c) => a + c.length, 0)
      const pcm = new Int16Array(total); let o = 0
      for (const c of chunks) { for (let i = 0; i < c.length; i++) { pcm[o++] = Math.max(-32768, Math.min(32767, Math.round(c[i] * 32767))) } }
      const buf = new ArrayBuffer(44 + pcm.length * 2); const v = new DataView(buf)
      const wstr = (off: number, s: string) => { for (let i = 0; i < s.length; i++) v.setUint8(off + i, s.charCodeAt(i)) }
      wstr(0, 'RIFF'); v.setUint32(4, 36 + pcm.length * 2, true); wstr(8, 'WAVEfmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true)
      v.setUint32(24, 24000, true); v.setUint32(28, 48000, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); wstr(36, 'data'); v.setUint32(40, pcm.length * 2, true)
      new Int16Array(buf, 44).set(pcm)
      resolve(new Blob([buf], { type: 'audio/wav' }))
    }
  })
  return { stop: () => { (window as any).__wavFinish?.(); return done } }
}
