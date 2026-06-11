'use client'

import { useState, useRef } from 'react'
import type { TipoDocumento } from '../page'

interface Props {
  tipo: TipoDocumento
  usuario: string
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

function todayISO() {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function isoToDisplay(iso: string) {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

async function guardarEnSupabase(usuario: string, tipo: TipoDocumento, contenido: Record<string, string>) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    await fetch(`${url}/rest/v1/evoluciones`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': key!,
        'Authorization': `Bearer ${key}`,
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({ usuario, tipo, contenido }),
    })
  } catch {}
}

export default function EvolucionForm({ tipo, usuario, onVolver }: Props) {
  const [dictado, setDictado] = useState('')
  const [grabando, setGrabando] = useState(false)
  const [pdfLab, setPdfLab] = useState<File | null>(null)
  const [pdfImagenes, setPdfImagenes] = useState<File | null>(null)
  const [fotosExtra, setFotosExtra] = useState<File[]>([])
  const [resultado, setResultado] = useState<Record<string, string> | null>(null)
  const [cargando, setCargando] = useState(false)
  const [copiado, setCopiado] = useState<string | null>(null)
  const [fecha, setFecha] = useState(todayISO())

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
      else setDictado((prev) => prev + ` [Error al transcribir: ${data.error || 'desconocido'}]`)
    } catch (e: any) {
      setDictado((prev) => prev + ` [Error al transcribir: ${e.message}]`)
    }
  }

  const comprimirImagen = (file: File): Promise<File> => {
    return new Promise((resolve) => {
      const img = new Image()
      const url = URL.createObjectURL(file)
      img.onload = () => {
        const maxW = 1024
        const scale = img.width > maxW ? maxW / img.width : 1
        const canvas = document.createElement('canvas')
        canvas.width = img.width * scale
        canvas.height = img.height * scale
        const ctx = canvas.getContext('2d')
        if (!ctx) { resolve(file); return }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        canvas.toBlob((blob) => {
          if (!blob) { resolve(file); return }
          resolve(new File([blob], file.name, { type: 'image/jpeg' }))
        }, 'image/jpeg', 0.7)
        URL.revokeObjectURL(url)
      }
      img.onerror = () => resolve(file)
      img.src = url
    })
  }

  const agregarFotos = async (files: FileList | null) => {
    if (!files) return
    const compressed = await Promise.all(Array.from(files).map(comprimirImagen))
    setFotosExtra((prev) => [...prev, ...compressed])
  }

  const generarEvolucion = async () => {
    if (!dictado.trim() && !pdfLab && !pdfImagenes && fotosExtra.length === 0) {
      alert('Agregá al menos un input: dictado, laboratorio, imágenes o fotos')
      return
    }
    setCargando(true)
    setResultado(null)
    try {
      const fd = new FormData()
      fd.append('tipo', tipo || '')
      fd.append('dictado', dictado)
      fd.append('fecha', isoToDisplay(fecha))
      if (pdfLab) fd.append('pdfLab', pdfLab)
      if (pdfImagenes) fd.append('pdfImagenes', pdfImagenes)
      fotosExtra.forEach((f, i) => fd.append(`foto_${i}`, f))

      const res = await fetch('/api/generar-evolucion', { method: 'POST', body: fd })
      const data = await res.json()
      if (data.texto) {
        // Para evoluciones: resultado es texto plano
        // Para ingreso/alta: resultado es objeto con secciones
        let contenido: Record<string, string>
        if (typeof data.texto === 'string') {
          contenido = { texto: data.texto }
        } else {
          contenido = data.texto
        }
        setResultado(contenido)
        await guardarEnSupabase(usuario, tipo, contenido)
      } else {
        alert('Error al generar evolución: ' + (data.error || 'desconocido'))
      }
    } catch {
      alert('Error de conexión')
    } finally {
      setCargando(false)
    }
  }

  const copiar = async (texto: string, key: string) => {
    await navigator.clipboard.writeText(texto)
    setCopiado(key)
    setTimeout(() => setCopiado(null), 2000)
  }

  const esUti = ES_UTI(tipo)

  return (
    <div className="space-y-4">
      <div className="card flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-brand-100 flex items-center justify-center text-xl">
          {esUti ? '🔴' : '🟢'}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-bold text-slate-800">{LABELS[tipo || ''] || ''}</h2>
          <div className="flex items-center gap-2 mt-1">
            <label className="text-xs text-slate-500 font-medium whitespace-nowrap">📅 Fecha:</label>
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="text-xs text-slate-700 border border-slate-200 rounded-lg px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-teal-400"
            />
          </div>
        </div>
      </div>

      <div className="card space-y-3">
        <h3 className="font-semibold text-slate-700">🎙 Dictado</h3>
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
          <input type="file" accept=".pdf" className="hidden" onChange={(e) => setPdfLab(e.target.files?.[0] || null)} />
          {pdfLab ? (
            <span className="text-sm font-medium text-brand-700">✅ {pdfLab.name}</span>
          ) : (
            <span className="text-sm text-slate-400">Tocá para subir PDF de laboratorio</span>
          )}
        </label>
      </div>

      <div className="card space-y-3">
        <h3 className="font-semibold text-slate-700">🩻 Informe de imágenes (PDF Sinclair)</h3>
        <label className="block w-full border-2 border-dashed border-slate-200 rounded-xl p-4 text-center cursor-pointer hover:border-brand-400 hover:bg-brand-50 transition-colors">
          <input type="file" accept=".pdf" className="hidden" onChange={(e) => setPdfImagenes(e.target.files?.[0] || null)} />
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
          <input type="file" accept="image/*" multiple capture="environment" className="hidden" onChange={(e) => agregarFotos(e.target.files)} />
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
                <img src={URL.createObjectURL(f)} alt={`foto ${i + 1}`} className="w-16 h-16 object-cover rounded-lg border border-slate-200" />
                <button onClick={() => setFotosExtra((prev) => prev.filter((_, j) => j !== i))} className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center">×</button>
              </div>
            ))}
          </div>
        )}
      </div>

      <button
        onClick={generarEvolucion}
        disabled={cargando}
        className="w-full py-4 bg-brand-600 hover:bg-brand-700 disabled:bg-slate-300 text-white font-bold rounded-2xl transition-all duration-200"
      >
        {cargando ? '⏳ Generando evolución...' : '✨ Generar evolución'}
      </button>

      {resultado && (
        <div className="card space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-700">📄 Resultado</h3>
            <button
              onClick={() => copiar(Object.values(resultado).join('\n\n'), 'todo')}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 active:scale-95 ${
                copiado === 'todo' ? 'bg-green-500 text-white' : 'bg-brand-600 hover:bg-brand-700 text-white'
              }`}
            >
              {copiado === 'todo' ? '✅ ¡Copiado!' : '📋 Copiar todo'}
            </button>
          </div>

          {Object.entries(resultado).map(([key, valor]) => (
            <div key={key} className="border border-slate-100 rounded-xl p-3 space-y-2">
              {key !== 'texto' && (
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{key}</span>
                  <button
                    onClick={() => copiar(valor, key)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                      copiado === key ? 'bg-green-500 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                    }`}
                  >
                    {copiado === key ? '✅ Copiado' : '📋 Copiar'}
                  </button>
                </div>
              )}
              <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">{valor}</p>
            </div>
          ))}

          <p className="text-xs text-slate-400 text-center">Copiá el texto y pegalo en el sistema de la clínica</p>
        </div>
      )}
    </div>
  )
}
