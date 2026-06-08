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

  return (
    <main className="min-h-screen bg-slate-50">
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
          {tipo && (
            <button
              onClick={() => setTipo(null)}
              className="text-sm text-slate-500 hover:text-slate-700 font-medium px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            >
              ← Cambiar
            </button>
          )}
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
