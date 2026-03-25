/**
 * Скрипт индексации документов базы знаний.
 * Запуск: npx tsx src/scripts/indexDocs.ts
 *
 * Поддерживаемые форматы: .txt, .docx
 * Документы кладутся в папку: backend/docs/
 *
 * Логика обновления:
 *   - Если md5 файла не изменился — файл пропускается.
 *   - Если изменился — старые чанки удаляются, файл индексируется заново.
 */

import { readdir, readFile } from 'fs/promises'
import { join, extname, basename } from 'path'
import { createHash } from 'crypto'
import { createRequire } from 'module'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import prisma from '../lib/prisma.js'
import { getDocumentEmbedding } from '../bot/llm/embeddingClient.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const DOCS_DIR = join(__dirname, '../../docs')

const CHUNK_SIZE = 1500   // символов в одном чанке (~400 токенов)
const OVERLAP = 150       // символов перекрытия между чанками

/** Определить тип документа по имени файла */
function detectDocType(filename: string): { docType: string; position: string } {
  const name = filename.toLowerCase()
  if (name.includes('инструкц') || name.includes('instruction')) {
    const position = name.includes('менеджер') ? 'менеджер по продажам'
      : name.includes('supervisor') || name.includes('руководитель') ? 'руководитель отдела продаж'
      : ''
    return { docType: 'job_instruction', position }
  }
  return { docType: 'regulation', position: '' }
}

/** Нарезать текст на чанки с перекрытием */
function splitIntoChunks(text: string): string[] {
  // Разбиваем на параграфы (по двойному переводу строки)
  const paragraphs = text.split(/\n{2,}/).map(p => p.trim()).filter(Boolean)

  const chunks: string[] = []
  let current = ''

  for (const para of paragraphs) {
    if (current.length + para.length + 2 <= CHUNK_SIZE) {
      current = current ? current + '\n\n' + para : para
    } else {
      if (current) chunks.push(current)
      // Если параграф сам по себе больше чанка — режем по предложениям
      if (para.length > CHUNK_SIZE) {
        const sentences = para.split(/(?<=[.!?])\s+/)
        let sub = ''
        for (const s of sentences) {
          if (sub.length + s.length + 1 <= CHUNK_SIZE) {
            sub = sub ? sub + ' ' + s : s
          } else {
            if (sub) chunks.push(sub)
            sub = s
          }
        }
        if (sub) current = sub
        else current = ''
      } else {
        // Добавляем overlap из конца предыдущего чанка
        const overlap = current.slice(-OVERLAP)
        current = overlap ? overlap + '\n\n' + para : para
      }
    }
  }
  if (current) chunks.push(current)

  return chunks.filter(c => c.length > 50)
}

/** Извлечь секцию из заголовков (строки вида == ТЕКСТ ==) */
function extractSection(chunk: string): string {
  const match = chunk.match(/^==\s*(.+?)\s*==/)
  return match ? match[1] : ''
}

/** Читать текстовый файл */
async function readTxtFile(filePath: string): Promise<string> {
  const buf = await readFile(filePath)
  return buf.toString('utf-8')
}

/** Читать docx файл через mammoth */
async function readDocxFile(filePath: string): Promise<string> {
  // Динамический импорт mammoth (устанавливается отдельно: npm install mammoth)
  try {
    const require = createRequire(import.meta.url)
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mammoth = require('mammoth')
    const result = await mammoth.extractRawText({ path: filePath })
    return result.value
  } catch {
    throw new Error('Пакет mammoth не установлен. Запустите: npm install mammoth --save-dev')
  }
}

async function indexFile(filePath: string): Promise<void> {
  const filename = basename(filePath)
  const ext = extname(filePath).toLowerCase()

  // Читаем файл
  let text: string
  if (ext === '.txt') {
    text = await readTxtFile(filePath)
  } else if (ext === '.docx') {
    text = await readDocxFile(filePath)
  } else {
    console.log(`  Пропускаем ${filename} (неподдерживаемый формат)`)
    return
  }

  // Вычисляем хэш
  const hash = createHash('md5').update(text).digest('hex')

  // Проверяем, изменился ли документ
  const existing = await prisma.knowledgeChunk.findFirst({ where: { docTitle: filename } })
  if (existing?.docHash === hash) {
    console.log(`  Пропускаем ${filename} (не изменился)`)
    return
  }

  // Удаляем старые чанки
  if (existing) {
    const deleted = await prisma.knowledgeChunk.deleteMany({ where: { docTitle: filename } })
    console.log(`  Удалено ${deleted.count} старых чанков для ${filename}`)
  }

  // Нарезаем на чанки
  const rawChunks = splitIntoChunks(text)
  const { docType, position } = detectDocType(filename)
  console.log(`  Нарезано ${rawChunks.length} чанков для ${filename}`)

  // Генерируем эмбеддинги и сохраняем
  let saved = 0
  for (let i = 0; i < rawChunks.length; i++) {
    const content = rawChunks[i]
    const embedding = await getDocumentEmbedding(content)
    if (!embedding) {
      console.error(`  Ошибка эмбеддинга для чанка ${i} — проверьте OPENAI_API_KEY`)
      continue
    }

    const section = extractSection(content)

    await prisma.knowledgeChunk.create({
      data: {
        id: `${filename}-${i}-${Date.now()}`,
        content,
        embedding: JSON.stringify(embedding),
        docTitle: filename,
        docType,
        section,
        position,
        docHash: hash,
        chunkIdx: i,
        createdAt: new Date().toISOString(),
      },
    })
    saved++
    process.stdout.write(`\r  Сохранено: ${saved}/${rawChunks.length}`)
  }
  console.log(`\n  Готово: ${filename} → ${saved} чанков`)
}

async function main() {
  console.log('=== Индексация базы знаний ===')
  console.log(`Папка с документами: ${DOCS_DIR}\n`)

  let files: string[]
  try {
    files = await readdir(DOCS_DIR)
  } catch {
    console.error(`ОШИБКА: Папка ${DOCS_DIR} не найдена`)
    process.exit(1)
  }

  const supported = files.filter(f => ['.txt', '.docx'].includes(extname(f).toLowerCase()))
  if (supported.length === 0) {
    console.log('Нет файлов для индексации (.txt или .docx)')
    process.exit(0)
  }

  console.log(`Найдено файлов: ${supported.length}\n`)

  for (const file of supported) {
    console.log(`Обрабатываем: ${file}`)
    await indexFile(join(DOCS_DIR, file))
  }

  const total = await prisma.knowledgeChunk.count()
  console.log(`\n=== Готово. Всего чанков в базе: ${total} ===`)
  await prisma.$disconnect()
}

main().catch(err => {
  console.error('Критическая ошибка:', err)
  prisma.$disconnect()
  process.exit(1)
})
