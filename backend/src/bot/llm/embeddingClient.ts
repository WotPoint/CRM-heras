import { logger } from '../../lib/logger.js'

// Ленивая инициализация pipeline — загружается только при первом вызове
let _pipeline: ((text: string | string[], options?: object) => Promise<unknown>) | null = null

const MODEL = 'Xenova/multilingual-e5-small'
export const EMBEDDING_DIMENSIONS = 384

async function getPipeline() {
  if (_pipeline) return _pipeline

  // Динамический импорт — пакет может отсутствовать, даём понятную ошибку
  let featureExtraction: (model: string, options?: object) => Promise<typeof _pipeline>
  try {
    const mod = await import('@huggingface/transformers')
    featureExtraction = mod.pipeline
  } catch {
    throw new Error('Пакет @huggingface/transformers не установлен. Запустите: npm install @huggingface/transformers')
  }

  logger.info('embedding.loading_model', { model: MODEL, hint: 'первый запуск — скачивается модель (~30MB)' })
  _pipeline = await featureExtraction('feature-extraction', MODEL, { dtype: 'fp32' })
  logger.info('embedding.model_ready', { model: MODEL })
  return _pipeline
}

/** Получить векторное представление текста (локально, без API) */
export async function getEmbedding(text: string): Promise<number[] | null> {
  try {
    const pipe = await getPipeline()
    if (!pipe) return null

    // Префикс "query:" улучшает качество поиска для multilingual-e5
    const output = await (pipe as Function)('query: ' + text.replace(/\n/g, ' '), {
      pooling: 'mean',
      normalize: true,
    })

    // Извлекаем плоский массив float
    const data: number[] = Array.from(output.data ?? output)
    return data
  } catch (err) {
    logger.warn('embedding.failed', { error: (err as Error).message })
    return null
  }
}

/** Получить эмбеддинги для хранения документов (префикс "passage:") */
export async function getDocumentEmbedding(text: string): Promise<number[] | null> {
  try {
    const pipe = await getPipeline()
    if (!pipe) return null

    const output = await (pipe as Function)('passage: ' + text.replace(/\n/g, ' '), {
      pooling: 'mean',
      normalize: true,
    })

    const data: number[] = Array.from(output.data ?? output)
    return data
  } catch (err) {
    logger.warn('embedding.doc_failed', { error: (err as Error).message })
    return null
  }
}
