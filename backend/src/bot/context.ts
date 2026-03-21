import { type Context, type SessionFlavor } from 'grammy'
import { type ConversationFlavor } from '@grammyjs/conversations'
import type { SessionData } from './session.js'

type BaseContext = Context & SessionFlavor<SessionData>
export type BotContext = BaseContext & ConversationFlavor<BaseContext>
