import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')
  const passwordHash = await bcrypt.hash('123456', 10)

  // Clear in reverse FK order
  await prisma.request.deleteMany()
  await prisma.task.deleteMany()
  await prisma.activity.deleteMany()
  await prisma.dealStatusChange.deleteMany()
  await prisma.deal.deleteMany()
  await prisma.client.deleteMany()
  await prisma.company.deleteMany()
  await prisma.user.deleteMany()

  // ─── Users ─────────────────────────────────────────────────────────────────
  // Create supervisor and admin first (no supervisorId dependency)
  await prisma.user.createMany({
    data: [
      {
        id: 'u3',
        name: 'Сергей Руководов',
        email: 'supervisor@crm.ru',
        phone: '+7 900 777-88-99',
        role: 'supervisor',
        isActive: true,
        passwordHash,
        mustChangePassword: false,
        createdAt: '2023-11-01T09:00:00',
        lastLoginAt: '2026-03-02T09:00:00',
      },
      {
        id: 'u4',
        name: 'Елена Администратова',
        email: 'admin@crm.ru',
        phone: '+7 900 000-11-22',
        role: 'admin',
        isActive: true,
        passwordHash,
        mustChangePassword: false,
        createdAt: '2023-10-01T09:00:00',
        lastLoginAt: '2026-03-02T08:00:00',
      },
    ],
  })

  // Create managers (supervisorId → u3)
  await prisma.user.createMany({
    data: [
      {
        id: 'u1',
        name: 'Анна Менеджерова',
        email: 'manager@crm.ru',
        phone: '+7 900 111-22-33',
        role: 'manager',
        isActive: true,
        passwordHash,
        mustChangePassword: false,
        createdAt: '2024-01-10T09:00:00',
        lastLoginAt: '2026-03-02T08:30:00',
        supervisorId: 'u3',
      },
      {
        id: 'u2',
        name: 'Дмитрий Продажников',
        email: 'manager2@crm.ru',
        phone: '+7 900 444-55-66',
        role: 'manager',
        isActive: true,
        passwordHash,
        mustChangePassword: false,
        createdAt: '2024-02-15T09:00:00',
        lastLoginAt: '2026-03-01T17:45:00',
        supervisorId: 'u3',
      },
    ],
  })

  // ─── Companies ──────────────────────────────────────────────────────────────
  await prisma.company.createMany({
    data: [
      {
        id: 'co1',
        name: 'ООО "Стройком"',
        inn: '7701234567',
        address: 'г. Москва, ул. Строителей, 12',
        phone: '+7 495 111-22-33',
        createdAt: '2025-11-15T10:00:00',
      },
      {
        id: 'co2',
        name: 'АО "ТехноТрейд"',
        inn: '7709876543',
        address: 'г. Москва, Ленинградский пр-т, 55',
        phone: '+7 495 444-55-66',
        createdAt: '2024-08-05T10:00:00',
      },
      {
        id: 'co3',
        name: 'ООО "Гермес"',
        inn: '7712345678',
        address: 'г. Санкт-Петербург, ул. Торговая, 8',
        phone: '+7 812 777-88-99',
        createdAt: '2026-02-01T09:00:00',
      },
    ],
  })

  // ─── Clients ────────────────────────────────────────────────────────────────
  await prisma.client.createMany({
    data: [
      {
        id: 'c1',
        firstName: 'Иван',
        lastName: 'Петров',
        middleName: 'Сергеевич',
        position: 'Директор по закупкам',
        company: 'ООО "Стройком"',
        companyId: 'co1',
        email: 'petrov@stroykom.ru',
        phone: '+7 916 123-45-67',
        status: 'active',
        managerId: 'u1',
        tags: JSON.stringify(['оптовик', 'строительство']),
        source: 'Звонок',
        createdAt: '2025-11-15T10:00:00',
        lastContactAt: '2026-02-28T14:30:00',
      },
      {
        id: 'c2',
        firstName: 'Мария',
        lastName: 'Сидорова',
        company: 'ИП Сидорова',
        email: 'sidorova@mail.ru',
        phone: '+7 925 987-65-43',
        status: 'lead',
        managerId: 'u1',
        tags: JSON.stringify(['розница']),
        source: 'Сайт',
        createdAt: '2026-01-20T09:00:00',
        lastContactAt: '2026-02-10T11:00:00',
      },
      {
        id: 'c3',
        firstName: 'Алексей',
        lastName: 'Козлов',
        middleName: 'Владимирович',
        position: 'Генеральный директор',
        company: 'АО "ТехноТрейд"',
        companyId: 'co2',
        email: 'kozlov@technotrade.ru',
        phone: '+7 903 555-44-33',
        status: 'regular',
        managerId: 'u1',
        tags: JSON.stringify(['опт', 'технологии']),
        source: 'Рекомендация',
        createdAt: '2024-08-05T10:00:00',
        lastContactAt: '2026-02-25T16:00:00',
      },
      {
        id: 'c4',
        firstName: 'Наталья',
        lastName: 'Иванова',
        email: 'ivanova@gmail.com',
        phone: '+7 912 222-11-00',
        status: 'active',
        managerId: 'u2',
        tags: JSON.stringify(['физлицо']),
        source: 'Выставка',
        createdAt: '2025-09-12T10:00:00',
        lastContactAt: '2026-03-01T10:30:00',
      },
      {
        id: 'c5',
        firstName: 'Владимир',
        lastName: 'Смирнов',
        position: 'Менеджер по снабжению',
        company: 'ООО "Гермес"',
        companyId: 'co3',
        email: 'smirnov@germes.ru',
        phone: '+7 926 333-22-11',
        status: 'lead',
        managerId: 'u2',
        tags: JSON.stringify(['оптовик']),
        source: 'Холодный звонок',
        createdAt: '2026-02-01T09:00:00',
      },
      {
        id: 'c6',
        firstName: 'Ольга',
        lastName: 'Николаева',
        company: 'ООО "АртДизайн"',
        email: 'nikolaeva@artdesign.ru',
        phone: '+7 985 444-55-66',
        status: 'archived',
        managerId: 'u1',
        tags: JSON.stringify([]),
        source: 'Сайт',
        createdAt: '2024-03-20T09:00:00',
        lastContactAt: '2024-12-10T14:00:00',
      },
    ],
  })

  // ─── Deals ──────────────────────────────────────────────────────────────────
  await prisma.deal.createMany({
    data: [
      {
        id: 'd1',
        title: 'Поставка стройматериалов Q1',
        clientId: 'c1',
        companyId: 'co1',
        managerId: 'u1',
        status: 'negotiation',
        amount: 450000,
        deadline: '2026-03-15',
        description: 'Крупная партия кирпича и цемента для строительного объекта',
        createdAt: '2026-01-10T10:00:00',
        updatedAt: '2026-02-20T15:00:00',
      },
      {
        id: 'd2',
        title: 'Розничный заказ №128',
        clientId: 'c2',
        managerId: 'u1',
        status: 'proposal_sent',
        amount: 35000,
        deadline: '2026-03-10',
        description: 'Отправлено КП на ассортимент товаров',
        createdAt: '2026-02-05T09:00:00',
        updatedAt: '2026-02-15T11:00:00',
      },
      {
        id: 'd3',
        title: 'Годовой контракт ТехноТрейд',
        clientId: 'c3',
        companyId: 'co2',
        managerId: 'u1',
        status: 'won',
        amount: 1200000,
        deadline: '2026-02-01',
        description: 'Годовой договор поставки',
        createdAt: '2025-11-01T10:00:00',
        updatedAt: '2026-01-30T16:00:00',
      },
      {
        id: 'd4',
        title: 'Заказ Иванова',
        clientId: 'c4',
        managerId: 'u2',
        status: 'awaiting_payment',
        amount: 78000,
        deadline: '2026-03-05',
        createdAt: '2026-02-10T09:00:00',
        updatedAt: '2026-02-28T14:00:00',
      },
      {
        id: 'd5',
        title: 'Пробная партия Гермес',
        clientId: 'c5',
        managerId: 'u2',
        status: 'new',
        amount: 95000,
        deadline: '2026-04-01',
        description: 'Тестовая партия для нового клиента',
        createdAt: '2026-02-15T10:00:00',
        updatedAt: '2026-02-15T10:00:00',
      },
      {
        id: 'd6',
        title: 'Оформление офиса АртДизайн',
        clientId: 'c6',
        managerId: 'u1',
        status: 'lost',
        amount: 220000,
        description: 'Клиент выбрал другого поставщика',
        createdAt: '2024-10-01T09:00:00',
        updatedAt: '2024-12-10T14:00:00',
      },
    ],
  })

  // ─── Deal Status Changes ─────────────────────────────────────────────────────
  await prisma.dealStatusChange.createMany({
    data: [
      { id: 'sc1', dealId: 'd1', fromStatus: null, toStatus: 'new', changedBy: 'u1', changedAt: '2026-01-10T10:00:00' },
      { id: 'sc2', dealId: 'd1', fromStatus: 'new', toStatus: 'negotiation', changedBy: 'u1', changedAt: '2026-01-20T12:00:00' },
      { id: 'sc3', dealId: 'd2', fromStatus: null, toStatus: 'new', changedBy: 'u1', changedAt: '2026-02-05T09:00:00' },
      { id: 'sc4', dealId: 'd2', fromStatus: 'new', toStatus: 'proposal_sent', changedBy: 'u1', changedAt: '2026-02-15T11:00:00' },
      { id: 'sc5', dealId: 'd3', fromStatus: 'awaiting_payment', toStatus: 'won', changedBy: 'u1', changedAt: '2026-01-30T16:00:00' },
    ],
  })

  // ─── Activities ──────────────────────────────────────────────────────────────
  await prisma.activity.createMany({
    data: [
      {
        id: 'a1',
        type: 'call',
        managerId: 'u1',
        clientId: 'c1',
        dealId: 'd1',
        date: '2026-02-28T14:30:00',
        description: 'Уточнили объём поставки и сроки',
        result: 'Клиент подтвердил заказ, ждёт финальное КП',
        createdAt: '2026-02-28T14:35:00',
      },
      {
        id: 'a2',
        type: 'email',
        managerId: 'u1',
        clientId: 'c2',
        dealId: 'd2',
        date: '2026-02-15T11:00:00',
        description: 'Отправлено коммерческое предложение',
        result: 'Ожидаем ответа',
        createdAt: '2026-02-15T11:05:00',
      },
      {
        id: 'a3',
        type: 'meeting',
        managerId: 'u1',
        clientId: 'c3',
        dealId: 'd3',
        date: '2026-01-25T10:00:00',
        description: 'Встреча в офисе клиента, подписание договора',
        result: 'Договор подписан, аванс получен',
        createdAt: '2026-01-25T12:00:00',
      },
      {
        id: 'a4',
        type: 'note',
        managerId: 'u1',
        clientId: 'c1',
        date: '2026-02-20T09:00:00',
        description: 'Клиент просит включить в КП доставку',
        createdAt: '2026-02-20T09:05:00',
      },
      {
        id: 'a5',
        type: 'call',
        managerId: 'u2',
        clientId: 'c4',
        dealId: 'd4',
        date: '2026-02-28T10:30:00',
        description: 'Напомнили об оплате',
        result: 'Обещала оплатить до 5 марта',
        createdAt: '2026-02-28T10:35:00',
      },
      {
        id: 'a6',
        type: 'call',
        managerId: 'u2',
        clientId: 'c5',
        date: '2026-02-15T15:00:00',
        description: 'Первичный контакт, выявление потребностей',
        result: 'Заинтересован, просит выслать каталог',
        createdAt: '2026-02-15T15:10:00',
      },
    ],
  })

  // ─── Tasks ───────────────────────────────────────────────────────────────────
  await prisma.task.createMany({
    data: [
      {
        id: 't1',
        title: 'Отправить финальное КП клиенту Петров',
        status: 'new',
        priority: 'high',
        assigneeId: 'u1',
        clientId: 'c1',
        dealId: 'd1',
        deadline: '2026-03-03T18:00:00',
        createdAt: '2026-02-28T14:40:00',
      },
      {
        id: 't2',
        title: 'Позвонить Сидоровой — ответ на КП',
        status: 'new',
        priority: 'medium',
        assigneeId: 'u1',
        clientId: 'c2',
        dealId: 'd2',
        deadline: '2026-03-04T12:00:00',
        createdAt: '2026-02-20T09:00:00',
      },
      {
        id: 't3',
        title: 'Оформить документы по ТехноТрейд',
        status: 'done',
        priority: 'high',
        assigneeId: 'u1',
        clientId: 'c3',
        dealId: 'd3',
        deadline: '2026-02-01T18:00:00',
        createdAt: '2026-01-25T12:30:00',
        completedAt: '2026-01-31T16:00:00',
      },
      {
        id: 't4',
        title: 'Проверить оплату от Ивановой',
        status: 'in_progress',
        priority: 'high',
        assigneeId: 'u2',
        clientId: 'c4',
        dealId: 'd4',
        deadline: '2026-03-05T12:00:00',
        createdAt: '2026-02-28T10:40:00',
      },
      {
        id: 't5',
        title: 'Выслать каталог Смирнову',
        status: 'new',
        priority: 'low',
        assigneeId: 'u2',
        clientId: 'c5',
        deadline: '2026-03-07T18:00:00',
        createdAt: '2026-02-15T15:15:00',
      },
    ],
  })

  // ─── Requests ────────────────────────────────────────────────────────────────
  await prisma.request.createMany({
    data: [
      {
        id: 'r1',
        title: 'Запрос на расчёт стоимости доставки',
        description: 'Клиент просит рассчитать стоимость доставки 5 тонн кирпича в Подмосковье',
        status: 'new',
        contactId: 'c1',
        dealId: 'd1',
        assigneeId: 'u1',
        createdAt: '2026-03-01T09:00:00',
      },
      {
        id: 'r2',
        title: 'Вопрос по счёту на оплату',
        description: 'Клиент запрашивает исправленный счёт с новыми реквизитами',
        status: 'in_progress',
        contactId: 'c4',
        dealId: 'd4',
        assigneeId: 'u2',
        createdAt: '2026-02-28T15:00:00',
      },
      {
        id: 'r3',
        title: 'Рекламация по качеству товара',
        description: 'Часть партии пришла с дефектами, клиент требует замену',
        status: 'resolved',
        contactId: 'c3',
        assigneeId: 'u1',
        createdAt: '2026-02-10T10:00:00',
        closedAt: '2026-02-20T16:00:00',
      },
    ],
  })

  console.log('✅ Seed complete!')
  console.log('   Users: 4 | Companies: 3 | Clients: 6 | Deals: 6 | Activities: 6 | Tasks: 5 | Requests: 3')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
