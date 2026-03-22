import { getGroqClient, GROQ_MODEL } from './client.js'
import { buildSystemPrompt } from './systemPrompt.js'
import { logger } from '../../lib/logger.js'

export type IntentType = 'log_activity' | 'create_task' | 'quick_note' | 'show_tasks' | 'unknown'

export interface ParsedIntent {
  intent: IntentType
  confidence: number
  entities: {
    clientFirstName: string | null
    clientLastName: string | null
    clientPhone: string | null
    activityType: 'meeting' | 'call' | 'email' | 'note' | null
    activityDate: string | null
    description: string | null
    result: string | null
  }
}

const FALLBACK: ParsedIntent = {
  intent: 'unknown',
  confidence: 0,
  entities: {
    clientFirstName: null,
    clientLastName: null,
    clientPhone: null,
    activityType: null,
    activityDate: null,
    description: null,
    result: null,
  },
}

export async function parseIntent(
  text: string,
  userName: string,
  userRole: string,
): Promise<ParsedIntent> {
  const client = getGroqClient()
  if (!client) return FALLBACK

  try {
    const response = await client.chat.completions.create({
      model: GROQ_MODEL,
      messages: [
        { role: 'system', content: buildSystemPrompt(userName, userRole) },
        { role: 'user', content: text },
      ],
      temperature: 0.1,
      max_tokens: 300,
      response_format: { type: 'json_object' },
    })

    const raw = response.choices[0]?.message?.content ?? ''
    const parsed = JSON.parse(raw) as ParsedIntent

    // Базовая валидация
    const validIntents: IntentType[] = ['log_activity', 'create_task', 'quick_note', 'show_tasks', 'unknown']
    if (!validIntents.includes(parsed.intent)) parsed.intent = 'unknown'
    if (typeof parsed.confidence !== 'number') parsed.confidence = 0
    parsed.confidence = Math.max(0, Math.min(1, parsed.confidence))

    logger.info('llm.intent_parsed', {
      intent: parsed.intent,
      confidence: parsed.confidence,
      text: text.slice(0, 80),
    })

    return parsed
  } catch (err) {
    logger.warn('llm.parse_failed', { error: (err as Error).message, text: text.slice(0, 80) })
    return FALLBACK
  }
}
