import { type BotContext } from '../context.js'
import prisma from '../../lib/prisma.js'

export async function handleStatus(ctx: BotContext): Promise<void> {
  const chatId = String(ctx.chat!.id)
  const user = await prisma.user.findFirst({ where: { telegramChatId: chatId } })

  if (!user) {
    await ctx.reply('❌ Аккаунт CRM не привязан. Перейдите в Настройки CRM → Подключить Telegram.')
    return
  }

  const linkedAt = user.telegramLinkedAt
    ? new Date(user.telegramLinkedAt).toLocaleDateString('ru-RU')
    : 'неизвестно'

  await ctx.reply(
    `✅ <b>Аккаунт привязан</b>\n\n👤 ${user.name}\n📧 ${user.email}\n📅 Привязан: ${linkedAt}`,
    { parse_mode: 'HTML' },
  )
}
