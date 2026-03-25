/**
 * Тестирование качества RAG-поиска.
 * Запуск: npx tsx src/scripts/testRag.ts
 *
 * Запускать ПОСЛЕ индексации (indexDocs.ts).
 * Выводит найденные чанки и similarity score для каждого теста.
 */

import prisma from '../lib/prisma.js'
import { retrieveKnowledge } from '../bot/llm/retrieveKnowledge.js'

// Тестовые вопросы — основаны на содержимом заглушек
const TEST_QUERIES = [
  { query: 'Сколько дней лид может оставаться без контакта?', expectedDoc: 'регламент' },
  { query: 'Какие статусы есть у клиентов?', expectedDoc: 'регламент' },
  { query: 'Что нужно делать после отправки коммерческого предложения?', expectedDoc: 'регламент' },
  { query: 'Сколько звонков должен делать менеджер в месяц?', expectedDoc: 'регламент' },
  { query: 'Обязанности менеджера по продажам', expectedDoc: 'должностная_инструкция' },
  { query: 'Когда проводится еженедельная планёрка?', expectedDoc: 'должностная_инструкция' },
  { query: 'Как рассчитывается KPI менеджера?', expectedDoc: 'должностная_инструкция' },
  { query: 'Можно ли работать удалённо?', expectedDoc: 'должностная_инструкция' },
  { query: 'Что делать если клиент не отвечает на КП?', expectedDoc: 'регламент' },
  { query: 'Ответственность за передачу данных клиентов', expectedDoc: 'должностная_инструкция' },
]

async function main() {
  console.log('=== Тест RAG-поиска ===\n')

  const chunkCount = await prisma.knowledgeChunk.count()
  if (chunkCount === 0) {
    console.error('База знаний пуста. Запустите: npx tsx src/scripts/indexDocs.ts')
    process.exit(1)
  }
  console.log(`Чанков в базе: ${chunkCount}\n`)

  let passed = 0

  for (const test of TEST_QUERIES) {
    console.log(`Вопрос: "${test.query}"`)
    const results = await retrieveKnowledge(test.query)

    if (!results || results.length === 0) {
      console.log('  РЕЗУЛЬТАТ: не найдено ❌\n')
      continue
    }

    const top = results[0]
    const scoreOk = top.score >= 0.7
    const docOk = top.docTitle.toLowerCase().includes(test.expectedDoc)

    console.log(`  Топ-1: [${top.docTitle}] score=${top.score.toFixed(3)} ${scoreOk ? '✅' : '⚠️'}`)
    console.log(`  Текст: ${top.content.slice(0, 120).replace(/\n/g, ' ')}...`)
    if (results.length > 1) {
      console.log(`  Топ-2: [${results[1].docTitle}] score=${results[1].score.toFixed(3)}`)
    }

    if (scoreOk && docOk) {
      console.log('  РЕЗУЛЬТАТ: OK ✅')
      passed++
    } else if (scoreOk) {
      console.log(`  РЕЗУЛЬТАТ: Score OK, но документ не тот (ожидался: ${test.expectedDoc}) ⚠️`)
    } else {
      console.log(`  РЕЗУЛЬТАТ: Score низкий (< 0.7) ❌`)
    }
    console.log()
  }

  console.log(`=== Итого: ${passed}/${TEST_QUERIES.length} тестов прошли ===`)

  if (passed < TEST_QUERIES.length * 0.7) {
    console.log('\nРекомендации при плохих результатах:')
    console.log('  - Уменьшить CHUNK_SIZE в indexDocs.ts (попробовать 800-1000)')
    console.log('  - Увеличить OVERLAP (попробовать 200-300)')
    console.log('  - Снизить MIN_SCORE в retrieveKnowledge.ts (попробовать 0.5)')
  }

  await prisma.$disconnect()
}

main().catch(err => {
  console.error('Ошибка:', err)
  prisma.$disconnect()
  process.exit(1)
})
