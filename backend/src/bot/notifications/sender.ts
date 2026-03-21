import { logger } from '../../lib/logger.js'

let botApi: { sendMessage: (chatId: string | number, text: string, options?: Record<string, unknown>) => Promise<unknown> } | null = null

/** Регистрируется при создании бота в bot/index.ts */
export function registerBotApi(api: typeof botApi): void {
  botApi = api
}

/** Отправляет HTML-сообщение в Telegram. Никогда не бросает исключение. */
export async function sendTelegramMessage(chatId: string, text: string): Promise<void> {
  if (!botApi) return
  try {
    await botApi.sendMessage(chatId, text, { parse_mode: 'HTML' })
  } catch (err) {
    logger.warn('telegram_send_failed', { chatId, error: (err as Error).message })
  }
}
