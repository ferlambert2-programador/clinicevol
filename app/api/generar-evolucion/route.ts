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
  'evolucion-uti': `Sos un médico especialista en Terapia Intensiva. Generá una evolución clínica narrativa, fluida y profesional para UTI. Integrá todos los datos disponibles: laboratorio, parámetros del monitor hemodinámico, parámetros del respirador, informes de imágenes, y el dictado del médico. Escribí en prosa continua, sin bullets ni títulos. Mencioná solo los valores relevantes o alterados en forma concisa, sin explicaciones académicas. Máximo 5 oraciones. Al final agregá: "Dr. Fernando Lambert - Médico Especialista en Terapia Intensiva - MP 115.740"`,

  'evolucion-clinica': `Sos un médico clínico. Generá una evolución clínica narrativa, fluida y profesional para sala de clínica médica. Integrá todos los datos disponibles. Escribí en prosa continua, sin bullets ni títulos. Mencioná solo los valores relevantes o alterados en forma concisa. Máximo 5 oraciones. Al final agregá: "Dr. Fernando Lambert - Médico Especialista en Terapia Intensiva - MP 115.740"`,

  'ingreso-uti': `Sos un médico especialista en Terapia Intensiva. Generá una hoja de ingreso a UTI completa y narrativa. Incluí: motivo de ingreso, enfermedad actual, antecedentes relevantes, examen físico con datos positivos, laboratorio de ingreso, estudios complementarios, diagnóstico presuntivo y plan terapéutico inicial. Escribí en prosa narrativa continua sin bullets. Al final agregá: "Dr. Fernando Lambert - Médico Especialista en Terapia Intensiva - MP 115.740"`,

  'alta-uti': `Sos un médico especialista en Terapia Intensiva. Generá el alta de UTI. Incluí: resumen de la internación, evolución durante la estadía en UTI, laboratorio de egreso, diagnósticos de egreso e indicaciones al alta. Escribí en prosa narrativa continua. Al final agregá: "Dr. Fernando Lambert - Médico Especialista en Terapia Intensiva - MP 115.740"`,

  'ingreso-clinica': `Sos un médico clínico. Generá una hoja de ingreso a clínica médica completa y narrativa. Incluí: motivo de ingreso, enfermedad actual, antecedentes patológicos y quirúrgicos relevantes, examen físico, estudios complementarios, diagnóstico presuntivo y plan terapéutico inicial. Escribí en prosa narrativa continua. Al final agregá: "Dr. Fernando Lambert - Médico Especialista en Terapia Intensiva - MP 115.740"`,

  'alta-clinica': `Sos un médico clínico. Generá el alta de clínica médica. Incluí: resumen de la internación, evolución, laboratorio de egreso, diagnósticos de egreso e indicaciones al alta con medicación detallada. Escribí en prosa narrativa continua. Al final agregá: "Dr. Fernando Lambert - Médico Especialista en Terapia Intensiva - MP 115.740"`,
}

async function
