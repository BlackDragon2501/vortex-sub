'use client'

// Vortex Sub - Editor de subtítulos SRT/VTT con previsualización sobre el video.
// Ajuste global de tiempos, renumerado y exportación limpia.
// Video y subtítulos nunca salen del navegador.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Film,
  Upload,
  Download,
  Plus,
  Trash2,
  ChevronsLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
  Wand2,
  FileText,
  Clock,
  Play,
  Pause,
  X,
  Loader2,
  ScissorsLineDashed,
} from 'lucide-react'
import {
  Cue,
  cueAt,
  downloadBlob,
  fixOverlaps,
  fmtBytes,
  fmtShort,
  newId,
  outName,
  parseSubtitles,
  scaleCues,
  secToTimecode,
  shiftCues,
  toSrt,
  toVtt,
} from '@/lib/sub'

const SUPPORT_EMAIL = 'vortexmusic.soporte.app@gmail.com'
const ACCENT = '#38bdf8'
const ACCENT2 = '#7dd3fc'

function VortexLogo({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      <rect width="48" height="48" rx="10" fill="#161616" />
      <circle cx="24" cy="24" r="17" fill="none" stroke={ACCENT} strokeWidth="3.5" />
      <path d="M24 10a14 14 0 1 1-9.9 4.1" fill="none" stroke={ACCENT2} strokeWidth="3.5" strokeLinecap="round" />
      <path d="M24 17a7 7 0 1 0 7 7" fill="none" stroke={ACCENT2} strokeWidth="3.5" strokeLinecap="round" />
      <circle cx="24" cy="24" r="3" fill={ACCENT2} />
    </svg>
  )
}

function Footer() {
  return (
    <footer className="mt-auto border-t border-[#2b2b31] bg-[#141416] px-6 py-4">
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-1 text-center">
        <p className="text-[11px] text-[#9b9ba4]">
          Vórtex Sub · Derechos Reservados © 2026 Vortex Company ·{' '}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="text-[#7dd3fc] hover:underline">
            {SUPPORT_EMAIL}
          </a>
        </p>
        <p className="text-[11px] text-[#9b9ba4]">Gratis · Sin anuncios · 100% local en tu navegador</p>
      </div>
    </footer>
  )
}

const btn =
  'inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#2b2b31] bg-[#1e1e22] px-3 py-2 text-xs font-medium text-[#ececf1] hover:bg-[#26262b] disabled:opacity-40 disabled:cursor-not-allowed transition-colors'

const btnAccent =
  'inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-[#0f0f10] transition-colors disabled:opacity-40 disabled:cursor-not-allowed'

