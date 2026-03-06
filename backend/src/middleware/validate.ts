import { Request, Response, NextFunction } from 'express'

type FieldType = 'string' | 'number' | 'boolean'

interface FieldRule {
  required?: boolean
  type?: FieldType
  minLength?: number
  maxLength?: number
  min?: number
  max?: number
  enum?: string[]
  isEmail?: boolean
  isIso?: boolean  // ISO date string
  trim?: boolean
}

type Schema = Record<string, FieldRule>

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const ISO_RE = /^\d{4}-\d{2}-\d{2}(T[\d:.Z+-]+)?$/

function validateField(key: string, value: unknown, rule: FieldRule): string | null {
  if (value === undefined || value === null || value === '') {
    if (rule.required) return `Поле "${key}" обязательно`
    return null
  }

  if (rule.type === 'number') {
    const n = Number(value)
    if (isNaN(n)) return `Поле "${key}" должно быть числом`
    if (rule.min !== undefined && n < rule.min) return `Поле "${key}" не может быть меньше ${rule.min}`
    if (rule.max !== undefined && n > rule.max) return `Поле "${key}" не может быть больше ${rule.max}`
    return null
  }

  if (rule.type === 'string' || rule.isEmail || rule.isIso || rule.enum || rule.minLength || rule.maxLength) {
    if (typeof value !== 'string') return `Поле "${key}" должно быть строкой`
    const v = rule.trim ? value.trim() : value
    if (rule.minLength !== undefined && v.length < rule.minLength) return `Поле "${key}" должно содержать не менее ${rule.minLength} символов`
    if (rule.maxLength !== undefined && v.length > rule.maxLength) return `Поле "${key}" не может превышать ${rule.maxLength} символов`
    if (rule.isEmail && !EMAIL_RE.test(v)) return `Поле "${key}" должно быть корректным email-адресом`
    if (rule.isIso && !ISO_RE.test(v)) return `Поле "${key}" должно быть датой в формате ISO (YYYY-MM-DD)`
    if (rule.enum && !rule.enum.includes(v)) return `Поле "${key}" должно быть одним из: ${rule.enum.join(', ')}`
  }

  return null
}

/**
 * Middleware factory. Validates req.body against a schema.
 * Trims string fields where rule.trim === true before validation.
 * Mutates req.body in-place (trimmed values).
 */
export function validate(schema: Schema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const errors: string[] = []

    for (const [key, rule] of Object.entries(schema)) {
      const value = req.body?.[key]

      // Trim in place
      if (rule.trim && typeof value === 'string') {
        req.body[key] = value.trim()
      }

      const error = validateField(key, req.body?.[key], rule)
      if (error) errors.push(error)
    }

    if (errors.length > 0) {
      res.status(400).json({ error: errors[0], errors })
      return
    }

    next()
  }
}
