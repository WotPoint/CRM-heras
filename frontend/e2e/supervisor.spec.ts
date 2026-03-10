import { test, expect, type Page } from '@playwright/test'

const EMAIL    = 'supervisor@crm.ru'
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

// ═══════════════════════════════════════════════════════════════
// СЦЕНАРИЙ 1. Руководитель логинится → попадает на дашборд
// ═══════════════════════════════════════════════════════════════
test('Руководитель залогинился и попал на рабочий стол', async ({ page }) => {
  await page.goto('/login')
  await page.fill('input[placeholder="Email"]', EMAIL)
  await page.fill('input[placeholder="Пароль"]', PASSWORD)
  await page.click('button:has-text("Войти")')

  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 })
  await expect(page.locator('.ant-menu-item-selected', { hasText: 'Рабочий стол' })).toBeVisible()
  await expect(page.locator('.ant-card').first()).toBeVisible()
})

// ═══════════════════════════════════════════════════════════════
// СЦЕНАРИЙ 2. Руководитель видит пункт «Отчёты» и может зайти
// ═══════════════════════════════════════════════════════════════
test('Руководитель видит пункт «Отчёты» в меню и открывает страницу', async ({ page }) => {
  await login(page)

  // Пункт «Отчёты» виден в боковом меню
  await expect(page.locator('.ant-menu-item', { hasText: 'Отчёты' })).toBeVisible()

  await goTo(page, 'Отчёты', /\/reports/)

  // Страница отчётов загрузилась
  await expect(page.locator('h4', { hasText: 'Отчёты' })).toBeVisible()
})

// ═══════════════════════════════════════════════════════════════
// СЦЕНАРИЙ 3. На странице клиентов виден фильтр по менеджерам
// ═══════════════════════════════════════════════════════════════
test('На странице клиентов руководитель видит фильтр «Все менеджеры»', async ({ page }) => {
  await login(page)
  await goTo(page, 'Клиенты', /\/clients/)

  // Фильтр по менеджерам виден только для supervisor/admin
  await expect(
    page.locator('.ant-select-selection-placeholder', { hasText: 'Все менеджеры' })
  ).toBeVisible()
})

// ═══════════════════════════════════════════════════════════════
// СЦЕНАРИЙ 4. При создании клиента есть обязательное поле «Менеджер»
// ═══════════════════════════════════════════════════════════════
test('При создании клиента руководитель видит обязательное поле «Менеджер»', async ({ page }) => {
  await login(page)
  await goTo(page, 'Клиенты', /\/clients/)

  await page.getByRole('button', { name: /Добавить клиента/ }).click()

  const modal = page.locator('.ant-modal')
  await expect(modal).toBeVisible()

  // Поле «Менеджер» есть в форме (только у supervisor/admin)
  await expect(modal.locator('.ant-form-item', { hasText: 'Менеджер' })).toBeVisible()

  // При пустой отправке — ошибка на поле «Менеджер»
  await modal.locator('button.ant-btn-primary').click()
  await expect(
    modal.locator('.ant-form-item-explain-error', { hasText: 'Выберите менеджера' })
  ).toBeVisible()

  await page.getByRole('button', { name: 'Отмена', exact: true }).click()
})

// ═══════════════════════════════════════════════════════════════
// СЦЕНАРИЙ 5. При создании сделки есть поле «Менеджер»
// ═══════════════════════════════════════════════════════════════
test('При создании сделки руководитель видит поле «Менеджер»', async ({ page }) => {
  await login(page)
  await goTo(page, 'Сделки', /\/deals/)

  await page.getByRole('button', { name: /Создать сделку/ }).click()

  const modal = page.locator('.ant-modal')
  await expect(modal).toBeVisible()

  // Поле «Менеджер» есть в форме
  await expect(modal.locator('.ant-form-item', { hasText: 'Менеджер' })).toBeVisible()

  await page.getByRole('button', { name: 'Отмена', exact: true }).click()
})

// ═══════════════════════════════════════════════════════════════
// СЦЕНАРИЙ 6. При создании задачи есть поле «Ответственный»
// ═══════════════════════════════════════════════════════════════
test('При создании задачи руководитель видит поле «Ответственный»', async ({ page }) => {
  await login(page)
  await goTo(page, 'Задачи', /\/tasks/)

  await page.getByRole('button', { name: /Добавить задачу/ }).click()

  const modal = page.locator('.ant-modal')
  await expect(modal).toBeVisible()

  // Поле «Ответственный» есть в форме
  await expect(modal.locator('.ant-form-item', { hasText: 'Ответственный' })).toBeVisible()

  await page.getByRole('button', { name: 'Отмена', exact: true }).click()
})
