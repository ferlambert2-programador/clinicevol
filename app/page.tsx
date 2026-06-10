$ cat /home/user/clinicevol/app/page.tsx

'use client'

import { useState, useEffect } from 'react'
import EvolucionForm from './components/EvolucionForm'

interface HistorialItem {
  id: number
  timestamp: string
  tipo: string
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
  const [items, setItems] = useState<HistorialItem[]>([])
  const [copiado, setCopiado] = useState<number | null>(null)

  useEffect(() => {
    try {
      const data = JSON.parse(localStorage.getItem('clinicevol_historial') || '[]')
      setItems(data)
    } catch {}
  }, [])

  const copiar = async (item: HistorialItem) => {
    await navigator.clipboard.writeText(item.texto)
    setCopiado(item.id)
    setTimeout(() => setCopiado(null), 2000)
  }

  const formatFecha = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
      ' ' + d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center pt-4 pb-4 px-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl">
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <h2 className="font-bold text-slate-800 text-lg">📋 Historial de evoluciones</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl font-bold px-2">×</button>
        </div>
        <div className="p-4 space-y-4 max-h-[80vh] overflow-y-auto">
          {items.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-8">No hay evoluciones guardadas aún</p>
          ) : (
            items.map((item) => (
              <div key={item.id} className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border-b border-slate-100">
                  <div>
                    <span className="text-xs font-semibold text-slate-700">{LABELS[item.tipo] || item.tipo}</span>
                    <span className="text-xs text-slate-400 ml-2">{formatFecha(item.timestamp)}</span>
                  </div>
                  <button
                    onClick={() => copiar(item)}
                    className={`text-xs font-semibold px-3 py-1 rounded-lg transition-all active:scale-95 ${
                      copiado === item.id ? 'bg-green-500 text-white' : 'bg-brand-600 text-white hover:bg-brand-700'
                    }`}
                  >
                    {copiado === item.id ? '✅ Copiado' : '📋 Copiar'}
                  </button>
                </div>
                <pre className="text-xs text-slate-700 p-3 whitespace-pre-wrap leading-relaxed font-sans">{item.texto}</pre>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

export type TipoDocumento =
  | 'evolucion-uti'
  | 'evolucion-clinica'
  | 'ingreso-uti'
  | 'alta-uti'
  | 'ingreso-clinica'
  | 'alta-clinica'
  | null

const TIPOS = [
  {
    id: 'evolucion-uti',
    label: 'Evolución UTI',
    icon: '🫀',
    color: 'bg-amber-50 border-amber-300 hover:bg-amber-100',
    activeColor: 'bg-amber-100 border-amber-500 ring-2 ring-amber-400',
    badge: 'bg-amber-100 text-amber-800',
  },
  {
    id: 'evolucion-clinica',
    label: 'Evolución Clínica Médica',
    icon: '🩺',
    color: 'bg-emerald-50 border-emerald-300 hover:bg-emerald-100',
    activeColor: 'bg-emerald-100 border-emerald-500 ring-2 ring-emerald-400',
    badge: 'bg-emerald-100 text-emerald-800',
  },
  {
    id: 'ingreso-uti',
    label: 'Ingreso UTI',
    icon: '🚨',
    color: 'bg-red-50 border-red-300 hover:bg-red-100',
    activeColor: 'bg-red-100 border-red-500 ring-2 ring-red-400',
    badge: 'bg-red-100 text-red-800',
  },
  {
    id: 'alta-uti',
    label: 'Alta UTI',
    icon: '✅',
    color: 'bg-sky-50 border-sky-300 hover:bg-sky-100',
    activeColor: 'bg-sky-100 border-sky-500 ring-2 ring-sky-400',
    badge: 'bg-sky-100 text-sky-800',
  },
  {
    id: 'ingreso-clinica',
    label: 'Ingreso Clínica Médica',
    icon: '📋',
    color: 'bg-violet-50 border-violet-300 hover:bg-violet-100',
    activeColor: 'bg-violet-100 border-violet-500 ring-2 ring-violet-400',
    badge: 'bg-violet-100 text-violet-800',
  },
  {
    id: 'alta-clinica',
    label: 'Alta Clínica Médica',
    icon: '🏠',
    color: 'bg-teal-50 border-teal-300 hover:bg-teal-100',
    activeColor: 'bg-teal-100 border-teal-500 ring-2 ring-teal-400',
    badge: 'bg-teal-100 text-teal-800',
  },
]

export default function Home() {
  const [tipo, setTipo] = useState<TipoDocumento>(null)
  const [verHistorial, setVerHistorial] = useState(false)

  return (
    <main className="min-h-screen bg-slate-50">
      {verHistorial && <HistorialModal onClose={() => setVerHistorial(false)} />}

      {/* Header */}
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
              onClick={() => setVerHistorial(true)}
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
    </main>
  )
}
