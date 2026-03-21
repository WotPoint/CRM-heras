import { type BotContext } from '../context.js'
import prisma from '../../lib/prisma.js'

/** Guard: пропускает только пользователей с привязанным аккаунтом CRM */
export async function requireLinked(ctx: BotContext, next: () => Promise<void>): Promise<void> {
  const chatId = String(ctx.chat?.id ?? '')
  const user = await prisma.user.findFirst({ where: { telegramChatId: chatId } })

  if (!user) {
    await ctx.reply('❌ Аккаунт CRM не привязан. Откройте CRM → Настройки → Подключить Telegram.')
    return
  }

  await next()
}
