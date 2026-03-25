import { getGroqClient, GROQ_MODEL } from './client.js'
import { buildAssistantSystemPrompt } from './systemPrompt.js'
import { retrieveKnowledge, formatKnowledgeContext } from './retrieveKnowledge.js'
import { logger } from '../../lib/logger.js'
import prisma from '../../lib/prisma.js'

export async function askAssistant(
  text: string,
  user: { id: string; name: string; role: string },
): Promise<string | null> {
  const client = getGroqClient()
  if (!client) return null

  try {
    const todayEnd = new Date()
    todayEnd.setHours(23, 59, 59, 999)
    const todayEndISO = todayEnd.toISOString()

    const [clients, tasks, deals, knowledgeChunks] = await Promise.all([
      prisma.client.findMany({
        where: { managerId: user.id, status: { not: 'archived' } },
        select: { firstName: true, lastName: true, status: true, phone: true },
        take: 30,
      }),
      prisma.task.findMany({
        where: {
          assigneeId: user.id,
          status: { not: 'done' },
          isArchived: false,
          deadline: { lte: todayEndISO },
        },
        select: { title: true, deadline: true, priority: true, status: true },
        take: 20,
        orderBy: { deadline: 'asc' },
      }),
      prisma.deal.findMany({
        where: {
          managerId: user.id,
          status: { notIn: ['won', 'lost'] },
        },
        select: {
          title: true,
          status: true,
          amount: true,
          client: { select: { firstName: true, lastName: true } },
        },
        take: 20,
      }),
      retrieveKnowledge(text),
    ])

    const STATUS_LABELS: Record<string, string> = {
      lead: 'лид', active: 'активный', regular: 'постоянный',
    }
    const DEAL_STATUS_LABELS: Record<string, string> = {
      new: 'новая', negotiation: 'переговоры',
      proposal_sent: 'КП отправлено', awaiting_payment: 'ожидание оплаты',
    }

    const clientList = clients
      .map(c => `- ${c.lastName} ${c.firstName} (${STATUS_LABELS[c.status] ?? c.status})${c.phone ? ', ' + c.phone : ''}`)
      .join('\n')

    const todayTasks = tasks
      .map(t => {
        const deadline = t.deadline ? t.deadline.slice(0, 10) : 'без срока'
        const overdue = t.deadline && t.deadline < new Date().toISOString() ? ' [просрочена]' : ''
        return `- ${t.title} [${t.priority}] до ${deadline}${overdue}`
      })
      .join('\n')

    const openDeals = deals
      .map(d => {
        const clientName = d.client ? `${d.client.lastName} ${d.client.firstName}` : '—'
        const status = DEAL_STATUS_LABELS[d.status] ?? d.status
        return `- ${d.title || clientName} [${status}]${d.amount ? ', ' + d.amount.toLocaleString('ru-RU') + ' руб.' : ''}`
      })
      .join('\n')

    const knowledgeContext = knowledgeChunks ? formatKnowledgeContext(knowledgeChunks) : undefined
    const systemPrompt = buildAssistantSystemPrompt(user.name, user.role, clientList, todayTasks, openDeals, knowledgeContext)

    const response = await client.chat.completions.create({
      model: GROQ_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: text },
      ],
      temperature: 0.1,
      max_tokens: 500,
    })

    const answer = response.choices[0]?.message?.content?.trim() ?? null
    logger.info('llm.assistant_response', { userId: user.id, textLen: text.length })
    return answer
  } catch (err) {
    logger.warn('llm.assistant_failed', { error: (err as Error).message })
    return null
  }
}
