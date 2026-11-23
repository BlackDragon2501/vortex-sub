// Vortex Sub - Utilidades de subtítulos SRT/VTT.
// Parseo, serialización, ajuste global de tiempos y validaciones.
// 100% local en el navegador, sin backend.

export interface Cue {
  id: string
  start: number // segundos
  end: number // segundos
  text: string
}

const SRT_RE =
  /(\d+)\s*\r?\n(\d{1,2}):(\d{2}):(\d{2})[,.](\d{1,3})\s*-->\s*(\d{1,2}):(\d{2}):(\d{2})[,.](\d{1,3})([\s\S]*?)(?=\r?\n\r?\n|\r?\n\d+\s*\r?\n\d{1,2}:|$)/g

/** "hh:mm:ss,ms" / "hh:mm:ss.ms" -> segundos */
export function timecodeToSec(tc: string): number {
  const m = tc.trim().match(/^(?:(\d{1,2}):)?(\d{1,2}):(\d{2})[.,](\d{1,3})$/)
  if (!m) {
    // también acepta segundos sueltos
    const n = parseFloat(tc.trim())
    return isNaN(n) ? 0 : n
  }
  const [, h, mi, s, ms] = m
  return (
    (h ? parseInt(h, 10) * 3600 : 0) +
    parseInt(mi, 10) * 60 +
    parseInt(s, 10) +
    parseInt(ms.padEnd(3, '0'), 10) / 1000
  )
}

/** segundos -> "hh:mm:ss,ms" (SRT) o "hh:mm:ss.ms" (VTT) */
export function secToTimecode(sec: number, vtt = false): string {
  const clamped = Math.max(0, sec)
  const h = Math.floor(clamped / 3600)
  const mi = Math.floor((clamped % 3600) / 60)
  const s = Math.floor(clamped % 60)
  const ms = Math.round((clamped - Math.floor(clamped)) * 1000)
  const sep = vtt ? '.' : ','
  const p2 = (n: number) => String(n).padStart(2, '0')
  return `${p2(h)}:${p2(mi)}:${p2(s)}${sep}${String(Math.min(ms, 999)).padStart(3, '0')}`
}

/** segundos -> "mm:ss" corto para UI */
export function fmtShort(sec: number): string {
  if (!isFinite(sec) || sec < 0) sec = 0
  const mi = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${String(mi).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function newId(): string {
  return Math.random().toString(36).slice(2, 10)
}

/** Detecta si el contenido parece WebVTT */
export function isVtt(content: string): boolean {
  return /^\uFEFF?WEBVTT/i.test(content.trim())
}

/** Parsea SRT o VTT a lista de cues */
export function parseSubtitles(content: string): Cue[] {
  const text = content.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const cues: Cue[] = []
  // VTT puede tener cabecera WEBVTT y bloques NOTE/STYLE
  const blocks = text.split(/\n{2,}/)
  for (const block of blocks) {
    const lines = block.split('\n').filter((l) => l.trim() !== '')
    if (lines.length === 0) continue
    const first = lines[0].trim()
    if (/^WEBVTT/i.test(first)) continue
    if (/^(NOTE|STYLE|REGION)\b/i.test(first)) continue
    // la línea de tiempos puede estar en la línea 0 o 1 (si hay índice o id)
    let timeIdx = -1
    for (let i = 0; i < Math.min(2, lines.length); i++) {
      if (lines[i].includes('-->')) {
        timeIdx = i
        break
      }
    }
    if (timeIdx === -1) continue
    const tm = lines[timeIdx].match(
      /(\d{1,2}:\d{2}:\d{2}[.,]\d{1,3}|\d{1,2}:\d{2}[.,]\d{1,3})\s*-->\s*(\d{1,2}:\d{2}:\d{2}[.,]\d{1,3}|\d{1,2}:\d{2}[.,]\d{1,3})/
    )
    if (!tm) continue
    const start = timecodeToSec(tm[1])
    const end = timecodeToSec(tm[2])
    const body = lines.slice(timeIdx + 1).join('\n').trim()
    if (!body) continue
    cues.push({ id: newId(), start, end, text: body })
  }
  cues.sort((a, b) => a.start - b.start)
  return cues
}

/** Serializa cues a SRT */
export function toSrt(cues: Cue[]): string {
  return (
    cues
      .map((c, i) => `${i + 1}\n${secToTimecode(c.start)} --> ${secToTimecode(c.end)}\n${c.text}`)
      .join('\n\n') + '\n'
  )
}

/** Serializa cues a VTT */
export function toVtt(cues: Cue[]): string {
  const header = 'WEBVTT\n\n'
  const body = cues
    .map((c) => `${secToTimecode(c.start, true)} --> ${secToTimecode(c.end, true)}\n${c.text}`)
    .join('\n\n')
  return header + body + '\n'
}

/** Aplica un desplazamiento en segundos a todos los cues */
export function shiftCues(cues: Cue[], delta: number): Cue[] {
  return cues.map((c) => ({
    ...c,
    start: Math.max(0, c.start + delta),
    end: Math.max(0, c.end + delta),
  }))
}

/** Escala todos los tiempos por un factor (sincronizar versiones distintas) */
export function scaleCues(cues: Cue[], factor: number): Cue[] {
  return cues.map((c) => ({ ...c, start: c.start * factor, end: c.end * factor }))
}

/** Corrige solapamientos y duraciones mínimas */
export function fixOverlaps(cues: Cue[], minDur = 0.6): Cue[] {
  const sorted = [...cues].sort((a, b) => a.start - b.start)
  for (let i = 0; i < sorted.length; i++) {
    const c = sorted[i]
    if (c.end <= c.start) c.end = c.start + minDur
    if (i > 0 && c.start < sorted[i - 1].end) {
      c.start = sorted[i - 1].end
      if (c.end <= c.start) c.end = c.start + minDur
    }
  }
  return sorted
}

/** Cue activo para un tiempo dado */
export function cueAt(cues: Cue[], t: number): Cue | null {
  return cues.find((c) => t >= c.start && t <= c.end) ?? null
}

export function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 4000)
}

/** Nombre de salida con extensión nueva */
export function outName(original: string, ext: 'srt' | 'vtt'): string {
  const base = original.replace(/\.[^.]+$/, '') || 'subtitulos'
  return `${base}.${ext}`
}
