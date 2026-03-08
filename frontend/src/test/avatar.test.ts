import { describe, it, expect } from 'vitest'
import { getInitials, getAvatarColor } from '@/utils/avatar'
import { AVATAR_COLORS } from '@/constants/colors'

// ─────────────────────────────────────────────
// getInitials
// ─────────────────────────────────────────────
describe('getInitials', () => {
  it('берёт первые буквы имени и фамилии', () => {
    expect(getInitials('Иван Петров')).toBe('ИП')
  })

  it('возвращает не более 2 символов при длинном имени', () => {
    expect(getInitials('Анна Мария Владимирова')).toBe('АМ')
  })

  it('переводит инициалы в верхний регистр', () => {
    expect(getInitials('иван петров')).toBe('ИП')
  })

  it('возвращает 1 символ если передано одно слово', () => {
    expect(getInitials('Администратор')).toBe('А')
  })

  it('корректно обрабатывает имена с двойным именем через пробел', () => {
    expect(getInitials('Анна-Мария Сергеева')).toBe('АС')
  })

  it('возвращает пустую строку для пустого имени', () => {
    expect(getInitials('')).toBe('')
  })

  it('возвращает 2 символа для имени из двух однобуквенных слов', () => {
    expect(getInitials('A B')).toBe('AB')
  })
})

// ─────────────────────────────────────────────
// getAvatarColor
// ─────────────────────────────────────────────
describe('getAvatarColor', () => {
  it('возвращает строку цвета в hex-формате', () => {
    const color = getAvatarColor('u1')
    expect(color).toMatch(/^#[0-9a-fA-F]{6}$/)
  })

  it('возвращает один из допустимых цветов палитры', () => {
    const color = getAvatarColor('u1')
    expect(AVATAR_COLORS).toContain(color)
  })

  it('одинаковый id всегда даёт одинаковый цвет (детерминированность)', () => {
    expect(getAvatarColor('user-abc')).toBe(getAvatarColor('user-abc'))
  })

  it('разные id могут давать разные цвета', () => {
    const colors = new Set(['u1', 'u2', 'u3', 'u4', 'u5', 'u6'].map(getAvatarColor))
    // Не все 6 id обязаны дать разные цвета (палитра 6 цветов),
    // но хотя бы 2 разных цвета должно быть в наборе из 6 пользователей
    expect(colors.size).toBeGreaterThanOrEqual(2)
  })

  it('корректно обрабатывает пустой id (не падает)', () => {
    expect(() => getAvatarColor('')).not.toThrow()
    expect(AVATAR_COLORS).toContain(getAvatarColor(''))
  })

  it('корректно обрабатывает очень длинный id', () => {
    const longId = 'x'.repeat(1000)
    expect(AVATAR_COLORS).toContain(getAvatarColor(longId))
  })

  it('индекс цвета не выходит за пределы палитры', () => {
    const testIds = ['admin', 'manager', 'supervisor', 'u1', 'u2', 'u3', 'u4']
    testIds.forEach((id) => {
      expect(AVATAR_COLORS).toContain(getAvatarColor(id))
    })
  })
})
