import { InlineKeyboard } from 'grammy'
import prisma from '../../lib/prisma.js'

export async function clientSelectKeyboard(managerId: string, role: string): Promise<InlineKeyboard> {
  const where = (role === 'manager') ? { managerId } : {}
  const clients = await prisma.client.findMany({
    where: { ...where, status: { not: 'archived' } },
    orderBy: { lastContactAt: 'desc' },
    take: 10,
    select: { id: true, firstName: true, lastName: true },
  })

  const kb = new InlineKeyboard()
  for (const c of clients) {
    kb.text(`${c.firstName} ${c.lastName}`, `client:${c.id}`).row()
  }
  kb.text('⏭ Пропустить', 'client:skip')
  return kb
}
