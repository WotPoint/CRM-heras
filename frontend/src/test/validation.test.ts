import { describe, it, expect } from 'vitest'
import {
  validatePassword,
  validatePasswordConfirm,
  validatePhone,
  validateEmail,
  validateName,
  validateComment,
} from '@/utils/validation'

// ─────────────────────────────────────────────
// validatePassword
// ─────────────────────────────────────────────
describe('validatePassword', () => {
  it('принимает пароль длиной ровно 8 символов', () => {
    expect(validatePassword('12345678')).toBeNull()
  })

  it('принимает длинный пароль', () => {
    expect(validatePassword('SuperSecurePassword!2024')).toBeNull()
  })

  it('отклоняет пустую строку', () => {
    expect(validatePassword('')).toBe('Введите пароль')
  })

  it('отклоняет пароль из 7 символов (граница минимума)', () => {
    expect(validatePassword('1234567')).toBe('Минимум 8 символов')
  })

  it('отклоняет пароль из 1 символа', () => {
    expect(validatePassword('x')).toBe('Минимум 8 символов')
  })
})

// ─────────────────────────────────────────────
// validatePasswordConfirm
// ─────────────────────────────────────────────
describe('validatePasswordConfirm', () => {
  it('принимает совпадающие пароли', () => {
    expect(validatePasswordConfirm('secret123', 'secret123')).toBeNull()
  })

  it('отклоняет пустое подтверждение', () => {
    expect(validatePasswordConfirm('secret123', '')).toBe('Подтвердите новый пароль')
  })

  it('отклоняет несовпадающие пароли', () => {
    expect(validatePasswordConfirm('secret123', 'secret456')).toBe('Пароли не совпадают')
  })

  it('отклоняет пароль с другим регистром (чувствителен к регистру)', () => {
    expect(validatePasswordConfirm('Secret123', 'secret123')).toBe('Пароли не совпадают')
  })
})

// ─────────────────────────────────────────────
// validatePhone
// ─────────────────────────────────────────────
describe('validatePhone', () => {
  it('принимает пустое поле (телефон необязателен)', () => {
    expect(validatePhone('')).toBeNull()
  })

  it('принимает 11-значный номер в форматированном виде', () => {
    expect(validatePhone('+7 (900) 123-45-67')).toBeNull()
  })

  it('принимает 10-значный номер без кода страны', () => {
    expect(validatePhone('9001234567')).toBeNull()
  })

  it('принимает 12-значный номер с кодом +7 без разделителей', () => {
    expect(validatePhone('79001234567')).toBeNull()
  })

  it('отклоняет номер из 9 цифр (меньше минимума)', () => {
    expect(validatePhone('900123456')).toBe('Введите корректный номер (10–11 цифр)')
  })

  it('отклоняет номер из 13 цифр (больше максимума)', () => {
    expect(validatePhone('1234567890123')).toBe('Введите корректный номер (10–11 цифр)')
  })

  it('корректно игнорирует пробелы, тире и скобки при подсчёте цифр', () => {
    expect(validatePhone('+7 (999) 999-99-99')).toBeNull()
  })
})

// ─────────────────────────────────────────────
// validateEmail
// ─────────────────────────────────────────────
describe('validateEmail', () => {
  it('принимает пустое поле (email необязателен)', () => {
    expect(validateEmail('')).toBeNull()
  })

  it('принимает корректный email', () => {
    expect(validateEmail('user@example.com')).toBeNull()
  })

  it('принимает email с поддоменом', () => {
    expect(validateEmail('anna@crm.company.ru')).toBeNull()
  })

  it('отклоняет строку без символа @', () => {
    expect(validateEmail('userexample.com')).toBe('Введите корректный email')
  })

  it('отклоняет строку без домена после @', () => {
    expect(validateEmail('user@')).toBe('Введите корректный email')
  })

  it('отклоняет строку без точки в домене', () => {
    expect(validateEmail('user@domain')).toBe('Введите корректный email')
  })

  it('отклоняет строку только из @', () => {
    expect(validateEmail('@')).toBe('Введите корректный email')
  })
})

// ─────────────────────────────────────────────
// validateName
// ─────────────────────────────────────────────
describe('validateName', () => {
  it('принимает обычное имя', () => {
    expect(validateName('Иван')).toBeNull()
  })

  it('принимает имя ровно из 2 символов (граница минимума)', () => {
    expect(validateName('Ли')).toBeNull()
  })

  it('принимает длинное имя', () => {
    expect(validateName('Александра-Мария')).toBeNull()
  })

  it('отклоняет пустую строку', () => {
    expect(validateName('')).toBe('Поле обязательно')
  })

  it('отклоняет строку только из пробелов', () => {
    expect(validateName('   ')).toBe('Поле обязательно')
  })

  it('отклоняет имя из 1 символа (меньше минимума)', () => {
    expect(validateName('А')).toBe('Минимум 2 символа')
  })

  it('отклоняет имя из 1 значимого символа, окружённого пробелами', () => {
    expect(validateName(' А ')).toBe('Минимум 2 символа')
  })
})

// ─────────────────────────────────────────────
// validateComment
// ─────────────────────────────────────────────
describe('validateComment', () => {
  it('принимает пустой комментарий', () => {
    expect(validateComment('')).toBeNull()
  })

  it('принимает комментарий ровно в 500 символов (граница максимума)', () => {
    expect(validateComment('а'.repeat(500))).toBeNull()
  })

  it('принимает короткий комментарий', () => {
    expect(validateComment('Обычный комментарий')).toBeNull()
  })

  it('отклоняет комментарий из 501 символа (сверх лимита)', () => {
    expect(validateComment('а'.repeat(501))).toBe('Максимум 500 символов')
  })

  it('отклоняет очень длинный комментарий', () => {
    expect(validateComment('x'.repeat(1000))).toBe('Максимум 500 символов')
  })
})
