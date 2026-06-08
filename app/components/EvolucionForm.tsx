'use client'

import { useState, useRef } from 'react'
import type { TipoDocumento } from '../page'

interface Props {
  tipo: TipoDocumento
  onVolver: () => void
}

const LABELS: Record<string, string> = {
  'evolucion-uti': 'Evolución UTI',
  'evolucion-clinica': 'Evolución Clínica Médica',
  'ingreso-uti': 'Ingreso UTI',
  'alta-uti': 'Alta UTI',
  'ingreso-clinica': 'Ingreso Clínica Médica',
  'alta-clinica': 'Alta Clínica Médica',
}

const ES_UTI = (t: TipoDocumento) =>
  t === 'evolucion-uti' || t === 'ingreso-uti' || t === 'alta-uti'

export default function EvolucionForm({ tipo, onVolver }: Props) {
  const [dictado, setDictado] = useState('')
  const [grabando, setGrabando] = useState(false)
  const [pdfLab, setPdfLab] = useState<File | null>(null)
  const [pdfImagenes, setPdfImagenes] = useState<File | null>(null)
  const [fotosExtra, setFotosExtra] = useState<File[]>([])
  const [resultado, setResultado] = useState('')
  const [cargando, setCargando] = useState(false)
  const [copiado, setCopiado] = useState(false)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  const toggleGrabacion = async () => {
    if (grabando) {
      mediaRecorderRef.current?.stop()
      setGrabando(false)
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr = new MediaRecorder(stream)
      chunksRef.current = []
      mr.ondataavailable = (e) => chunksRef.current.push(e.data)
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop())
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        await transcribirAudio(blob)
      }
      mr.start()
      mediaRecorderRef.current = mr
      setGrabando(true)
    } catch {
      alert('No se pudo acceder al micrófono')
    }
  }

  const transcribirAudio = async (blob: Blob) => {
    const fd = new FormData()
    fd.append('audio', blob, 'audio.webm')
    try {
      const res = await fetch('/api/transcribir', { method: 'POST', body: fd })
      const data = await res.json()
      if (data.texto) setDictado((prev) => prev + ' ' + data.texto)
    } catch {
      alert('Error al transcribir audio')
    }
  }

  const agregarFotos = (files: FileList | null) => {
    if (!files) return
    setFotosExtra((prev) => [...prev, ...Array.from(files)])
  }

  const generarEvolucion = async () => {
    if (!dictado.trim() && !pdfLab && !pdfImagenes && fotosExtra.length === 0) {
      alert('Agregá al menos un input: dictado, laboratorio, imágenes o fotos')
      return
    }
    setCargando(true)
    setResultado('')
    try {
      const fd = new FormData()
      fd.append('tipo', tipo || '')
      fd.append('dictado', dictado)
      if (pdfLab) fd.append('pdfLab', pdfLab)
      if (pdfImagenes) fd.append('pdfImagenes', pdfImagenes)
      fotosExtra.forEach((f, i) => fd.append(`foto_${i}`, f))

      const res = await fetch('/api/generar-evolucion', { method: 'POST', body: fd })
      const data = await res.json()
      if (data.texto) setResultado(data.texto)
      else alert('Error al generar evolución: ' + (data.error || 'desconocido'))
    } catch {
      alert('Error de conexión')
    } finally {
      setCargando(false)
    }
  }

  const copiar = async () => {
    await navigator.clipboard.writeText(resultado)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  const esUti = ES_UTI(tipo)

  return (
    <div className="space-y-4">
      <div className="card flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-brand-100 flex items-center justify-center text-xl">
          {esUti ? '🫀' : '🩺'}
        </div>
        <div>
          <h2 className="font-bold text-slate-800">{LABELS[tipo || '']}</h2>
          <p className="text-xs text-slate-400">
            {new Date().toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
      </div>

      <div className="card space-y-3">
        <h3 className="font-semibold text-slate-700">🎙️ Dictado</h3>
        <button
          onClick={toggleGrabacion}
          className={`w-full py-4 rounded-xl font-semibold text-white transition-all duration-200 active:scale-95 ${
            grabando ? 'bg-red-500 hover:bg-red-600 animate-pulse' : 'bg-brand-600 hover:bg-brand-700'
          }`}
        >
          {grabando ? '⏹ Detener grabación' : '🎙 Iniciar dictado'}
        </button>
        <textarea
          className="input-area"
          rows={4}
          placeholder="El texto transcripto aparecerá aquí. También podés escribir o editar directamente..."
          value={dictado}
          onChange={(e) => setDictado(e.target.value)}
        />
      </div>

      <div className="card space-y-3">
        <h3 className="font-semibold text-slate-700">🧪 Laboratorio (PDF AVlab)</h3>
        <label className="block w-full border-2 border-dashed border-slate-200 rounded-xl p-4 text-center cursor-pointer hover:border-brand-400 hover:bg-brand-50 transition-colors">
          <input
            type="file"
            accept=".pdf"
            className="hidden"
            onChange={(e) => setPdfLab(e.target.files?.[0] || null)}
          />
          {pdfLab ? (
            <span className="text-sm font-medium text-brand-700">✅ {pdfLab.name}</span>
          ) : (
            <span className="text-sm text-slate-400">Tocá para subir PDF de laboratorio</span>
          )}
        </label>
      </div>

      <div className="card space-y-3">
        <h3 className="font-semibold text-slate-700">🔬 Informe de imágenes (PDF Sinclair)</h3>
        <label className="block w-full border-2 border-dashed border-slate-200 rounded-xl p-4 text-center cursor-pointer hover:border-brand-400 hover:bg-brand-50 transition-colors">
          <input
            type="file"
            accept=".pdf"
            className="hidden"
            onChange={(e) => setPdfImagenes(e.target.files?.[0] || null)}
          />
          {pdfImagenes ? (
            <span className="text-sm font-medium text-brand-700">✅ {pdfImagenes.name}</span>
          ) : (
            <span className="text-sm text-slate-400">Tocá para subir PDF del informe</span>
          )}
        </label>
      </div>

      <div className="card space-y-3">
        <h3 className="font-semibold text-slate-700">
          📷 Fotos
          {esUti && <span className="ml-2 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Monitor · Respirador</span>}
        </h3>
        <p className="text-xs text-slate-400">
          {esUti ? 'Fotos del monitor, respirador o informes impresos' : 'Fotos de informes impresos'}
        </p>
        <label className="block w-full border-2 border-dashed border-slate-200 rounded-xl p-4 text-center cursor-pointer hover:border-brand-400 hover:bg-brand-50 transition-colors">
          <input
            type="file"
            accept="image/*"
            multiple
            capture="environment"
            className="hidden"
            onChange={(e) => agregarFotos(e.target.files)}
          />
          <span className="text-sm text-slate-400">
            {fotosExtra.length > 0
              ? `✅ ${fotosExtra.length} foto${fotosExtra.length > 1 ? 's' : ''} cargada${fotosExtra.length > 1 ? 's' : ''}`
              : 'Tocá para sacar foto o subir imagen'}
          </span>
        </label>
        {fotosExtra.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {fotosExtra.map((f, i) => (
              <div key={i} className="relative">
                <img
                  src={URL.createObjectURL(f)}
                  alt={`foto ${i + 1}`}
                  className="w-16 h-16 object-cover rounded-lg border border-slate-200"
                />
                <button
                  onClick={() => setFotosExtra((prev) => prev.filter((_, j) => j !== i))}
                  className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center"
                >×</button>
              </div>
            ))}
          </div>
        )}
      </div>

      <button
        onClick={generarEvolucion}
        disabled={cargando}
        className="w-full py-4 bg-brand-600 hover:bg-brand-700 disabled:bg-slate-300 text-white font-bold rounded-2xl transition-all duration-200 active:scale-95 text-base shadow-md"
      >
        {cargando ? '⏳ Generando evolución...' : '✨ Generar evolución'}
      </button>

      {resultado && (
        <div className="card space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-700">📄 Evolución generada</h3>
            <button
              onClick={copiar}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 active:scale-95 ${
                copiado ? 'bg-green-500 text-white' : 'bg-brand-600 hover:bg-brand-700 text-white'
              }`}
            >
              {copiado ? '✅ ¡Copiado!' : '📋 Copiar'}
            </button>
          </div>
          <div className="bg-slate-50 rounded-xl p-4 text-sm text-slate-800 leading-relaxed whitespace-pre-wrap border border-slate-100">
            {resultado}
          </div>
          <p className="text-xs text-slate-400 text-center">
            Copiá el texto y pegalo en el sistema de la clínica
          </p>
        </div>
      )}
    </div>
  )
}
