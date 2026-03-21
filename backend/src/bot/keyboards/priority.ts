import { InlineKeyboard } from 'grammy'

export function priorityKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text('🟢 Низкий', 'priority:low')
    .text('🟡 Средний', 'priority:medium')
    .text('🔴 Высокий', 'priority:high')
}
