import { InlineKeyboard } from 'grammy'

export function activityTypeKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text('📞 Звонок', 'atype:call').text('✉️ Email', 'atype:email').row()
    .text('🤝 Встреча', 'atype:meeting').text('📝 Заметка', 'atype:note')
}
