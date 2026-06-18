import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 60

const HEADERS: Record<string, string> = {
  'evolucion-uti': 'EVOLUCIÓN DE TERAPIA INTENSIVA',
  'evolucion-clinica': 'EVOLUCIÓN DE CLÍNICA MÉDICA',
  'ingreso-uti': 'INGRESO A TERAPIA INTENSIVA',
  'alta-uti': 'ALTA DE TERAPIA INTENSIVA',
  'ingreso-clinica': 'INGRESO A CLÍNICA MÉDICA',
  'alta-clinica': 'ALTA DE CLÍNICA MÉDICA',
}

const FIRMAS: Record<string, string> = {
  'fernando': 'Dr. Fernando Lambert - Médico Especialista en Terapia Intensiva - MP 115.740',
  'luciano': 'Dr. Luciano Di Luca Dones - Médico Especialista en Terapia Intensiva - MP 116.434',
}

const ES_SECCIONADO = (tipo: string) =>
  ['ingreso-uti', 'ingreso-clinica', 'alta-uti', 'alta-clinica'].includes(tipo)

function getPrompts(firma: string): Record<string, string> {
  return {
    'evolucion-uti': `Sos un médico especialista en Terapia Intensiva escribiendo una evolución clínica diaria. REGLAS ESTRICTAS: máximo 4 oraciones, prosa sin bullets, solo valores relevantes o alterados. No des opiniones ni análisis, solo describí los datos clínicos. Terminá con: "${firma}"`,

    'evolucion-clinica': `Sos un médico clínico escribiendo una evolución diaria de sala. REGLAS ESTRICTAS: máximo 4 oraciones, prosa sin bullets, solo valores relevantes o alterados. No des opiniones ni análisis, solo describí los datos clínicos. Terminá con: "${firma}"`,

    'ingreso-uti': `Sos un médico especialista en Terapia Intensiva escribiendo una hoja de ingreso a UTI. Respondé ÚNICAMENTE con un objeto JSON válido, sin texto adicional, sin markdown, sin explicaciones. El JSON debe tener exactamente estas claves:
{
  "Enfermedad actual": "incluí aquí el motivo de ingreso, resumen clínico del dictado, e integrá los valores de laboratorio relevantes o alterados en prosa",
  "Antecedentes Patológicos": "texto",
  "Antecedentes Quirúrgicos": "texto",
  "Examen físico": "solo hallazgos positivos",
  "Diagnóstico de Ingreso": "diagnóstico principal",
  "Exámenes Complementarios": "solo estudios de imágenes — describí literalmente los informes de Sinclair, cardiólogo u otros estudios complementarios sin interpretación",
  "Interconsultas al ingreso": "si hay, sino No refiere",
  "Plan terapéutico inicial": "acciones concretas"
}
REGLAS: Cada sección 1-2 oraciones concisas. Sin análisis académico. Sin opiniones. Si un campo no tiene datos poné "No refiere".`,

    'ingreso-clinica': `Sos un médico clínico escribiendo una hoja de ingreso a clínica médica. Respondé ÚNICAMENTE con un objeto JSON válido, sin texto adicional, sin markdown, sin explicaciones. El JSON debe tener exactamente estas claves:
{
  "Enfermedad actual": "incluí aquí el motivo de ingreso, resumen clínico del dictado, e integrá los valores de laboratorio relevantes o alterados en prosa",
  "Antecedentes Patológicos": "texto",
  "Antecedentes Quirúrgicos": "texto",
  "Antecedentes Obstétricos": "si corresponde, sino No refiere",
  "Examen físico": "solo hallazgos positivos",
  "Diagnóstico de Ingreso": "diagnóstico principal",
  "Exámenes Complementarios": "solo estudios de imágenes — describí literalmente los informes de Sinclair, cardiólogo u otros estudios complementarios sin interpretación",
  "Interconsultas al ingreso": "si hay, sino No refiere",
  "Plan terapéutico inicial": "acciones concretas"
}
REGLAS: Cada sección 1-2 oraciones concisas. Sin análisis académico. Sin opiniones. Si un campo no tiene datos poné "No refiere".`,

    'alta-uti': `Sos un médico especialista en Terapia Intensiva escribiendo un alta de UTI. Respondé ÚNICAMENTE con un objeto JSON válido, sin texto adicional, sin markdown, sin explicaciones. El JSON debe tener exactamente estas claves:
{
  "Evolución": "resumen clínico del dictado e integrá los valores de laboratorio relevantes en prosa",
  "Exámenes complementarios / Resultados patológicos": "solo estudios de imágenes — describí literalmente los informes de Sinclair, cardiólogo u otros estudios complementarios sin interpretación",
  "Tratamientos realizados": "tratamientos concretos realizados durante la internación",
  "Evolución / Intercurrencias / Tratamiento de las mismas": "intercurrencias y cómo se manejaron",
  "Diagnóstico/s de Egreso": "diagnósticos al alta",
  "Indicaciones de Egreso": "medicación y controles concretos"
}
REGLAS: Cada sección 1-2 oraciones concisas. Sin análisis académico. Sin opiniones. Si un campo no tiene datos poné "No refiere".`,

    'alta-clinica': `Sos un médico clínico escribiendo un alta de clínica médica. Respondé ÚNICAMENTE con un objeto JSON válido, sin texto adicional, sin markdown, sin explicaciones. El JSON debe tener exactamente estas claves:
{
  "Evolución": "resumen clínico del dictado e integrá los valores de laboratorio relevantes en prosa",
  "Exámenes complementarios / Resultados patológicos": "solo estudios de imágenes — describí literalmente los informes de Sinclair, cardiólogo u otros estudios complementarios sin interpretación",
  "Tratamientos realizados": "tratamientos concretos realizados durante la internación",
  "Evolución / Intercurrencias / Tratamiento de las mismas": "intercurrencias y cómo se manejaron",
  "Diagnóstico/s de Egreso": "diagnósticos al alta",
  "Indicaciones de Egreso": "medicación y controles concretos"
}
REGLAS: Cada sección 1-2 oraciones concisas. Sin análisis académico. Sin opiniones. Si un campo no tiene datos poné "No refiere".`,
  }
}

