import { InlineKeyboard } from 'grammy'

export function mainMenuKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text('📝 Новая задача', 'menu:task').text('📅 Новая встреча', 'menu:activity').row()
    .text('📋 Заметка о клиенте', 'menu:note').text('✅ Мои задачи', 'menu:tasks')
}
