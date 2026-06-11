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

const ES_SECCIONADO = (tipo: string) =>
  ['ingreso-uti', 'ingreso-clinica', 'alta-uti', 'alta-clinica'].includes(tipo)

const PROMPTS: Record<string, string> = {
  'evolucion-uti': `Sos un médico especialista en Terapia Intensiva escribiendo una evolución clínica diaria. REGLAS ESTRICTAS: máximo 4 oraciones, prosa sin bullets, solo valores relevantes o alterados. Terminá con: "Dr. Fernando Lambert - Médico Especialista en Terapia Intensiva - MP 115.740"`,

  'evolucion-clinica': `Sos un médico clínico escribiendo una evolución diaria de sala. REGLAS ESTRICTAS: máximo 4 oraciones, prosa sin bullets, solo valores relevantes o alterados. Terminá con: "Dr. Fernando Lambert - Médico Especialista en Terapia Intensiva - MP 115.740"`,

  'ingreso-uti': `Sos un médico especialista en Terapia Intensiva escribiendo una hoja de ingreso a UTI. Respondé ÚNICAMENTE con un objeto JSON válido, sin texto adicional, sin markdown, sin explicaciones. El JSON debe tener exactamente estas claves:
{
  "Enfermedad actual": "texto",
  "Antecedentes Patológicos": "texto",
  "Antecedentes Quirúrgicos": "texto",
  "Examen físico": "texto",
  "Diagnóstico de Ingreso": "texto",
  "Exámenes Complementarios": "texto",
  "Interconsultas al ingreso": "texto o vacío",
  "Plan terapéutico inicial": "texto"
}
Cada sección: 1-2 oraciones concisas, solo datos positivos o alterados. Sin análisis académico.`,

  'ingreso-clinica': `Sos un médico clínico escribiendo una hoja de ingreso a clínica médica. Respondé ÚNICAMENTE con un objeto JSON válido, sin texto adicional, sin markdown, sin explicaciones. El JSON debe tener exactamente estas claves:
{
  "Enfermedad actual": "texto",
  "Antecedentes Patológicos": "texto",
  "Antecedentes Quirúrgicos": "texto",
  "Antecedentes Obstétricos": "texto o vacío",
  "Examen físico": "texto",
  "Diagnóstico de Ingreso": "texto",
  "Exámenes Complementarios": "texto",
  "Interconsultas al ingreso": "texto o vacío",
  "Plan terapéutico inicial": "texto"
}
Cada sección: 1-2 oraciones concisas, solo datos positivos o alterados. Sin análisis académico.`,

  'alta-uti': `Sos un médico especialista en Terapia Intensiva escribiendo un alta de UTI. Respondé ÚNICAMENTE con un objeto JSON válido, sin texto adicional, sin markdown, sin explicaciones. El JSON debe tener exactamente estas claves:
{
  "Evolución": "texto",
  "Exámenes complementarios / Resultados patológicos": "texto",
  "Tratamientos realizados": "texto",
  "Evolución / Intercurrencias / Tratamiento de las mismas": "texto",
  "Diagnóstico/s de Egreso": "texto",
  "Indicaciones de Egreso": "texto"
}
Cada sección: 1-2 oraciones concisas. Sin análisis académico.`,

  'alta-clinica': `Sos un médico clínico escribiendo un alta de clínica médica. Respondé ÚNICAMENTE con un objeto JSON válido, sin texto adicional, sin markdown, sin explicaciones. El JSON debe tener exactamente estas claves:
{
  "Evolución": "texto",
  "Exámenes complementarios / Resultados patológicos": "texto",
  "Tratamientos realizados": "texto",
  "Evolución / Intercurrencias / Tratamiento de las mismas": "texto",
  "Diagnóstico/s de Egreso": "texto",
  "Indicaciones de Egreso": "texto"
}
Cada sección: 1-2 oraciones concisas. Sin análisis académico.`,
}

async function extraerTextoPDF(buffer: Buffer): Promise<string> {
  try {
    const pdfParse = (await import('pdf-parse')).default
    const data = await pdfParse(buffer)
    return data.text
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

    const systemPrompt = PROMPTS[tipo] || PROMPTS['evolucion-clinica']
    const fecha = fechaParam || new Date().toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })

    let userContent = `Fecha: ${fecha}\n\n`
    if (dictado) userContent += `DICTADO DEL MÉDICO:\n${dictado}\n\n`
    if (textoLab) userContent += `LABORATORIO:\n${textoLab}\n\n`
    if (textoImagenes) userContent += `IMÁGENES:\n${textoImagenes}\n\n`
    if (fotos.length > 0) userContent += `[${fotos.length} foto(s) adjunta(s): monitor, respirador o informes]\n\n`
    userContent += 'IMPORTANTE: Seguí estrictamente el formato indicado. Respuesta concisa.'

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

    // Para ingreso y alta: parsear JSON con secciones
    if (ES_SECCIONADO(tipo)) {
      try {
        const clean = cuerpo.replace(/```json|```/g, '').trim()
        const secciones = JSON.parse(clean)
        return NextResponse.json({ texto: secciones })
      } catch {
        // Si no parsea, devolver como texto plano
        return NextResponse.json({ texto: { texto: cuerpo } })
      }
    }

    // Para evoluciones: texto plano con header
    const header = HEADERS[tipo] || ''
    const texto = header ? `${header}\n\n${fecha}\n\n${cuerpo}` : cuerpo
    return NextResponse.json({ texto })

  } catch (err: any) {
    console.error('Error generar-evolucion:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
