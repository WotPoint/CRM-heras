import { test, expect, type Page } from '@playwright/test'

const ADMIN_EMAIL    = 'admin@crm.ru'
const ADMIN_PASSWORD = '123456'
const MANAGER_EMAIL  = 'manager@crm.ru'

async function loginAs(page: Page, email: string, password = '123456') {
  await page.goto('/login')
  await page.fill('input[placeholder="Email"]', email)
  await page.fill('input[placeholder="Пароль"]', password)
  await page.click('button:has-text("Войти")')
  await page.waitForURL('**/dashboard', { timeout: 15_000 })
}

// ═══════════════════════════════════════════════════════════════
// СЦЕНАРИЙ 1. Админ логинится → попадает на дашборд
// ═══════════════════════════════════════════════════════════════
test('Администратор залогинился и попал на рабочий стол', async ({ page }) => {
  await page.goto('/login')
  await page.fill('input[placeholder="Email"]', ADMIN_EMAIL)
  await page.fill('input[placeholder="Пароль"]', ADMIN_PASSWORD)
  await page.click('button:has-text("Войти")')

  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 })
  await expect(page.locator('.ant-menu-item-selected', { hasText: 'Рабочий стол' })).toBeVisible()
})

// ═══════════════════════════════════════════════════════════════
// СЦЕНАРИЙ 2. В меню есть пункт «Пользователи»
// ═══════════════════════════════════════════════════════════════
test('Администратор видит пункт «Пользователи» в меню', async ({ page }) => {
  await loginAs(page, ADMIN_EMAIL)

  await expect(page.locator('.ant-menu-item', { hasText: 'Пользователи' })).toBeVisible()
})

// ═══════════════════════════════════════════════════════════════
// СЦЕНАРИЙ 3. Страница /admin/users загружается
// ═══════════════════════════════════════════════════════════════
test('Страница управления пользователями загрузилась', async ({ page }) => {
  await loginAs(page, ADMIN_EMAIL)

  await page.locator('.ant-menu-item', { hasText: 'Пользователи' }).click()
  await page.waitForURL(/\/admin\/users/, { timeout: 10_000 })
  await page.waitForLoadState('networkidle', { timeout: 10_000 })

  // Заголовок страницы
  await expect(page.locator('h4', { hasText: 'Пользователи' })).toBeVisible()

  // Таблица с пользователями загрузилась
  await expect(page.locator('.ant-table-tbody tr').first()).toBeVisible({ timeout: 10_000 })

  // Кнопка «Добавить пользователя» есть
  await expect(page.getByRole('button', { name: /Добавить пользователя/ })).toBeVisible()
})

// ═══════════════════════════════════════════════════════════════
// СЦЕНАРИЙ 4. Форма создания пользователя открывается
// ═══════════════════════════════════════════════════════════════
test('Нажал «Добавить пользователя» — открылась форма', async ({ page }) => {
  await loginAs(page, ADMIN_EMAIL)

  await page.locator('.ant-menu-item', { hasText: 'Пользователи' }).click()
  await page.waitForURL(/\/admin\/users/, { timeout: 10_000 })
  await page.waitForLoadState('networkidle', { timeout: 10_000 })

  await page.getByRole('button', { name: /Добавить пользователя/ }).click()

  const modal = page.locator('.ant-modal')
  await expect(modal).toBeVisible()
  await expect(modal.locator('.ant-modal-title', { hasText: 'Новый пользователь' })).toBeVisible()

  // Обязательные поля формы присутствуют
  await expect(modal.locator('input[placeholder="Имя"]')).toBeVisible()
  await expect(modal.locator('input[placeholder="user@company.ru"]')).toBeVisible()
  await expect(modal.locator('input[placeholder="Минимум 6 символов"]')).toBeVisible()

  await page.getByRole('button', { name: 'Отмена', exact: true }).click()
  await expect(modal).not.toBeVisible()
})

// ═══════════════════════════════════════════════════════════════
// СЦЕНАРИЙ 5. Менеджер не видит пункт «Пользователи» в меню
// ═══════════════════════════════════════════════════════════════
test('Менеджер не видит пункт «Пользователи» в меню', async ({ page }) => {
  await loginAs(page, MANAGER_EMAIL)

  await expect(page.locator('.ant-menu-item', { hasText: 'Пользователи' })).not.toBeVisible()
})

// ═══════════════════════════════════════════════════════════════
// СЦЕНАРИЙ 6. Менеджер не может открыть /admin/users напрямую
// ═══════════════════════════════════════════════════════════════
test('Менеджер перенаправляется при попытке зайти на /admin/users', async ({ page }) => {
  await loginAs(page, MANAGER_EMAIL)

  await page.goto('/admin/users')
  // Должен оказаться на /dashboard или /login — не на /admin/users
  await expect(page).not.toHaveURL(/\/admin\/users/, { timeout: 5_000 })
})
