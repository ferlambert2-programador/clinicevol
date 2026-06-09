import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 60

const PROMPTS: Record<string, string> = {
  'evolucion-uti': `Sos un médico intensivista escribiendo una evolución de guardia. Redactá en 3 a 5 oraciones, en prosa, como lo haría un médico real: mencioná solo los valores anormales o relevantes de pasada, sin explicarlos. No uses bullets, títulos ni lenguaje académico. Integrá el dictado, laboratorio, monitor y respirador si están disponibles.
Al final agregá: "Dr. Fernando Lambert - Médico Especialista en Terapia Intensiva - MP 115.740"`,

  'evolucion-clinica': `Sos un médico clínico escribiendo una evolución de sala. Redactá en 3 a 5 oraciones, en prosa, como lo haría un médico real: mencioná solo los valores anormales o relevantes de pasada, sin explicarlos. No uses bullets, títulos ni lenguaje académico. Integrá el dictado, laboratorio e imágenes si están disponibles.
Al final agregá: "Dr. Fernando Lambert - Médico Especialista en Terapia Intensiva - MP 115.740"`,

  'ingreso-uti': `Sos un médico intensivista completando un ingreso a UTI. Redactá en prosa continua y concisa: motivo de ingreso, enfermedad actual, antecedentes relevantes, examen físico con hallazgos positivos, laboratorio e imágenes de ingreso, diagnóstico presuntivo y plan inicial. Mencioná solo los datos relevantes o anormales, sin explicaciones académicas.
Al final agregá: "Dr. Fernando Lambert - Médico Especialista en Terapia Intensiva - MP 115.740"`,

  'alta-uti': `Sos un médico intensivista redactando el alta de UTI. Escribí en prosa concisa: resumen de la internación, evolución, laboratorio de egreso, diagnósticos y plan al alta. Solo los datos relevantes, sin explicaciones.
Al final agregá: "Dr. Fernando Lambert - Médico Especialista en Terapia Intensiva - MP 115.740"`,

  'ingreso-clinica': `Sos un médico clínico completando un ingreso a sala. Redactá en prosa continua y concisa: motivo de ingreso, enfermedad actual, antecedentes relevantes, examen físico con hallazgos positivos, estudios complementarios, diagnóstico presuntivo y plan inicial. Solo los datos relevantes o anormales, sin explicaciones académicas.
Al final agregá: "Dr. Fernando Lambert - Médico Especialista en Terapia Intensiva - MP 115.740"`,

  'alta-clinica': `Sos un médico clínico redactando el alta de sala. Escribí en prosa concisa: resumen de la internación, evolución, laboratorio de egreso, diagnósticos e indicaciones al alta con medicación. Solo los datos relevantes, sin explicaciones.
Al final agregá: "Dr. Fernando Lambert - Médico Especialista en Terapia Intensiva - MP 115.740"`,
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
  return {
    base64: buffer.toString('base64'),
    mimeType: file.type || 'image/jpeg',
  }
}

export async function POST(req: NextRequest) {
  try {
    const fd = await req.formData()
    const tipo = fd.get('tipo') as string
    const dictado = fd.get('dictado') as string || ''

    const pdfLab = fd.get('pdfLab') as File | null
    const pdfImagenes = fd.get('pdfImagenes') as File | null

    const fotos: File[] = []
    for (const [key, val] of Array.from(fd.entries())) {
      if (key.startsWith('foto_') && val instanceof File) {
        fotos.push(val)
      }
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
    const fecha = new Date().toLocaleDateString('es-AR', {
      day: '2-digit', month: '2-digit', year: 'numeric'
    })

    let userContent = `Fecha: ${fecha}\n\n`
    if (dictado) userContent += `DICTADO DEL MÉDICO:\n${dictado}\n\n`
    if (textoLab) userContent += `LABORATORIO (AVlab):\n${textoLab}\n\n`
    if (textoImagenes) userContent += `INFORME DE IMÁGENES:\n${textoImagenes}\n\n`
    if (fotos.length > 0) userContent += `[Se adjuntan ${fotos.length} imagen(es): monitor, respirador y/o informes impresos - analizalas e integrá los datos]\n\n`
    userContent += 'Generá la evolución clínica completa integrando todos los datos anteriores.'

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'API key no configurada' }, { status: 500 })
    }

    const messages: any[] = []

    if (fotos.length > 0) {
      const contentParts: any[] = []
      for (const foto of fotos) {
        const { base64, mimeType } = await imagenABase64(foto)
        contentParts.push({
          type: 'image',
          source: { type: 'base64', media_type: mimeType, data: base64 },
        })
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
        max_tokens: 2048,
        system: systemPrompt,
        messages,
      }),
    })

    const data = await response.json()
    if (!response.ok) {
      return NextResponse.json({ error: data.error?.message || 'Error API' }, { status: 500 })
    }

    const texto = data.content?.[0]?.text || ''
    return NextResponse.json({ texto })
  } catch (err: any) {
    console.error('Error generar-evolucion:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
