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
  { id: 'evolucion-uti', label: 'Evolución UTI', icon: '🔴', color: 'bg-amber-50 border-amber-300 hover:bg-amber-100' },
  { id: 'evolucion-clinica', label: 'Evolución Clínica Médica', icon: '🟢', color: 'bg-emerald-50 border-emerald-300 hover:bg-emerald-100' },
  { id: 'ingreso-uti', label: 'Ingreso UTI', icon: '🔺', color: 'bg-red-50 border-red-300 hover:bg-red-100' },
  { id: 'alta-uti', label: 'Alta UTI', icon: '🔷', color: 'bg-sky-50 border-sky-300 hover:bg-sky-100' },
  { id: 'ingreso-clinica', label: 'Ingreso Clínica Médica', icon: '🟣', color: 'bg-violet-50 border-violet-300 hover:bg-violet-100' },
  { id: 'alta-clinica', label: 'Alta Clínica Médica', icon: '🟤', color: 'bg-teal-50 border-teal-300 hover:bg-teal-100' },
]

const USUARIO_VALIDO = 'fernando'
const PASSWORD_VALIDA = 'clinicevol2024'

export default function Home() {
  const [tipo, setTipo] = useState<TipoDocumento>(null)
  const [usuario, setUsuario] = useState('')
  const [password, setPassword] = useState('')
  const [logueado, setLogueado] = useState(false)
  const [errorLogin, setErrorLogin] = useState('')

  function handleLogin() {
    if (usuario === USUARIO_VALIDO && password === PASSWORD_VALIDA) {
      setLogueado(true)
      setErrorLogin('')
    } else {
      setErrorLogin('Usuario o contraseña incorrectos')
    }
  }

  if (!logueado) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 w-full max-w-sm">
          <div className="text-center mb-6">
            <span className="text-4xl">🏥</span>
            <h1 className="text-2xl font-bold text-slate-800 mt-2">ClinicEvol</h1>
            <p className="text-sm text-slate-400">Evoluciones clínicas con IA</p>
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-600">Usuario</label>
              <input
                type="text"
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
                className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                placeholder="usuario"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600">Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                placeholder="••••••••"
              />
            </div>
            {errorLogin && <p className="text-red-500 text-sm">{errorLogin}</p>}
            <button
              onClick={handleLogin}
              className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold py-2 rounded-lg transition-colors"
            >
              Ingresar
            </button>
          </div>
        </div>
      </main>
    )
  }

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
            <span className="text-xs text-slate-400">{usuario}</span>
            <button
              onClick={() => { setLogueado(false); setTipo(null) }}
              className="text-sm text-slate-500 hover:text-slate-700 font-medium px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            >
              Salir
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
          <EvolucionForm tipo={tipo} usuario={usuario} onVolver={() => setTipo(null)} />
        )}
      </div>
    </main>
  )
}
