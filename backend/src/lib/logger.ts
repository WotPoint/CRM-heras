/**
 * Structured JSON logger.
 * Outputs one JSON object per line to stdout (info/warn) or stderr (error).
 * Sensitive fields are automatically redacted.
 */

type Level = 'info' | 'warn' | 'error'

const SENSITIVE_KEYS = new Set([
  'password', 'currentPassword', 'newPassword', 'passwordHash',
  'token', 'secret', 'jwt', 'JWT_SECRET',
  'access_token', 'refresh_token',
  'code_verifier', 'codeVerifier',
  'authorization',
])

function redact(value: unknown, depth = 0): unknown {
  if (depth > 6 || value === null || typeof value !== 'object') return value
  if (Array.isArray(value)) return value.map((v) => redact(v, depth + 1))
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([k, v]) =>
      SENSITIVE_KEYS.has(k.toLowerCase()) ? [k, '[REDACTED]'] : [k, redact(v, depth + 1)]
    )
  )
}

function write(level: Level, msg: string, data?: Record<string, unknown>): void {
  const entry: Record<string, unknown> = {
    ts: new Date().toISOString(),
    level,
    msg,
    ...(data ? (redact(data) as Record<string, unknown>) : {}),
  }
  const line = JSON.stringify(entry) + '\n'
  if (level === 'error') process.stderr.write(line)
  else process.stdout.write(line)
}

export const logger = {
  info:  (msg: string, data?: Record<string, unknown>) => write('info',  msg, data),
  warn:  (msg: string, data?: Record<string, unknown>) => write('warn',  msg, data),
  error: (msg: string, data?: Record<string, unknown>) => write('error', msg, data),
}
