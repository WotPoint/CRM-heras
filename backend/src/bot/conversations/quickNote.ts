import { type Conversation } from '@grammyjs/conversations'
import { InlineKeyboard } from 'grammy'
import { type BotContext } from '../context.js'
import { clientSelectKeyboard } from '../keyboards/clientSelect.js'
import { mainMenuKeyboard } from '../keyboards/mainMenu.js'
import prisma from '../../lib/prisma.js'
import { v4 as uuidv4 } from 'uuid'
import { logger } from '../../lib/logger.js'

export async function quickNoteConversation(
  conversation: Conversation<BotContext, BotContext>,
  ctx: BotContext,
): Promise<void> {
  const chatId = String(ctx.chat!.id)
  const user = await conversation.external(() =>
    prisma.user.findFirst({ where: { telegramChatId: chatId } })
  )
  if (!user) return

  // Шаг 1: Выбор клиента
  const clientKb = await conversation.external(() => clientSelectKeyboard(user.id, user.role))
  await ctx.reply('📋 <b>Заметка о клиенте</b>\n\nВыберите клиента (или /отмена):', {
    parse_mode: 'HTML',
    reply_markup: clientKb,
  })

  let clientId: string | null = null
  let clientName = ''

  while (!clientId) {
    const clientCtx = await conversation.wait()
    if (clientCtx.message?.text?.startsWith('/')) { await clientCtx.reply('Отменено.'); return }

    if (clientCtx.callbackQuery?.data?.startsWith('client:') && clientCtx.callbackQuery.data !== 'client:skip') {
      clientId = clientCtx.callbackQuery.data.split(':')[1]
      await clientCtx.answerCallbackQuery()
      const c = await conversation.external(() => prisma.client.findUnique({ where: { id: clientId! } }))
      if (c) clientName = `${c.firstName} ${c.lastName}`
    } else if (clientCtx.message?.text) {
      // Поиск по имени
      const search = clientCtx.message.text.trim()
      const found = await conversation.external(() =>
        prisma.client.findMany({
          where: {
            OR: [
              { firstName: { contains: search } },
              { lastName: { contains: search } },
            ],
            ...(user.role === 'manager' ? { managerId: user.id } : {}),
          },
          take: 8,
          select: { id: true, firstName: true, lastName: true },
        })
      )

      if (found.length === 0) {
        await clientCtx.reply('Клиенты не найдены. Попробуйте ещё раз или выберите из списка:',
          { reply_markup: clientKb })
      } else {
        const kb = new InlineKeyboard()
        for (const c of found) kb.text(`${c.firstName} ${c.lastName}`, `client:${c.id}`).row()
        await clientCtx.reply('Выберите клиента:', { reply_markup: kb })
      }
    }
  }

  // Шаг 2: Текст заметки
  await ctx.reply(`Введите текст заметки о клиенте <b>${clientName}</b>:`, { parse_mode: 'HTML' })
  const noteCtx = await conversation.wait()
  if (noteCtx.message?.text?.startsWith('/')) { await noteCtx.reply('Отменено.'); return }
  const text = noteCtx.message?.text?.trim().slice(0, 1000) ?? ''
  if (!text) { await noteCtx.reply('Отменено.'); return }

  // Шаг 3: Подтверждение
  const preview = text.length > 100 ? text.slice(0, 100) + '...' : text
  await noteCtx.reply(
    `📝 <b>Сохранить заметку?</b>\n\n👤 ${clientName}\n\n${preview}`,
    {
      parse_mode: 'HTML',
      reply_markup: new InlineKeyboard().text('✅ Сохранить', 'confirm:yes').text('❌ Отмена', 'confirm:no'),
    },
  )

  const confirmCtx = await conversation.waitForCallbackQuery(/^confirm:/)
  await confirmCtx.answerCallbackQuery()
  if (confirmCtx.callbackQuery.data === 'confirm:no') { await confirmCtx.reply('Отменено.'); return }

  const activity = await conversation.external(() =>
    prisma.activity.create({
      data: {
        id: uuidv4(),
        type: 'note',
        managerId: user.id,
        clientId,
        date: new Date().toISOString(),
        description: text,
        createdAt: new Date().toISOString(),
      },
    })
  )

  logger.info('note.created_via_telegram', { activityId: activity.id, userId: user.id, clientId })
  await confirmCtx.reply('✅ Заметка сохранена!', { reply_markup: mainMenuKeyboard() })
}
