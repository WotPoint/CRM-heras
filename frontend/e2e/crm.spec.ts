import { test, expect, type Page } from '@playwright/test'

// ─── Credentials ────────────────────────────────────────────
const EMAIL    = 'manager@crm.ru'
const PASSWORD = '123456'

// ─── Helpers ─────────────────────────────────────────────────

/** Логин через UI и ожидание редиректа на /dashboard */
async function login(page: Page) {
  await page.goto('/login')
  await page.fill('input[placeholder="Email"]', EMAIL)
  await page.fill('input[placeholder="Пароль"]', PASSWORD)
  await page.click('button:has-text("Войти")')
  await page.waitForURL('**/dashboard', { timeout: 15_000 })
}

/** Переход в раздел через боковое меню + ожидание URL */
async function goTo(page: Page, label: string, urlPattern: string | RegExp) {
  await page.locator('.ant-menu-item', { hasText: label }).click()
  await page.waitForURL(urlPattern, { timeout: 10_000 })
  // Ждём стабилизации страницы после перехода
  await page.waitForLoadState('networkidle', { timeout: 10_000 })
}

// ═══════════════════════════════════════════════════════════════
// СЦЕНАРИЙ 1. Логин → Рабочий стол
// ═══════════════════════════════════════════════════════════════
test('Пользователь залогинился и попал на рабочий стол', async ({ page }) => {
  await page.goto('/login')

  // Страница входа загрузилась
  await expect(page.getByText('Войдите в систему')).toBeVisible()

  // Вводим данные
  await page.fill('input[placeholder="Email"]', EMAIL)
  await page.fill('input[placeholder="Пароль"]', PASSWORD)
  await page.click('button:has-text("Войти")')

  // Должны оказаться на /dashboard
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 })

  // Боковое меню видно — пункт «Рабочий стол» подсвечен
  await expect(
    page.locator('.ant-menu-item-selected', { hasText: 'Рабочий стол' })
  ).toBeVisible()

  // На странице есть KPI-карточки (dashboard загрузился, а не пустой экран)
  await expect(page.locator('.ant-card').first()).toBeVisible()
})

// ═══════════════════════════════════════════════════════════════
// СЦЕНАРИЙ 2. Добавить клиента → открылась форма
// ═══════════════════════════════════════════════════════════════
test('Нажал «Добавить клиента» — открылась форма создания клиента', async ({ page }) => {
  await login(page)
  await goTo(page, 'Клиенты', /\/clients/)

  // Страница клиентов загрузилась (есть заголовок)
  await expect(page.locator('h4', { hasText: 'Клиенты' })).toBeVisible()

  // Нажимаем кнопку «Добавить клиента» (exact — не путать с «Добавить»)
  const addClientBtn = page.getByRole('button', { name: /Добавить клиента/ })
  await expect(addClientBtn).toBeVisible()
  await addClientBtn.click()

  // Модальное окно с нужным заголовком открылось
  const modal = page.locator('.ant-modal')
  await expect(modal).toBeVisible()
  await expect(modal.locator('.ant-modal-title', { hasText: 'Новый клиент' })).toBeVisible()

  // Обязательные поля присутствуют в форме
  await expect(modal.locator('input[placeholder="Иван"]')).toBeVisible()  // Имя
  await expect(modal.locator('input[placeholder="Петров"]')).toBeVisible() // Фамилия

  // Закрываем
  await page.getByRole('button', { name: 'Отмена', exact: true }).click()
  await expect(modal).not.toBeVisible()
})

// ═══════════════════════════════════════════════════════════════
// СЦЕНАРИЙ 3. Создать задачу → открылась форма
// ═══════════════════════════════════════════════════════════════
test('Нажал «Добавить задачу» — открылась форма создания задачи', async ({ page }) => {
  await login(page)
  await goTo(page, 'Задачи', /\/tasks/)

  // Страница задач загрузилась
  await expect(page.locator('h4', { hasText: 'Задачи' })).toBeVisible()

  // Нажимаем кнопку «Добавить задачу» (exact)
  const addTaskBtn = page.getByRole('button', { name: /Добавить задачу/ })
  await expect(addTaskBtn).toBeVisible()
  await addTaskBtn.click()

  // Модальное окно открылось
  const modal = page.locator('.ant-modal')
  await expect(modal).toBeVisible()
  await expect(modal.locator('.ant-modal-title', { hasText: 'Новая задача' })).toBeVisible()

  // Поле «Название задачи» присутствует
  await expect(modal.locator('input[placeholder="Что нужно сделать?"]')).toBeVisible()

  // Закрываем
  await page.getByRole('button', { name: 'Отмена', exact: true }).click()
  await expect(modal).not.toBeVisible()
})

