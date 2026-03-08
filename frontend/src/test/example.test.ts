import { describe, it, expect } from 'vitest'

describe('Vitest setup', () => {
  it('базовая арифметика работает', () => {
    expect(2 + 2).toBe(4)
  })

  it('строки корректно сравниваются', () => {
    expect('CRM-heras'.toLowerCase()).toBe('crm-heras')
  })

  it('массивы работают правильно', () => {
    const statuses = ['new', 'active', 'inactive']
    expect(statuses).toHaveLength(3)
    expect(statuses).toContain('active')
  })
})