export default function SubApp() {
  const [video, setVideo] = useState<{ file: File; url: string } | null>(null)
  const [cues, setCues] = useState<Cue[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [current, setCurrent] = useState(0)
  const [duration, setDuration] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [fileName, setFileName] = useState<string>('subtitulos')
  const [dragOver, setDragOver] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => () => { if (video) URL.revokeObjectURL(video.url) }, [video])

  const activeCue = useMemo(() => cueAt(cues, current), [cues, current])

  // auto-scroll a la lista
  useEffect(() => {
    if (activeCue && listRef.current) {
      const el = listRef.current.querySelector(`[data-cue="${activeCue.id}"]`)
      el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }
  }, [activeCue])

  const onVideo = useCallback((files: FileList | null) => {
    const f = files?.[0]
    if (!f) return
    if (!/^video\//.test(f.type) && !/\.(mp4|webm|mov|m4v|mkv)$/i.test(f.name)) {
      setMsg('El archivo no parece un video.')
      return
    }
    setVideo((prev) => {
      if (prev) URL.revokeObjectURL(prev.url)
      return { file: f, url: URL.createObjectURL(f) }
    })
    setMsg(null)
  }, [])

  const onSubs = useCallback((files: FileList | null) => {
    const f = files?.[0]
    if (!f) return
    const reader = new FileReader()
    reader.onload = () => {
      const parsed = parseSubtitles(String(reader.result ?? ''))
      if (!parsed.length) {
        setMsg('No se encontraron subtítulos válidos en el archivo.')
        return
      }
      setCues(parsed)
      setFileName(f.name.replace(/\.[^.]+$/, '') || 'subtitulos')
      setSelected(parsed[0]?.id ?? null)
      setMsg(`Cargados ${parsed.length} subtítulos de ${f.name} (${fmtBytes(f.size)}).`)
    }
    reader.readAsText(f)
  }, [])

  const updateCue = (id: string, patch: Partial<Cue>) => {
    setCues((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)))
  }

  const addCueAtCurrent = () => {
    const t = current
    const c: Cue = { id: newId(), start: t, end: t + 2.5, text: 'Nuevo subtítulo' }
    setCues((prev) => [...prev, c].sort((a, b) => a.start - b.start))
    setSelected(c.id)
  }

  const deleteCue = (id: string) => {
    setCues((prev) => prev.filter((c) => c.id !== id))
    if (selected === id) setSelected(null)
  }

  const shift = (delta: number) => setCues((prev) => shiftCues(prev, delta))
  const scale = (factor: number) => setCues((prev) => scaleCues(prev, factor))

  const seekTo = (t: number) => {
    if (videoRef.current) videoRef.current.currentTime = Math.max(0, t - 0.15)
    setCurrent(Math.max(0, t - 0.15))
  }

  const useTimeAsStart = (id: string) => updateCue(id, { start: current })
  const useTimeAsEnd = (id: string) => updateCue(id, { end: current })

  const togglePlay = () => {
    const v = videoRef.current
    if (!v) return
    if (v.paused) void v.play()
    else v.pause()
  }

  const save = (vtt: boolean) => {
    const fixed = fixOverlaps(cues)
    const content = vtt ? toVtt(fixed) : toSrt(fixed)
    downloadBlob(new Blob([content], { type: 'text/plain;charset=utf-8' }), outName(fileName, vtt ? 'vtt' : 'srt'))
    setMsg(`Guardado ${outName(fileName, vtt ? 'vtt' : 'srt')} con ${fixed.length} subtítulos.`)
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files
    const vid = Array.from(f).find((x) => /^video\//.test(x.type) || /\.(mp4|webm|mov|m4v|mkv)$/i.test(x.name))
    const sub = Array.from(f).find((x) => /\.(srt|vtt)$/i.test(x.name))
    if (vid) {
      const dt = new DataTransfer()
      dt.items.add(vid)
      onVideo(dt.files)
    }
    if (sub) {
      const dt = new DataTransfer()
      dt.items.add(sub)
      onSubs(dt.files)
    }
    if (!vid && !sub) setMsg('Arrastra un video y/o un archivo .srt / .vtt.')
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-[#2b2b31] bg-[#141416] px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center gap-3">
          <VortexLogo className="w-9 h-9" />
          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold tracking-tight">
              Vórtex Sub <span className="font-normal text-[#9b9ba4]">· Editor de subtítulos, sin límites</span>
            </h1>
            <p className="text-[11px] text-[#9b9ba4]">
              SRT y VTT con previsualización sobre el video · todo se procesa en tu equipo
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        {!video && !cues.length ? (
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            className={`flex min-h-[420px] cursor-pointer flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed px-6 text-center transition-colors ${
              dragOver ? 'border-[#38bdf8] bg-[#171d22]' : 'border-[#2b2b31] bg-[#17171a]'
            }`}
            onClick={() => document.getElementById('sub-video-input')?.click()}
          >
            <Film className="h-12 w-12 text-[#38bdf8]" />
            <div>
              <p className="text-base font-semibold">Arrastra tu video y tu archivo .srt / .vtt</p>
              <p className="mt-1 text-sm text-[#9b9ba4]">
                o haz clic para elegirlos · también puedes crear subtítulos desde cero
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              <button className={btn} onClick={(e) => { e.stopPropagation(); document.getElementById('sub-video-input')?.click() }}>
                <Upload className="h-3.5 w-3.5" /> Video
              </button>
              <button className={btn} onClick={(e) => { e.stopPropagation(); document.getElementById('sub-sub-input')?.click() }}>
                <FileText className="h-3.5 w-3.5" /> Subtítulos
              </button>
              <button
                className={btn}
                onClick={(e) => { e.stopPropagation(); setCues([{ id: newId(), start: 0.5, end: 3.5, text: 'Primer subtítulo' }]); setFileName('subtitulos') }}
              >
                <Plus className="h-3.5 w-3.5" /> Empezar de cero
              </button>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-[1fr_420px]">
            {/* Columna video */}
            <section className="flex flex-col gap-3">
              <div className="overflow-hidden rounded-2xl border border-[#2b2b31] bg-[#17171a]">
                <div className="relative bg-black">
                  {video ? (
                    <video
                      ref={videoRef}
                      src={video.url}
                      className="aspect-video w-full"
                      onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 0)}
                      onTimeUpdate={(e) => setCurrent(e.currentTarget.currentTime)}
                      onPlay={() => setPlaying(true)}
                      onPause={() => setPlaying(false)}
                      onClick={togglePlay}
                      controls={false}
                    />
                  ) : (
                    <div className="flex aspect-video w-full items-center justify-center text-sm text-[#9b9ba4]">
                      Carga un video para previsualizar
                    </div>
                  )}
                  {activeCue && (
                    <div className="pointer-events-none absolute bottom-14 left-1/2 w-[90%] -translate-x-1/2 text-center">
                      <span className="inline-block rounded bg-black/70 px-3 py-1.5 text-sm font-medium text-white whitespace-pre-line">
                        {activeCue.text}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-3 px-4 py-3">
                  <button className={btn} onClick={togglePlay} disabled={!video}>
                    {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    {playing ? 'Pausa' : 'Play'}
                  </button>
                  <input
                    type="range"
                    min={0}
                    max={duration || 0}
                    step={0.05}
                    value={current}
                    onChange={(e) => {
                      const t = parseFloat(e.target.value)
                      if (videoRef.current) videoRef.current.currentTime = t
                      setCurrent(t)
                    }}
                    className="h-1.5 flex-1"
                  />
                  <span className="font-mono text-xs text-[#9b9ba4]">
                    {fmtShort(current)} / {fmtShort(duration)}
                  </span>
                  {video && (
                    <button
                      className={`${btn} px-2`}
                      title="Quitar video"
                      onClick={() => {
                        URL.revokeObjectURL(video.url)
                        setVideo(null)
                        setDuration(0)
                        setCurrent(0)
                      }}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Acciones globales */}
              <div className="rounded-2xl border border-[#2b2b31] bg-[#17171a] p-4">
                <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[#9b9ba4]">
                  <Clock className="h-3.5 w-3.5" /> Ajuste global de tiempos
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <button className={btn} onClick={() => shift(-1)} title="Adelantar 1 s"><ChevronsLeft className="h-3.5 w-3.5" /> -1 s</button>
                  <button className={btn} onClick={() => shift(-0.5)}><ChevronsLeft className="h-3.5 w-3.5" /> -0.5 s</button>
                  <button className={btn} onClick={() => shift(-0.2)}><ChevronLeft className="h-3.5 w-3.5" /> -0.2 s</button>
                  <button className={btn} onClick={() => shift(0.2)}><ChevronRight className="h-3.5 w-3.5" /> +0.2 s</button>
                  <button className={btn} onClick={() => shift(0.5)}><ChevronsRight className="h-3.5 w-3.5" /> +0.5 s</button>
                  <button className={btn} onClick={() => shift(1)}><ChevronsRight className="h-3.5 w-3.5" /> +1 s</button>
                  <span className="mx-1 h-5 w-px bg-[#2b2b31]" />
                  <button className={btn} onClick={() => scale(25 / 23.976)} title="De 23.976 a 25 fps">23.976→25</button>
                  <button className={btn} onClick={() => scale(23.976 / 25)} title="De 25 a 23.976 fps">25→23.976</button>
                  <button className={btn} onClick={() => setCues((prev) => fixOverlaps(prev))}>
                    <Wand2 className="h-3.5 w-3.5" /> Corregir solapados
                  </button>
                </div>
              </div>
            </section>

            {/* Columna lista de cues */}
            <section className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-[#2b2b31] bg-[#17171a] p-3">
                <button className={btn} onClick={() => document.getElementById('sub-sub-input')?.click()}>
                  <FileText className="h-3.5 w-3.5" /> Cargar .srt/.vtt
                </button>
                <button className={`${btnAccent} bg-[#38bdf8] hover:bg-[#7dd3fc]`} onClick={addCueAtCurrent}>
                  <Plus className="h-3.5 w-3.5" /> Añadir aquí
                </button>
                <span className="flex-1" />
                <button className={btn} onClick={() => save(false)} disabled={!cues.length}>
                  <Download className="h-3.5 w-3.5" /> SRT
                </button>
                <button className={`${btnAccent} bg-[#7dd3fc] hover:bg-[#bae6fd]`} onClick={() => save(true)} disabled={!cues.length}>
                  <Download className="h-3.5 w-3.5" /> VTT
                </button>
              </div>

              <div ref={listRef} className="max-h-[560px] space-y-2 overflow-y-auto pr-1">
                {cues.length === 0 && (
                  <div className="rounded-xl border border-dashed border-[#2b2b31] p-8 text-center text-sm text-[#9b9ba4]">
                    Sin subtítulos todavía. Carga un archivo o pulsa «Añadir aquí».
                  </div>
                )}
                {cues
                  .slice()
                  .sort((a, b) => a.start - b.start)
                  .map((c, i) => {
                    const isActive = activeCue?.id === c.id
                    const isSel = selected === c.id
                    return (
                      <div
                        key={c.id}
                        data-cue={c.id}
                        onClick={() => { setSelected(c.id); seekTo(c.start) }}
                        className={`cursor-pointer rounded-xl border p-3 transition-colors ${
                          isActive
                            ? 'border-[#38bdf8] bg-[#15212b]'
                            : isSel
                              ? 'border-[#2b6b8f] bg-[#181f26]'
                              : 'border-[#2b2b31] bg-[#17171a] hover:bg-[#1c1c21]'
                        }`}
                      >
                        <div className="mb-2 flex items-center gap-2 text-[11px]">
                          <span className="rounded bg-[#1e1e22] px-1.5 py-0.5 font-mono text-[#9b9ba4]">#{i + 1}</span>
                          <span className="font-mono text-[#7dd3fc]">{secToTimecode(c.start)}</span>
                          <span className="text-[#9b9ba4]">→</span>
                          <span className="font-mono text-[#7dd3fc]">{secToTimecode(c.end)}</span>
                          <span className="text-[#9b9ba4]">({(c.end - c.start).toFixed(1)} s)</span>
                          <span className="flex-1" />
                          {isSel && (
                            <>
                              <button
                                className="rounded bg-[#1e1e22] px-1.5 py-0.5 text-[10px] text-[#ececf1] hover:bg-[#26262b]"
                                title="Usar tiempo actual como inicio"
                                onClick={(e) => { e.stopPropagation(); useTimeAsStart(c.id) }}
                              >
                                <ScissorsLineDashed className="mr-1 inline h-3 w-3" /> inicio
                              </button>
                              <button
                                className="rounded bg-[#1e1e22] px-1.5 py-0.5 text-[10px] text-[#ececf1] hover:bg-[#26262b]"
                                title="Usar tiempo actual como fin"
                                onClick={(e) => { e.stopPropagation(); useTimeAsEnd(c.id) }}
                              >
                                <ScissorsLineDashed className="mr-1 inline h-3 w-3" /> fin
                              </button>
                              <button
                                className="rounded bg-[#2b1516] px-1.5 py-0.5 text-[10px] text-[#f87171] hover:bg-[#3a1a1c]"
                                title="Eliminar subtítulo"
                                onClick={(e) => { e.stopPropagation(); deleteCue(c.id) }}
                              >
                                <Trash2 className="inline h-3 w-3" />
                              </button>
                            </>
                          )}
                        </div>
                        {isSel ? (
                          <textarea
                            autoFocus
                            value={c.text}
                            onChange={(e) => updateCue(c.id, { text: e.target.value })}
                            rows={2}
                            className="w-full resize-y rounded-lg border border-[#2b2b31] bg-[#0f0f10] px-2 py-1.5 text-sm text-[#ececf1] outline-none focus:border-[#38bdf8]"
                            onClick={(e) => e.stopPropagation()}
                          />
                        ) : (
                          <p className="whitespace-pre-line text-sm text-[#ececf1]">{c.text}</p>
                        )}
                      </div>
                    )
                  })}
              </div>
            </section>
          </div>
        )}

        {msg && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-[#2b6b8f] bg-[#15212b] px-4 py-2.5 text-sm text-[#7dd3fc]">
            <Loader2 className="h-3.5 w-3.5 shrink-0 opacity-70" />
            {msg}
            <button className="ml-auto text-[#9b9ba4] hover:text-[#ececf1]" onClick={() => setMsg(null)}>
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        <input id="sub-video-input" type="file" accept="video/*,.mkv" hidden onChange={(e) => onVideo(e.target.files)} />
        <input id="sub-sub-input" type="file" accept=".srt,.vtt,text/plain" hidden onChange={(e) => onSubs(e.target.files)} />
      </main>

      <Footer />
    </div>
  )
}
