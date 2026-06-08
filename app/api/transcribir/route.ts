import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 30

export async function POST(req: NextRequest) {
  try {
    const fd = await req.formData()
    const audio = fd.get('audio') as File | null

    if (!audio) {
      return NextResponse.json({ error: 'No se recibió audio' }, { status: 400 })
    }

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'OpenAI API key no configurada' }, { status: 500 })
    }

    const formData = new FormData()
    formData.append('file', audio, 'audio.webm')
    formData.append('model', 'whisper-1')
    formData.append('language', 'es')

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: formData,
    })

    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json({ error: data.error?.message || 'Error Whisper' }, { status: 500 })
    }

    return NextResponse.json({ texto: data.text })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
