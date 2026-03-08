import { describe, it, expect } from 'vitest'
import { parseTags, serializeTags, fmtClient, canView, ownerFilter } from '../lib/helpers.js'

// ─────────────────────────────────────────────
// parseTags
// ─────────────────────────────────────────────
describe('parseTags', () => {
  it('парсит корректный JSON-массив тегов', () => {
    expect(parseTags('["vip","новый"]')).toEqual(['vip', 'новый'])
  })

  it('возвращает пустой массив для пустого JSON-массива', () => {
    expect(parseTags('[]')).toEqual([])
  })

  it('возвращает пустой массив при невалидном JSON', () => {
    expect(parseTags('not-json')).toEqual([])
  })

  it('возвращает пустой массив при пустой строке', () => {
    expect(parseTags('')).toEqual([])
  })

  it('возвращает пустой массив при частично сломанном JSON', () => {
    expect(parseTags('["vip",')).toEqual([])
  })
})

// ─────────────────────────────────────────────
// serializeTags
// ─────────────────────────────────────────────
describe('serializeTags', () => {
  it('сериализует массив тегов в JSON-строку', () => {
    expect(serializeTags(['vip', 'новый'])).toBe('["vip","новый"]')
  })

  it('сериализует пустой массив', () => {
    expect(serializeTags([])).toBe('[]')
  })

  it('возвращает "[]" если передан undefined', () => {
    expect(serializeTags(undefined)).toBe('[]')
  })

  it('сериализует массив из одного тега', () => {
    expect(serializeTags(['vip'])).toBe('["vip"]')
  })
})

// ─────────────────────────────────────────────
// fmtClient
// ─────────────────────────────────────────────
describe('fmtClient', () => {
  it('преобразует строку тегов из БД в массив', () => {
    const row = {
      id: 'c1', firstName: 'Иван', lastName: 'Петров',
      status: 'active', managerId: 'u1', createdAt: '2024-01-01',
      tags: '["vip","b2b"]',
    }
    const client = fmtClient(row)
    expect(client.tags).toEqual(['vip', 'b2b'])
  })

  it('возвращает пустой массив тегов при пустом JSON', () => {
    const row = {
      id: 'c2', firstName: 'Анна', lastName: 'Иванова',
      status: 'lead', managerId: 'u1', createdAt: '2024-01-01',
      tags: '[]',
    }
    expect(fmtClient(row).tags).toEqual([])
  })

  it('возвращает пустой массив тегов при невалидном JSON в БД', () => {
    const row = {
      id: 'c3', firstName: 'Тест', lastName: 'Тестов',
      status: 'lead', managerId: 'u1', createdAt: '2024-01-01',
      tags: '{broken json',  // невалидный JSON → JSON.parse бросает → вернёт []
    }
    expect(fmtClient(row).tags).toEqual([])
  })

  it('сохраняет все остальные поля без изменений', () => {
    const row = {
      id: 'c4', firstName: 'Дмитрий', lastName: 'Смирнов',
      status: 'regular', managerId: 'u2', createdAt: '2024-06-01',
      email: 'dmitry@test.ru', tags: '[]',
    }
    const client = fmtClient(row)
    expect(client.id).toBe('c4')
    expect(client.email).toBe('dmitry@test.ru')
    expect(client.managerId).toBe('u2')
  })
})

// ─────────────────────────────────────────────
// canView
// ─────────────────────────────────────────────
describe('canView', () => {
  it('admin видит любого пользователя', () => {
    expect(canView('admin', 'u1', 'u2')).toBe(true)
  })

  it('supervisor видит любого пользователя', () => {
    expect(canView('supervisor', 'u3', 'u1')).toBe(true)
  })

  it('менеджер видит самого себя', () => {
    expect(canView('manager', 'u1', 'u1')).toBe(true)
  })

  it('менеджер не видит другого менеджера', () => {
    expect(canView('manager', 'u1', 'u2')).toBe(false)
  })

  it('supervisor видит своих же данных (не только чужих)', () => {
    expect(canView('supervisor', 'u3', 'u3')).toBe(true)
  })
})

// ─────────────────────────────────────────────
// ownerFilter
// ─────────────────────────────────────────────
describe('ownerFilter', () => {
  it('менеджер получает фильтр по managerId', () => {
    expect(ownerFilter('manager', 'u1')).toEqual({ managerId: 'u1' })
  })

  it('supervisor получает пустой объект (видит всё)', () => {
    expect(ownerFilter('supervisor', 'u3')).toEqual({})
  })

  it('admin получает пустой объект (видит всё)', () => {
    expect(ownerFilter('admin', 'u4')).toEqual({})
  })

  it('использует кастомное имя поля', () => {
    expect(ownerFilter('manager', 'u1', 'assigneeId')).toEqual({ assigneeId: 'u1' })
  })

  it('supervisor с кастомным полем всё равно возвращает пустой объект', () => {
    expect(ownerFilter('supervisor', 'u3', 'assigneeId')).toEqual({})
  })
})
