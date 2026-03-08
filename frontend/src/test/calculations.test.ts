import { describe, it, expect } from 'vitest'
import {
  calcConversionRate,
  calcPercent,
  sumAmounts,
  calcFunnelProgress,
} from '@/utils/calculations'

// ─────────────────────────────────────────────
// calcConversionRate
// ─────────────────────────────────────────────
describe('calcConversionRate', () => {
  it('возвращает 100% когда все закрытые сделки выиграны', () => {
    expect(calcConversionRate(5, 5)).toBe(100)
  })

  it('возвращает 50% при равном соотношении выигранных и проигранных', () => {
    expect(calcConversionRate(3, 6)).toBe(50)
  })

  it('возвращает 0% когда нет выигранных сделок', () => {
    expect(calcConversionRate(0, 10)).toBe(0)
  })

  it('возвращает 0% когда нет закрытых сделок (деление на ноль)', () => {
    expect(calcConversionRate(0, 0)).toBe(0)
  })

  it('округляет результат до целого числа', () => {
    // 1/3 ≈ 33.33...% → 33
    expect(calcConversionRate(1, 3)).toBe(33)
  })

  it('возвращает 0% при отрицательном числе закрытых', () => {
    expect(calcConversionRate(5, -1)).toBe(0)
  })

  it('корректно считает конверсию для менеджера с 1 сделкой из 1', () => {
    expect(calcConversionRate(1, 1)).toBe(100)
  })
})

// ─────────────────────────────────────────────
// calcPercent
// ─────────────────────────────────────────────
describe('calcPercent', () => {
  it('возвращает 100% когда value равно total', () => {
    expect(calcPercent(50, 50)).toBe(100)
  })

  it('возвращает 50% когда value вдвое меньше total', () => {
    expect(calcPercent(25, 50)).toBe(50)
  })

  it('возвращает 0% при нулевом value', () => {
    expect(calcPercent(0, 100)).toBe(0)
  })

  it('возвращает 0% при нулевом total (деление на ноль)', () => {
    expect(calcPercent(5, 0)).toBe(0)
  })

  it('округляет до целого числа', () => {
    // 1/3 ≈ 33.33% → 33
    expect(calcPercent(1, 3)).toBe(33)
  })

  it('возвращает 0% при отрицательном total', () => {
    expect(calcPercent(10, -50)).toBe(0)
  })

  it('корректно считает долю лидов среди всех клиентов', () => {
    // 30 лидов из 120 клиентов = 25%
    expect(calcPercent(30, 120)).toBe(25)
  })
})

// ─────────────────────────────────────────────
// sumAmounts
// ─────────────────────────────────────────────
describe('sumAmounts', () => {
  it('суммирует обычный массив чисел', () => {
    expect(sumAmounts([100_000, 250_000, 50_000])).toBe(400_000)
  })

  it('возвращает 0 для пустого массива', () => {
    expect(sumAmounts([])).toBe(0)
  })

  it('трактует null как 0', () => {
    expect(sumAmounts([100_000, null, 50_000])).toBe(150_000)
  })

  it('трактует undefined как 0', () => {
    expect(sumAmounts([200_000, undefined, 300_000])).toBe(500_000)
  })

  it('обрабатывает массив из одного элемента', () => {
    expect(sumAmounts([999_999])).toBe(999_999)
  })

  it('обрабатывает массив целиком из null', () => {
    expect(sumAmounts([null, null, null])).toBe(0)
  })

  it('корректно суммирует крупные суммы (без потери точности)', () => {
    expect(sumAmounts([1_000_000, 2_000_000, 3_000_000])).toBe(6_000_000)
  })
})

// ─────────────────────────────────────────────
// calcFunnelProgress
// ─────────────────────────────────────────────
describe('calcFunnelProgress', () => {
  it('возвращает 100% для максимальной ступени воронки', () => {
    expect(calcFunnelProgress(10, 10)).toBe(100)
  })

  it('возвращает 50% для ступени вдвое меньше максимума', () => {
    expect(calcFunnelProgress(5, 10)).toBe(50)
  })

  it('возвращает 0% для пустой ступени', () => {
    expect(calcFunnelProgress(0, 10)).toBe(0)
  })

  it('возвращает 0% если максимум равен нулю', () => {
    expect(calcFunnelProgress(0, 0)).toBe(0)
  })

  it('округляет результат до целого числа', () => {
    // 2/3 ≈ 66.67% → 67
    expect(calcFunnelProgress(2, 3)).toBe(67)
  })
})
