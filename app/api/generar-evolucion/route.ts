import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 60

const HEADERS: Record<string, string> = {
  'evolucion-uti':    'EVOLUCIÓN DE TERAPIA INTENSIVA',
  'evolucion-clinica':'EVOLUCIÓN DE CLÍNICA MÉDICA',
  'ingreso-uti':      'INGRESO A TERAPIA INTENSIVA',
  'ingreso-clinica':  'INGRESO A CLÍNICA MÉDICA',
  'alta-uti':         'ALTA DE TERAPIA INTENSIVA',
  'alta-clinica':     'ALTA DE CLÍNICA MÉDICA',
}

const PROMPTS: Record<string, string> = {
  'evolucion-uti': `Tu única tarea es mejorar la redacción del dictado del médico y transcribir los datos de laboratorio, monitor y respirador que se adjunten, integrándolos en el texto. No agregues diagnósticos, conclusiones clínicas, interpretaciones ni información que no esté explícitamente en el dictado o en los estudios adjuntos. Respetá exactamente lo que el médico dijo: no cambies el sentido, no agregues ni quites hallazgos, no sugieras diagnósticos diferenciales ni planes. Redactá en prosa fluida, sin bullets ni títulos, como una evolución médica real. Si algo no está en el dictado ni en los estudios, no lo incluyas.
Al final agregá: "Dr. Fernando Lambert - Médico Especialista en Terapia Intensiva - MP 115.740"`,

  'evolucion-clinica': `Tu única tarea es mejorar la redacción del dictado del médico y transcribir los datos de laboratorio e imágenes que se adjunten, integrándolos en el texto. No agregues diagnósticos, conclusiones clínicas, interpretaciones ni información que no esté explícitamente en el dictado o en los estudios adjuntos. Respetá exactamente lo que el médico dijo: no cambies el sentido, no agregues ni quites hallazgos, no sugieras diagnósticos diferenciales ni planes. Redactá en prosa fluida, sin bullets ni títulos, como una evolución médica real. Si algo no está en el dictado ni en los estudios, no lo incluyas.
Al final agregá: "Dr. Fernando Lambert - Médico Especialista en Terapia Intensiva - MP 115.740"`,

  'ingreso-uti': `Tu única tarea es mejorar la redacción del dictado del médico y transcribir los datos de laboratorio e imágenes que se adjunten, integrándolos en el texto con el orden típico de un ingreso (motivo, enfermedad actual, antecedentes, examen físico, estudios, diagnóstico presuntivo, plan). No agregues información que no esté en el dictado o en los estudios adjuntos. No saques conclusiones propias ni sugieras diagnósticos o tratamientos que el médico no haya mencionado. Redactá en prosa fluida, sin bullets ni títulos.
Al final agregá: "Dr. Fernando Lambert - Médico Especialista en Terapia Intensiva - MP 115.740"`,

  'alta-uti': `Tu única tarea es mejorar la redacción del dictado del médico y transcribir los datos de laboratorio que se adjunten, integrándolos en el texto con el orden típico de un alta (resumen, evolución, laboratorio de egreso, diagnósticos, plan al alta). No agregues información que no esté en el dictado o en los estudios adjuntos. No saques conclusiones propias ni sugieras indicaciones que el médico no haya mencionado. Redactá en prosa fluida, sin bullets ni títulos.
Al final agregá: "Dr. Fernando Lambert - Médico Especialista en Terapia Intensiva - MP 115.740"`,

  'ingreso-clinica': `Tu única tarea es mejorar la redacción del dictado del médico y transcribir los datos de laboratorio e imágenes que se adjunten, integrándolos en el texto con el orden típico de un ingreso (motivo, enfermedad actual, antecedentes, examen físico, estudios, diagnóstico presuntivo, plan). No agregues información que no esté en el dictado o en los estudios adjuntos. No saques conclusiones propias ni sugieras diagnósticos o tratamientos que el médico no haya mencionado. Redactá en prosa fluida, sin bullets ni títulos.
Al final agregá: "Dr. Fernando Lambert - Médico Especialista en Terapia Intensiva - MP 115.740"`,

  'alta-clinica': `Tu única tarea es mejorar la redacción del dictado del médico y transcribir los datos de laboratorio que se adjunten, integrándolos en el texto con el orden típico de un alta (resumen, evolución, laboratorio de egreso, diagnósticos, indicaciones al alta con medicación). No agregues información que no esté en el dictado o en los estudios adjuntos. No saques conclusiones propias ni sugieras indicaciones que el médico no haya mencionado. Redactá en prosa fluida, sin bullets ni títulos.
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
    const fechaParam = fd.get('fecha') as string | null

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
    const fecha = fechaParam || new Date().toLocaleDateString('es-AR', {
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

    const cuerpo = data.content?.[0]?.text || ''
    const header = HEADERS[tipo] || ''
    const texto = header ? `${header}\n${fecha}\n\n${cuerpo}` : cuerpo
    return NextResponse.json({ texto })
  } catch (err: any) {
    console.error('Error generar-evolucion:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
