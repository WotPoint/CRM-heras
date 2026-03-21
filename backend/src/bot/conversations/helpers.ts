import { type Conversation } from '@grammyjs/conversations'
import { type BotContext } from '../context.js'

/**
 * Ждёт текстового сообщения. Повторяет подсказку при нетекстовом вводе или пустой строке.
 * Возвращает null, если пользователь ввёл /команду (сигнал отмены).
 */
export async function askText(
  conversation: Conversation<BotContext, BotContext>,
  reprompt: string,
  options?: { maxLength?: number },
): Promise<string | null> {
  const max = options?.maxLength ?? 2000
  while (true) {
    const next = await conversation.wait()
    const text = next.message?.text?.trim()

    if (text?.startsWith('/')) {
      await next.reply('Диалог завершён. Используйте /помощь для списка команд.')
      return null
    }
    if (!next.message?.text || !text) {
      await next.reply(`⚠️ Пожалуйста, отправьте текст. ${reprompt}`)
      continue
    }
    return text.slice(0, max)
  }
}

/**
 * Ждёт нажатия инлайн-кнопки, data которой совпадает с паттерном.
 * Если пользователь шлёт текст — напоминает нажать кнопку.
 * Возвращает null, если пользователь ввёл /команду.
 */
export async function waitCallback(
  conversation: Conversation<BotContext, BotContext>,
  pattern: RegExp,
  reminder = '👆 Нажмите одну из кнопок выше.',
): Promise<{ data: string; ctx: BotContext } | null> {
  while (true) {
    const next = await conversation.wait()

    if (next.message?.text?.startsWith('/')) {
      await next.reply('Диалог завершён. Используйте /помощь для списка команд.')
      return null
    }
    if (next.message) {
      await next.reply(reminder)
      continue
    }
    if (next.callbackQuery?.data && pattern.test(next.callbackQuery.data)) {
      return { data: next.callbackQuery.data, ctx: next }
    }
    // нераспознанный callback — молча игнорируем
  }
}
