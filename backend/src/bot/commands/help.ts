import { type BotContext } from '../context.js'
import { mainMenuKeyboard } from '../keyboards/mainMenu.js'

export async function handleHelp(ctx: BotContext): Promise<void> {
  await ctx.reply(
    '📖 <b>Доступные команды:</b>\n\n' +
    '/задачи — мои активные задачи\n' +
    '/новаязадача — создать задачу\n' +
    '/новаявстреча — запланировать встречу\n' +
    '/заметка — заметка о клиенте\n' +
    '/статус — проверить привязку аккаунта\n' +
    '/отмена — отменить текущий диалог\n' +
    '/помощь — эта справка',
    { parse_mode: 'HTML', reply_markup: mainMenuKeyboard() },
  )
}
