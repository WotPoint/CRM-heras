import { test, expect, type Page } from '@playwright/test'

const EMAIL    = 'manager@crm.ru'
const PASSWORD = '123456'

async function login(page: Page) {
  await page.goto('/login')
  await page.fill('input[placeholder="Email"]', EMAIL)
  await page.fill('input[placeholder="Пароль"]', PASSWORD)
  await page.click('button:has-text("Войти")')
  await page.waitForURL('**/dashboard', { timeout: 15_000 })
}

async function goTo(page: Page, label: string, urlPattern: string | RegExp) {
  await page.locator('.ant-menu-item', { hasText: label }).click()
  await page.waitForURL(urlPattern, { timeout: 10_000 })
  await page.waitForLoadState('networkidle', { timeout: 10_000 })
}

/** Нажимает кнопку OK в открытом модале (у менеджера это .ant-modal-footer .ant-btn-primary) */
async function submitModal(page: Page) {
  await page.locator('.ant-modal:visible .ant-modal-footer button.ant-btn-primary').click()
}

async function closeModal(page: Page) {
  await page.getByRole('button', { name: 'Отмена', exact: true }).click()
}

// ═══════════════════════════════════════════════════════════════
// ВАЛИДАЦИЯ ФОРМЫ КЛИЕНТА
// ═══════════════════════════════════════════════════════════════

test('Форма клиента: пустая отправка → ошибки «Введите имя» и «Введите фамилию»', async ({ page }) => {
  await login(page)
  await goTo(page, 'Клиенты', /\/clients/)
  await page.getByRole('button', { name: /Добавить клиента/ }).click()

  const modal = page.locator('.ant-modal')
  await expect(modal).toBeVisible()

  await submitModal(page)

  await expect(modal.locator('.ant-form-item-explain-error', { hasText: 'Введите имя' })).toBeVisible()
  await expect(modal.locator('.ant-form-item-explain-error', { hasText: 'Введите фамилию' })).toBeVisible()

  await closeModal(page)
})

test('Форма клиента: имя из 1 символа → «Минимум 2 символа»', async ({ page }) => {
  await login(page)
  await goTo(page, 'Клиенты', /\/clients/)
  await page.getByRole('button', { name: /Добавить клиента/ }).click()

  const modal = page.locator('.ant-modal')
  await expect(modal).toBeVisible()

  await modal.locator('input[placeholder="Иван"]').fill('А')
  await submitModal(page)

  await expect(modal.locator('.ant-form-item-explain-error', { hasText: 'Минимум 2 символа' })).toBeVisible()

  await closeModal(page)
})

test('Форма клиента: некорректный email → «Введите корректный email»', async ({ page }) => {
  await login(page)
  await goTo(page, 'Клиенты', /\/clients/)
  await page.getByRole('button', { name: /Добавить клиента/ }).click()

  const modal = page.locator('.ant-modal')
  await expect(modal).toBeVisible()

  await modal.locator('input[placeholder="email@example.com"]').fill('не-email')
  await submitModal(page)

  await expect(
    modal.locator('.ant-form-item-explain-error', { hasText: 'Введите корректный email' })
  ).toBeVisible()

  await closeModal(page)
})

test('Форма клиента: телефон без достаточного числа цифр → ошибка формата', async ({ page }) => {
  await login(page)
  await goTo(page, 'Клиенты', /\/clients/)
  await page.getByRole('button', { name: /Добавить клиента/ }).click()

  const modal = page.locator('.ant-modal')
  await expect(modal).toBeVisible()

  await modal.locator('input[placeholder="+7 900 000-00-00"]').fill('123')
  await submitModal(page)

  await expect(
    modal.locator('.ant-form-item-explain-error', { hasText: /корректный номер/ })
  ).toBeVisible()

  await closeModal(page)
})

// ═══════════════════════════════════════════════════════════════
// ВАЛИДАЦИЯ ФОРМЫ ЗАДАЧИ
// ═══════════════════════════════════════════════════════════════

test('Форма задачи: пустая отправка → «Введите название задачи»', async ({ page }) => {
  await login(page)
  await goTo(page, 'Задачи', /\/tasks/)
  await page.getByRole('button', { name: /Добавить задачу/ }).click()

  const modal = page.locator('.ant-modal')
  await expect(modal).toBeVisible()

  await submitModal(page)

  await expect(
    modal.locator('.ant-form-item-explain-error', { hasText: 'Введите название задачи' })
  ).toBeVisible()

  await closeModal(page)
})

