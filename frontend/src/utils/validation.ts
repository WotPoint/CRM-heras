/**
 * Чистые функции валидации — извлечены из форм компонентов.
 * Возвращают строку с ошибкой или null (поле корректно).
 */

/** Пароль: обязателен, минимум 8 символов */
export function validatePassword(password: string): string | null {
  if (!password) return 'Введите пароль'
  if (password.length < 8) return 'Минимум 8 символов'
  return null
}

/**
 * Пароли совпадают.
 * Оба поля должны быть непустыми и равными.
 */
export function validatePasswordConfirm(password: string, confirm: string): string | null {
  if (!confirm) return 'Подтвердите новый пароль'
  if (password !== confirm) return 'Пароли не совпадают'
  return null
}

/**
 * Телефон: необязателен, но если задан — 10–11 цифр (рос. формат).
 * Нецифровые символы игнорируются.
 */
export function validatePhone(phone: string): string | null {
  if (!phone) return null
  const digits = phone.replace(/\D/g, '')
  if (digits.length < 10 || digits.length > 12)
    return 'Введите корректный номер (10–11 цифр)'
  return null
}

/** Email: необязателен, но если задан — должен соответствовать формату */
export function validateEmail(email: string): string | null {
  if (!email) return null
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!re.test(email)) return 'Введите корректный email'
  return null
}

/**
 * Имя / фамилия: обязательны, минимум 2 символа, не могут состоять только из пробелов.
 */
export function validateName(name: string): string | null {
  if (!name || !name.trim()) return 'Поле обязательно'
  if (name.trim().length < 2) return 'Минимум 2 символа'
  return null
}

/** Комментарий: необязателен, максимум 500 символов */
export function validateComment(comment: string): string | null {
  if (comment && comment.length > 500) return 'Максимум 500 символов'
  return null
}
