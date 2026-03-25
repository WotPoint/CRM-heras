import { getEmbedding } from './embeddingClient.js'
import { logger } from '../../lib/logger.js'
import prisma from '../../lib/prisma.js'

const TOP_K = 3
const MIN_SCORE = 0.6

export interface KnowledgeResult {
  content: string
  docTitle: string
  docType: string
  section: string
  score: number
}

/** Косинусное сходство двух векторов */
function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0
  let normA = 0
  let normB = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }
  if (normA === 0 || normB === 0) return 0
  return dot / (Math.sqrt(normA) * Math.sqrt(normB))
}

/**
 * Найти наиболее релевантные чанки из базы знаний.
 * Возвращает null если OPENAI_API_KEY не задан или база пуста.
 */
export async function retrieveKnowledge(query: string): Promise<KnowledgeResult[] | null> {
  const queryEmbedding = await getEmbedding(query)
  if (!queryEmbedding) return null

  const chunks = await prisma.knowledgeChunk.findMany({
    select: { content: true, embedding: true, docTitle: true, docType: true, section: true },
  })

  if (chunks.length === 0) return null

  const scored = chunks
    .map(chunk => {
      try {
        const vec = JSON.parse(chunk.embedding) as number[]
        const score = cosineSimilarity(queryEmbedding, vec)
        return { content: chunk.content, docTitle: chunk.docTitle, docType: chunk.docType, section: chunk.section, score }
      } catch {
        return null
      }
    })
    .filter((c): c is KnowledgeResult => c !== null && c.score >= MIN_SCORE)
    .sort((a, b) => b.score - a.score)
    .slice(0, TOP_K)

  if (scored.length === 0) return null

  logger.info('rag.retrieved', { query: query.slice(0, 60), count: scored.length, topScore: scored[0].score.toFixed(3) })
  return scored
}

/** Форматировать найденные чанки для вставки в промпт */
export function formatKnowledgeContext(chunks: KnowledgeResult[]): string {
  return chunks
    .map(c => {
      const source = c.section ? `${c.docTitle} — ${c.section}` : c.docTitle
      return `[${source}]:\n${c.content}`
    })
    .join('\n\n')
}
