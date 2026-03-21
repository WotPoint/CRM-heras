import { type BotContext } from '../context.js'
import { mainMenuKeyboard } from '../keyboards/mainMenu.js'
import prisma from '../../lib/prisma.js'
import { logger } from '../../lib/logger.js'

export async function handleStart(ctx: BotContext): Promise<void> {
  const token = ctx.match as string | undefined

  if (!token) {
    await ctx.reply(
      '👋 Привет! Я бот CRM-heras.\n\n' +
      'Чтобы получать уведомления и управлять задачами, привяжите аккаунт CRM:\n' +
      'Откройте CRM → Настройки → Подключить Telegram.',
    )
    return
  }

  // Ищем пользователя по токену
  const user = await prisma.user.findFirst({
    where: { telegramLinkToken: token },
  })

  if (!user || !user.telegramLinkExpiry || new Date(user.telegramLinkExpiry) < new Date()) {
    await ctx.reply('❌ Токен недействителен или истёк. Получите новый в настройках CRM.')
    return
  }

  const chatId = String(ctx.chat!.id)

  // Проверим: не занят ли этот chatId другим пользователем
  const existing = await prisma.user.findFirst({ where: { telegramChatId: chatId } })
  if (existing && existing.id !== user.id) {
    await ctx.reply('⚠️ Этот Telegram уже привязан к другому аккаунту CRM.')
    return
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      telegramChatId: chatId,
      telegramLinkedAt: new Date().toISOString(),
      telegramLinkToken: null,
      telegramLinkExpiry: null,
    },
  })

  logger.info('telegram.account_linked', { userId: user.id, chatId })

  await ctx.reply(
    `✅ Аккаунт CRM привязан!\n\nПривет, <b>${user.name}</b>! Теперь вы будете получать уведомления здесь.\n\n` +
    'Что хотите сделать?',
    { parse_mode: 'HTML', reply_markup: mainMenuKeyboard() },
  )
}
