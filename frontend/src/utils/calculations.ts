/**
 * Чистые функции расчётов — извлечены из ReportsPage и других компонентов.
 */

/**
 * Конверсия: процент выигранных сделок среди закрытых.
 * Если закрытых нет — возвращает 0.
 */
export function calcConversionRate(wonCount: number, closedCount: number): number {
  if (closedCount <= 0) return 0
  return Math.round((wonCount / closedCount) * 100)
}

/**
 * Доля value от total в процентах (0–100, округление).
 * Если total = 0 — возвращает 0.
 */
export function calcPercent(value: number, total: number): number {
  if (total <= 0) return 0
  return Math.round((value / total) * 100)
}

/**
 * Сумма массива чисел.
 * null/undefined трактуется как 0.
 */
export function sumAmounts(amounts: (number | null | undefined)[]): number {
  return amounts.reduce<number>((acc, a) => acc + (a ?? 0), 0)
}

/**
 * Прогресс воронки: насколько данная ступень заполнена
 * относительно максимальной (в процентах).
 */
export function calcFunnelProgress(count: number, maxCount: number): number {
  if (maxCount <= 0) return 0
  return Math.round((count / maxCount) * 100)
}
