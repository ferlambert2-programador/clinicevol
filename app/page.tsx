'use client'

import { useState, useEffect } from 'react'
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
  { id: 'evolucion-clinica', label: 'Evolución Clínica Médica', icon: '📋', color: 'bg-emerald-50 border-emerald-300 hover:bg-emerald-100' },
  { id: 'ingreso-uti', label: 'Ingreso UTI', icon: '🚨', color: 'bg-red-50 border-red-300 hover:bg-red-100' },
  { id: 'alta-uti', label: 'Alta UTI', icon: '✅', color: 'bg-sky-50 border-sky-300 hover:bg-sky-100' },
  { id: 'ingreso-clinica', label: 'Ingreso Clínica Médica', icon: '🏥', color: 'bg-violet-50 border-violet-300 hover:bg-violet-100' },
  { id: 'alta-clinica', label: 'Alta Clínica Médica', icon: '🏠', color: 'bg-teal-50 border-teal-300 hover:bg-teal-100' },
]

const LABELS: Record<string, string> = {
  'evolucion-uti': 'Evolución UTI',
  'evolucion-clinica': 'Evolución Clínica Médica',
  'ingreso-uti': 'Ingreso UTI',
  'alta-uti': 'Alta UTI',
  'ingreso-clinica': 'Ingreso Clínica Médica',
  'alta-clinica': 'Alta Clínica Médica',
}

const USUARIO_VALIDO = 'fernando'
const PASSWORD_VALIDA = 'clinicevol2024'

function HistorialPanel({ usuario, onClose }: { usuario: string; onClose: () => void }) {
  const [items, setItems] = useState<any[]>([])
  const [cargando, setCargando] = useState(true)
  const [copiado, setCopiado] = useState<string | null>(null)

  const cargar = async () => {
    try {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      const res = await fetch(
        `${url}/rest/v1/evoluciones?usuario=eq.${usuario}&order=fecha.desc&limit=50`,
        { headers: { apikey: key!, Authorization: `Bearer ${key}` } }
      )
      const data = await res.json()
      setItems(data)
    } catch {
      setItems([])
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => { cargar() }, [usuario])

  const eliminar = async (id: string) => {
    if (!confirm('¿Eliminar esta evolución?')) return
    try {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      await fetch(`${url}/rest/v1/evoluciones?id=eq.${id}`, {
        method: 'DELETE',
        headers: { apikey: key!, Authorization: `Bearer ${key}` },
      })
      setItems((prev) => prev.filter((i) => i.id !== id))
    } catch {
      alert('Error al eliminar')
    }
  }

  const copiar = async (texto: string, key: string) => {
    await navigator.clipboard.writeText(texto)
    setCopiado(key)
    setTimeout(() => setCopiado(null), 2000)
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="bg-white rounded-t-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto p-4 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-bold text-slate-800 text-lg">📋 Historial</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-2xl leading-none">×</button>
        </div>

        {cargando && <p className="text-slate-400 text-sm text-center py-8">Cargando...</p>}
        {!cargando && items.length === 0 && (
          <p className="text-slate-400 text-sm text-center py-8">No hay evoluciones guardadas todavía</p>
        )}

        {items.map((item) => {
          const contenido: Record<string, string> = item.contenido
          const fecha = new Date(item.fecha).toLocaleString('es-AR', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
          })
          const textoCompleto = Object.values(contenido).join('\n\n')

          return (
            <div key={item.id} className="border border-slate-200 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-semibold text-slate-700">{LABELS[item.tipo] || item.tipo}</span>
                  <span className="text-xs text-slate-400 ml-2">{fecha}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => copiar(textoCompleto, `todo-${item.id}`)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                      copiado === `todo-${item.id}` ? 'bg-green-500 text-white' : 'bg-teal-600 text-white hover:bg-teal-700'
                    }`}
                  >
                    {copiado === `todo-${item.id}` ? '✅ Copiado' : '📋 Copiar todo'}
                  </button>
                  <button
                    onClick={() => eliminar(item.id)}
                    className="px-3 py-1 rounded-lg text-xs font-semibold bg-red-50 text-red-500 hover:bg-red-100 transition-all"
                  >
                    🗑️
                  </button>
                </div>
              </div>

              {Object.entries(contenido).map(([key, valor]) => (
                <div key={key} className="bg-slate-50 rounded-lg p-2 space-y-1">
                  {key !== 'texto' && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-500 uppercase">{key}</span>
                      <button
                        onClick={() => copiar(valor, `${item.id}-${key}`)}
                        className={`px-2 py-0.5 rounded text-xs font-semibold transition-all ${
                          copiado === `${item.id}-${key}` ? 'bg-green-500 text-white' : 'bg-slate-200 hover:bg-slate-300 text-slate-600'
                        }`}
                      >
                        {copiado === `${item.id}-${key}` ? '✅' : '📋'}
                      </button>
                    </div>
                  )}
                  <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap line-clamp-3">{valor}</p>
                </div>
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function Home() {
  const [tipo, setTipo] = useState<TipoDocumento>(null)
  const [usuario, setUsuario] = useState('')
  const [password, setPassword] = useState('')
  const [logueado, setLogueado] = useState(false)
  const [errorLogin, setErrorLogin] = useState('')
  const [mostrarHistorial, setMostrarHistorial] = useState(false)

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
            <span className="text-xs