async function extraerTextoPDF(buffer: Buffer): Promise<string> {
  try {
    const pdfParse = (await import('pdf-parse')).default
    const data = await pdfParse(buffer)
    let texto = data.text
    try {
      texto = decodeURIComponent(texto.replace(/\+/g, ' '))
    } catch {
      // si falla el decode usamos el texto original
    }
    return texto
  } catch {
    return ''
  }
}

async function imagenABase64(file: File): Promise<{ base64: string; mimeType: string }> {
  const buffer = Buffer.from(await file.arrayBuffer())
  return { base64: buffer.toString('base64'), mimeType: file.type || 'image/jpeg' }
}

export async function POST(req: NextRequest) {
  try {
    const fd = await req.formData()
    const tipo = fd.get('tipo') as string
    const dictado = fd.get('dictado') as string || ''
    const fechaParam = fd.get('fecha') as string | null
    const usuario = fd.get('usuario') as string || 'fernando'

    const pdfLab = fd.get('pdfLab') as File | null
    const pdfImagenes = fd.get('pdfImagenes') as File | null

    const fotos: File[] = []
    for (const [key, val] of Array.from(fd.entries())) {
      if (key.startsWith('foto_') && val instanceof File) fotos.push(val)
    }

    let textoLab = ''
    let textoImagenes = ''

    if (pdfLab) {
      const buf = Buffer.from(await pdfLab.arrayBuffer())
      textoLab = await extraerTextoPDF(buf)
    }
    if (pdfImagenes) {
      const buf = Buffer.from(await pdfImagenes.arrayBuffer())
      textoImagenes = await extraerTextoPDF(buf)
    }

    const firma = FIRMAS[usuario] || FIRMAS['fernando']
    const PROMPTS = getPrompts(firma)
    const systemPrompt = PROMPTS[tipo] || PROMPTS['evolucion-clinica']
    const fecha = fechaParam || new Date().toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })

    let userContent = `Fecha: ${fecha}\n\n`
    if (dictado) userContent += `DICTADO DEL MÉDICO:\n${dictado}\n\n`
    if (textoLab) userContent += `LABORATORIO (integrá en Enfermedad actual o Evolución):\n${textoLab}\n\n`
    if (textoImagenes) userContent += `IMÁGENES (poné en Exámenes Complementarios):\n${textoImagenes}\n\n`
    if (fotos.length > 0) userContent += `[${fotos.length} foto(s) adjunta(s): monitor, respirador o informes]\n\n`
    userContent += 'IMPORTANTE: Seguí estrictamente el formato JSON indicado. Sin análisis ni opiniones.'

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) return NextResponse.json({ error: 'API key no configurada' }, { status: 500 })

    const messages: any[] = []
    if (fotos.length > 0) {
      const contentParts: any[] = []
      for (const foto of fotos) {
        const { base64, mimeType } = await imagenABase64(foto)
        contentParts.push({ type: 'image', source: { type: 'base64', media_type: mimeType, data: base64 } })
      }
      contentParts.push({ type: 'text', text: userContent })
      messages.push({ role: 'user', content: contentParts })
    } else {
      messages.push({ role: 'user', content: userContent })
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-5',
        max_tokens: 1200,
        system: systemPrompt,
        messages,
      }),
    })

    const data = await response.json()
    if (!response.ok) return NextResponse.json({ error: data.error?.message || 'Error API' }, { status: 500 })

    const cuerpo = data.content?.[0]?.text || ''

    if (ES_SECCIONADO(tipo)) {
      try {
        const clean = cuerpo.replace(/```json|```/g, '').trim()
        const secciones = JSON.parse(clean)
        return NextResponse.json({ texto: secciones })
      } catch {
        return NextResponse.json({ texto: { texto: cuerpo } })
      }
    }

    const header = HEADERS[tipo] || ''
    const texto = header ? `${header}\n\n${fecha}\n\n${cuerpo}` : cuerpo
    return NextResponse.json({ texto })

  } catch (err: any) {
    console.error('Error generar-evolucion:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