// ═══════════════════════════════════════════════════════════════
// СЦЕНАРИЙ 4. Создать сделку → открылась форма
// ═══════════════════════════════════════════════════════════════
test('Нажал «Создать сделку» — открылась форма создания сделки', async ({ page }) => {
  await login(page)
  await goTo(page, 'Сделки', /\/deals/)

  // Страница сделок загрузилась
  await expect(page.locator('h4', { hasText: 'Сделки' })).toBeVisible()

  // Нажимаем кнопку «Создать сделку» (exact)
  const addDealBtn = page.getByRole('button', { name: /Создать сделку/ })
  await expect(addDealBtn).toBeVisible()
  await addDealBtn.click()

  // Модальное окно открылось
  const modal = page.locator('.ant-modal')
  await expect(modal).toBeVisible()
  await expect(modal.locator('.ant-modal-title', { hasText: 'Новая сделка' })).toBeVisible()

  // Поле «Название сделки» присутствует
  await expect(
    modal.locator('input[placeholder="Например: Поставка оборудования"]')
  ).toBeVisible()

  // Кнопка создания есть
  await expect(modal.locator('.ant-modal-footer button:has-text("Создать")')).toBeVisible()

  // Закрываем
  await page.getByRole('button', { name: 'Отмена', exact: true }).click()
  await expect(modal).not.toBeVisible()
})

// ═══════════════════════════════════════════════════════════════
// СЦЕНАРИЙ 5. Создать активность → открылась форма
// ═══════════════════════════════════════════════════════════════
test('Нажал «Добавить» активность — открылась форма создания активности', async ({ page }) => {
  await login(page)
  await goTo(page, 'Активности', /\/activities/)

  // Страница активностей загрузилась
  await expect(page.locator('h4', { hasText: 'Активности' })).toBeVisible()

  // Нажимаем кнопку «Добавить» в шапке страницы (exact — не «Добавить активность» из EmptyState)
  // Кнопка primary в заголовке страницы (не в теле контента)
  const addActivityBtn = page.getByRole('main').getByRole('button', { name: /^plus Добавить$/ })
  await expect(addActivityBtn).toBeVisible()
  await addActivityBtn.click()

  // Модальное окно открылось
  const modal = page.locator('.ant-modal')
  await expect(modal).toBeVisible()
  await expect(modal.locator('.ant-modal-title', { hasText: 'Новая активность' })).toBeVisible()

  // Поле «Описание» (обязательное) присутствует
  await expect(modal.locator('textarea[placeholder="Что произошло?"]')).toBeVisible()

  // Кнопка сохранения есть
  await expect(modal.locator('.ant-modal-footer button:has-text("Сохранить")')).toBeVisible()

  // Закрываем
  await page.getByRole('button', { name: 'Отмена', exact: true }).click()
  await expect(modal).not.toBeVisible()
})

// ═══════════════════════════════════════════════════════════════
// СЦЕНАРИЙ 6. Изменить статус клиента → статус обновился
// ═══════════════════════════════════════════════════════════════
test('Изменил статус клиента — статус обновился на карточке и в списке', async ({ page }) => {
  await login(page)
  await goTo(page, 'Клиенты', /\/clients/)

  // Ждём загрузки таблицы клиентов
  await expect(page.locator('.ant-table-tbody tr').first()).toBeVisible({ timeout: 10_000 })

  // Запоминаем имя первого клиента в списке
  const firstRow = page.locator('.ant-table-tbody tr').first()
  const clientName = await firstRow.locator('td').first().innerText()

  // Запоминаем текущий статус первого клиента в списке
  const statusCellBefore = firstRow.locator('td').nth(2)
  const statusBefore = await statusCellBefore.innerText()

  // Переходим на страницу клиента (клик по строке)
  await firstRow.click()
  await page.waitForURL(/\/clients\/.+/, { timeout: 10_000 })

  // Убеждаемся что открылась карточка нужного клиента
  await expect(page.locator('h4').first()).toContainText(clientName.split('\n')[0].trim())

  // Находим блок «Изменить статус» — Select ниже этой надписи
  const statusLabel = page.getByText('Изменить статус')
  await expect(statusLabel).toBeVisible()
  const statusSelect = statusLabel.locator('..').locator('.ant-select')

  // Определяем новый статус (выбираем тот, который не равен текущему)
  const currentValue = await statusSelect.locator('.ant-select-selection-item').innerText()
  const targetStatus = currentValue.includes('Лид') ? 'Активный' : 'Лид'

  // Открываем Select и выбираем новый статус
  await statusSelect.click()
  await page.locator('.ant-select-dropdown:visible .ant-select-item', { hasText: targetStatus }).click()

  // Проверяем уведомление об успехе
  await expect(page.locator('.ant-message-notice', { hasText: 'Статус обновлён' })).toBeVisible()

  // Статус в Select обновился
  await expect(statusSelect.locator('.ant-select-selection-item')).toHaveText(targetStatus, { timeout: 5_000 })

  // Статус в бейдже (вверху карточки) тоже обновился
  const badge = page.locator('.ant-tag, .ant-badge').filter({ hasText: targetStatus })
  await expect(badge).toBeVisible()

  // Возвращаемся в список клиентов
  await page.locator('.ant-breadcrumb a', { hasText: 'Клиенты' }).click()
  await page.waitForURL(/\/clients$/, { timeout: 10_000 })

  // Находим строку нашего клиента в таблице по имени
  const clientFirstName = clientName.split('\n')[0].trim().split(' ')[0]
  const updatedRow = page.locator('.ant-table-tbody tr', { hasText: clientFirstName })
  await expect(updatedRow).toBeVisible()

  // Статус в списке обновился
  const statusCellAfter = updatedRow.locator('td').nth(2)
  await expect(statusCellAfter).not.toHaveText(statusBefore, { timeout: 5_000 })
})
