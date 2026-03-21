export interface SessionData {
  /** Активный разговор (grammy-conversations управляет этим автоматически) */
  __conversations?: Record<string, unknown>
  /** Временное хранилище черновика во время диалога */
  draft: Record<string, unknown>
}

export function initialSessionData(): SessionData {
  return { draft: {} }
}
