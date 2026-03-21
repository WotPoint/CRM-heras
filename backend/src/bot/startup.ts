import { type Bot } from 'grammy'
import { type BotContext } from './context.js'
import { registerWebhookHandler } from '../routes/telegram.js'
import { logger } from '../lib/logger.js'

export async function startBot(bot: Bot<BotContext>): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    const webhookUrl = process.env.TELEGRAM_WEBHOOK_URL
    if (!webhookUrl) {
      logger.warn('telegram_bot_webhook_url_missing', { note: 'Set TELEGRAM_WEBHOOK_URL for production' })
      return
    }

    await bot.init()  // обязательно перед handleUpdate в webhook-режиме

    const secret = process.env.TELEGRAM_WEBHOOK_SECRET
    await bot.api.setWebhook(webhookUrl, {
      secret_token: secret,
      allowed_updates: ['message', 'callback_query'],
    })

    // Регистрируем обработчик для Express-маршрута
    registerWebhookHandler((update) => bot.handleUpdate(update as Parameters<typeof bot.handleUpdate>[0]))

    logger.info('telegram_bot_webhook_set', { url: webhookUrl })
  } else {
    // Dev: long polling
    bot.start({
      allowed_updates: ['message', 'callback_query'],
      onStart: () => logger.info('telegram_bot_polling_started'),
    })
  }
}