test('Форма задачи: название из 2 символов → «Минимум 3 символа»', async ({ page }) => {
  await login(page)
  await goTo(page, 'Задачи', /\/tasks/)
  await page.getByRole('button', { name: /Добавить задачу/ }).click()

  const modal = page.locator('.ant-modal')
  await expect(modal).toBeVisible()

  await modal.locator('input[placeholder="Что нужно сделать?"]').fill('Аб')
  await submitModal(page)

  await expect(
    modal.locator('.ant-form-item-explain-error', { hasText: 'Минимум 3 символа' })
  ).toBeVisible()

  await closeModal(page)
})

test('Форма задачи: название только из пробелов → ошибка валидации', async ({ page }) => {
  await login(page)
  await goTo(page, 'Задачи', /\/tasks/)
  await page.getByRole('button', { name: /Добавить задачу/ }).click()

  const modal = page.locator('.ant-modal')
  await expect(modal).toBeVisible()

  await modal.locator('input[placeholder="Что нужно сделать?"]').fill('   ')
  await submitModal(page)

  await expect(
    modal.locator('.ant-form-item-explain-error', { hasText: /не может состоять только из пробелов/ })
  ).toBeVisible()

  await closeModal(page)
})

// ═══════════════════════════════════════════════════════════════
// ВАЛИДАЦИЯ ФОРМЫ СДЕЛКИ
// ═══════════════════════════════════════════════════════════════

test('Форма сделки: пустая отправка → «Введите название сделки» и «Выберите клиента»', async ({ page }) => {
  await login(page)
  await goTo(page, 'Сделки', /\/deals/)
  await page.getByRole('button', { name: /Создать сделку/ }).click()

  const modal = page.locator('.ant-modal')
  await expect(modal).toBeVisible()

  await submitModal(page)

  await expect(
    modal.locator('.ant-form-item-explain-error', { hasText: 'Введите название сделки' })
  ).toBeVisible()
  await expect(
    modal.locator('.ant-form-item-explain-error', { hasText: 'Выберите клиента' })
  ).toBeVisible()

  await closeModal(page)
})

test('Форма сделки: название из 2 символов → «Минимум 3 символа»', async ({ page }) => {
  await login(page)
  await goTo(page, 'Сделки', /\/deals/)
  await page.getByRole('button', { name: /Создать сделку/ }).click()

  const modal = page.locator('.ant-modal')
  await expect(modal).toBeVisible()

  await modal.locator('input[placeholder="Например: Поставка оборудования"]').fill('Аб')
  await submitModal(page)

  await expect(
    modal.locator('.ant-form-item-explain-error', { hasText: 'Минимум 3 символа' })
  ).toBeVisible()

  await closeModal(page)
})

// ═══════════════════════════════════════════════════════════════
// ВАЛИДАЦИЯ ФОРМЫ АКТИВНОСТИ
// ═══════════════════════════════════════════════════════════════

test('Форма активности: пустое описание → «Введите описание»', async ({ page }) => {
  await login(page)
  await goTo(page, 'Активности', /\/activities/)
  await page.getByRole('main').getByRole('button', { name: /^plus Добавить$/ }).click()

  const modal = page.locator('.ant-modal')
  await expect(modal).toBeVisible()

  // Очищаем поле описания (оно пустое по умолчанию)
  await submitModal(page)

  await expect(
    modal.locator('.ant-form-item-explain-error', { hasText: 'Введите описание' })
  ).toBeVisible()

  await closeModal(page)
})

test('Форма активности: описание из 2 символов → «Минимум 3 символа»', async ({ page }) => {
  await login(page)
  await goTo(page, 'Активности', /\/activities/)
  await page.getByRole('main').getByRole('button', { name: /^plus Добавить$/ }).click()

  const modal = page.locator('.ant-modal')
  await expect(modal).toBeVisible()

  await modal.locator('textarea[placeholder="Что произошло?"]').fill('Аб')
  await submitModal(page)

  await expect(
    modal.locator('.ant-form-item-explain-error', { hasText: 'Минимум 3 символа' })
  ).toBeVisible()

  await closeModal(page)
})

test('Форма активности: описание только из пробелов → ошибка валидации', async ({ page }) => {
  await login(page)
  await goTo(page, 'Активности', /\/activities/)
  await page.getByRole('main').getByRole('button', { name: /^plus Добавить$/ }).click()

  const modal = page.locator('.ant-modal')
  await expect(modal).toBeVisible()

  await modal.locator('textarea[placeholder="Что произошло?"]').fill('   ')
  await submitModal(page)

  await expect(
    modal.locator('.ant-form-item-explain-error', { hasText: /только из пробелов/ })
  ).toBeVisible()

  await closeModal(page)
})
