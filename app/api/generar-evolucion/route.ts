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

const PROMPTS: Record<string, string> = {
  'evolucion-uti': `Sos un médico especialista en Terapia Intensiva. Generá una evolución clínica narrativa y concisa para UTI. Integrá los datos disponibles: laboratorio, monitor, respirador, imágenes y dictado. Escribí en prosa continua, sin bullets ni títulos. Mencioná solo valores relevantes o alterados. Máximo 5 oraciones breves. Al final agregá: "Dr. Fernando Lambert - Médico Especialista en Terapia Intensiva - MP 115.740"`,

  'evolucion-clinica': `Sos un médico clínico. Generá una evolución clínica narrativa y concisa para sala de clínica médica. Integrá los datos disponibles. Escribí en prosa continua, sin bullets ni títulos. Mencioná solo valores relevantes o alterados. Máximo 5 oraciones breves. Al final agregá: "Dr. Fernando Lambert - Médico Especialista en Terapia Intensiva - MP 115.740"`,

  'ingreso-uti': `Sos un médico especialista en Terapia Intensiva. Generá una hoja de ingreso a UTI narrativa y concisa. Incluí: motivo de ingreso, enfermedad actual, antecedentes relevantes, examen físico con datos positivos, laboratorio, diagnóstico presuntivo y plan inicial. Prosa continua sin bullets, sin repetir datos. Al final agregá: "Dr. Fernando Lambert - Médico Especialista en Terapia Intensiva - MP 115.740"`,

  'alta-uti': `Sos un médico especialista en Terapia Intensiva. Generá el alta de UTI en forma concisa. Incluí: resumen breve de internación, evolución, laboratorio de egreso, diagnósticos e indicaciones al alta. Prosa continua sin bullets. Al final agregá: "Dr. Fernando Lambert - Médico Especialista en Terapia Intensiva - MP 115.740"`,

  'ingreso-clinica': `Sos un médico clínico. Generá una hoja de ingreso a clínica médica narrativa y concisa. Incluí: motivo de ingreso, enfermedad actual, antecedentes relevantes, examen físico, estudios, diagnóstico presuntivo y plan inicial. Prosa continua sin bullets. Al final agregá: "Dr. Fernando Lambert - Médico Especialista en Terapia Intensiva - MP 115.740"`,

  'alta-clinica': `Sos un médico clínico. Generá el alta de clínica médica en forma concisa. Incluí: resumen breve de internación, evolución, laboratorio de egreso, diagnósticos e indicaciones al alta con medicación. Prosa continua sin bullets. Al final agregá: "Dr. Fernando Lambert - Médico Especialista en Terapia Intensiva - MP 115.740"`,
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
    if (textoLab) userContent += `LABORATORIO (AVlab):\n${textoLab}\n\n`
    if (textoImagenes) userContent += `INFORME DE IMÁGENES:\n${textoImagenes}\n\n`
    if (fotos.length > 0) userContent += `[Se adjuntan ${fotos.length} imagen(es): monitor, respirador y/o informes impresos]\n\n`
    userContent += 'Generá la evolución clínica completa integrando todos los datos anteriores.'

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
        max_tokens: 1024,
        system: systemPrompt,
        messages,
      }),
    })

    const data = await response.json()
    if (!response.ok) return NextResponse.json({ error: data.error?.message || 'Error API' }, { status: 500 })

    const cuerpo = data.content?.[0]?.text || ''
    const header = HEADERS[tipo] || ''
    const texto = header ? `${header}\n\n${fecha}\n\n${cuerpo}` : cuerpo
    return NextResponse.json({ texto })
  } catch (err: any) {
    console.error('Error generar-evolucion:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
