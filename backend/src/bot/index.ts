import { Bot, session } from 'grammy'
import { conversations, createConversation } from '@grammyjs/conversations'
import { type BotContext } from './context.js'
import { initialSessionData } from './session.js'
import { registerBotApi } from './notifications/sender.js'
import prisma from '../lib/prisma.js'

// Commands
import { handleStart } from './commands/start.js'
import { handleHelp } from './commands/help.js'
import { handleTasks } from './commands/tasks.js'
import { handleStatus } from './commands/status.js'

// Conversations
import { createTaskConversation } from './conversations/createTask.js'
import { createActivityConversation } from './conversations/createActivity.js'
import { quickNoteConversation } from './conversations/quickNote.js'

// Keyboards
import { mainMenuKeyboard } from './keyboards/mainMenu.js'

// Middleware
import { requireLinked } from './middleware/requireLinked.js'

// LLM
import { handleFreeText } from './llm/handleFreeText.js'
import { getGroqClient } from './llm/client.js'

let botInstance: Bot<BotContext> | null = null

export function getBotInstance(): Bot<BotContext> {
  if (!botInstance) throw new Error('Bot not initialized')
  return botInstance
}

export function createBot(): Bot<BotContext> {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) throw new Error('TELEGRAM_BOT_TOKEN is not set')

  const bot = new Bot<BotContext>(token)
  botInstance = bot

  // Регистрируем API для отправки уведомлений
  registerBotApi({
    sendMessage: (chatId, text, options) =>
      bot.api.sendMessage(chatId as number, text, options as Parameters<typeof bot.api.sendMessage>[2]),
  })

  // Middleware: session + conversations
  bot.use(session({ initial: initialSessionData }))
  bot.use(conversations())

  // Регистрация сценариев
  bot.use(createConversation(createTaskConversation, 'createTask'))
  bot.use(createConversation(createActivityConversation, 'createActivity'))
  bot.use(createConversation(quickNoteConversation, 'quickNote'))

  // Команды
  bot.command('start', handleStart)
  bot.command(['help', 'помощь'], handleHelp)
  bot.command(['статус', 'status'], handleStatus)

  // Команды, требующие привязки
  bot.command(['задачи', 'tasks'], requireLinked, handleTasks)

  bot.command(['новаязадача', 'newtask'], requireLinked, async (ctx) => {
    await ctx.conversation.enter('createTask')
  })
  bot.command(['новаявстреча', 'newactivity'], requireLinked, async (ctx) => {
    await ctx.conversation.enter('createActivity')
  })
  bot.command(['заметка', 'note'], requireLinked, async (ctx) => {
    await ctx.conversation.enter('quickNote')
  })
  bot.command(['отмена', 'cancel'], async (ctx) => {
    for (const name of ['createTask', 'createActivity', 'quickNote']) {
      await ctx.conversation.exit(name).catch(() => undefined)
    }
    await ctx.reply('Отменено.', { reply_markup: mainMenuKeyboard() })
  })

  // Inline-кнопки главного меню
  bot.callbackQuery('menu:task', requireLinked, async (ctx) => {
    await ctx.answerCallbackQuery()
    await ctx.conversation.enter('createTask')
  })
  bot.callbackQuery('menu:activity', requireLinked, async (ctx) => {
    await ctx.answerCallbackQuery()
    await ctx.conversation.enter('createActivity')
  })
  bot.callbackQuery('menu:note', requireLinked, async (ctx) => {
    await ctx.answerCallbackQuery()
    await ctx.conversation.enter('quickNote')
  })
  bot.callbackQuery('menu:tasks', requireLinked, async (ctx) => {
    await ctx.answerCallbackQuery()
    await handleTasks(ctx)
  })

  // Fallback: сначала пробуем LLM, иначе показываем меню
  bot.on('message', requireLinked, async (ctx) => {
    if (getGroqClient() && ctx.message?.text && !ctx.message.text.startsWith('/')) {
      const chatId = String(ctx.chat!.id)
      const user = await prisma.user.findFirst({ where: { telegramChatId: chatId } })
      if (user) {
        const handled = await handleFreeText(ctx, { id: user.id, name: user.name, role: user.role })
        if (handled) return
      }
    }
    await ctx.reply('Что хотите сделать?', { reply_markup: mainMenuKeyboard() })
  })

  return bot
}
