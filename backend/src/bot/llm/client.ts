import Groq from 'groq-sdk'

let _client: Groq | null = null

export function getGroqClient(): Groq | null {
  if (!process.env.GROQ_API_KEY) return null
  if (!_client) _client = new Groq({ apiKey: process.env.GROQ_API_KEY })
  return _client
}

export const GROQ_MODEL = 'llama-3.3-70b-versatile'
