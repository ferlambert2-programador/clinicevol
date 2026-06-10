'use client'

import { useState } from 'react'
import EvolucionForm from './components/EvolucionForm'

export type TipoDocumento =
  | 'evolucion-uti'
  | 'evolucion-clinica'
  | 'ingreso-uti'
  | 'alta-uti'
  | 'ingreso-clinica'
  | 'alta-clinica'
  | null

const TIPOS = [
  { id: 'evolucion-uti', label: 'Evolución UTI', icon: '🫀', color: 'bg-amber-50 border-amber-300 hover:bg-amber-100' },
  { id: 'evolucion-clinica', label: 'Evolución Clínica Médica', icon: '🩺', color: 'bg-emerald-50 border-emerald-300 hover:bg-emerald-100' },
  { id: 'ingreso-uti', label: 'Ingreso UTI', icon: '🚨', color: 'bg-red-50 border-red-300 hover:bg-red-100' },
  { id: 'alta-uti', label: 'Alta UTI', icon: '✅', color: 'bg-sky-50 border-sky-300 hover:bg-sky-100' },
  { id: 'ingreso-clinica', label: 'Ingreso Clínica Médica', icon: '📋', color: 'bg-violet-50 border-violet-300 hover:bg-violet-100' },
  { id: 'alta-clinica', label: 'Alta Clínica Médica', icon: '🏠', color: 'bg-teal-50 border-teal-300 hover:bg-teal-100' },
]

interface HistorialItem {
  id: number
  timestamp: string
  tipo: TipoDocumento
  texto: string
}

const LABELS: Record<string, string> = {
  'evolucion-uti': 'Evolución UTI',
  'evolucion-clinica': 'Evolución Clínica Médica',
  'ingreso-uti': 'Ingreso UTI',
  'alta-uti': 'Alta UTI',
  'ingreso-clinica': 'Ingreso Clínica Médica',
  'alta-clinica': 'Alta Clínica Médica',
}

function HistorialModal({ onClose }: { onClose: () => void }) {
  const [copiado, setCopiado] = useState<number | null>(null)
  let items: HistorialItem[] = []
  try {
    items = JSON.parse(localStorage.getItem('clinicevol_historial') || '[]')
  } catch {}

  const copiar = async (item: HistorialItem) => {
    await navigator.clipboard.writeText(item.texto)
    setCopiado(item.id)
    setTimeout(() => setCopiado(null), 2000)
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="bg-white rounded-t-2xl w-full max-w-2xl max-h-[80vh] overflow-y-auto p-4 space-y-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-bold text-slate-800 text-lg">📋 Historial</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-2xl leading-none">×</button>
        </div>
        {items.length === 0 ? (
          <p className="text-slate-400 text-sm text-center py-8">No hay evoluciones guardadas todavía</p>
        ) : (
          items.map((item) => (
            <div key={item.id} className="border border-slate-100 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-slate-600">{LABELS[item.tipo || ''] || item.tipo}</span>
                  <span className="text-xs text-slate-400 ml-2">{new Date(item.timestamp).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <button
                  onClick={() => copiar(item)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${copiado === item.id ? 'bg-green-500 text-white' : 'bg-brand-600 text-white hover:bg-brand-700'}`}
                >
                  {copiado === item.id ? '✅ Copiado' : '📋 Copiar'}
                </button>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed line-clamp-3 whitespace-pre-wrap">{item.texto}</p>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default function Home() {
  const [tipo, setTipo] = useState<TipoDocumento>(null)
  const [mostrarHistorial, setMostrarHistorial] = useState(false)

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-100 sticky top-0 z-10 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🏥</span>
            <div>
              <h1 className="text-lg font-bold text-slate-800 leading-tight">ClinicEvol</h1>
              <p className="text-xs text-slate-400">Evoluciones clínicas con IA</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMostrarHistorial(true)}
              className="text-sm text-slate-500 hover:text-slate-700 font-medium px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            >
              📋 Historial
            </button>
            {tipo && (
              <button
                onClick={() => setTipo(null)}
                className="text-sm text-slate-500 hover:text-slate-700 font-medium px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                ← Cambiar
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {!tipo ? (
          <>
            <div className="mb-6">
              <h2 className="text-xl font-bold text-slate-800 mb-1">¿Qué vas a generar?</h2>
              <p className="text-slate-500 text-sm">Seleccioná el tipo de documento</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {TIPOS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTipo(t.id as TipoDocumento)}
                  className={`border-2 rounded-2xl p-4 text-left transition-all duration-150 active:scale-95 ${t.color}`}
                >
                  <span className="text-3xl block mb-2">{t.icon}</span>
                  <span className="text-sm font-semibold text-slate-800 leading-tight">{t.label}</span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <EvolucionForm tipo={tipo} onVolver={() => setTipo(null)} />
        )}
      </div>

      {mostrarHistorial && <HistorialModal onClose={() => setMostrarHistorial(false)} />}
    </main>
  )
}
