import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { ConfigProvider, theme as antTheme } from 'antd'
import ruRU from 'antd/locale/ru_RU'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import isToday from 'dayjs/plugin/isToday'
import isYesterday from 'dayjs/plugin/isYesterday'
import 'dayjs/locale/ru'
import { router } from '@/router'
import { useThemeStore } from '@/store/themeStore'

// Глобальный сброс: убираем margin/padding браузера и белый фон body
const globalStyle = document.createElement('style')
globalStyle.textContent = `
  *, *::before, *::after { box-sizing: border-box; }
  html, body, #root {
    margin: 0; padding: 0;
    width: 100%; height: 100%;
    background: transparent;
  }
`
document.head.appendChild(globalStyle)

dayjs.extend(relativeTime)
dayjs.extend(isToday)
dayjs.extend(isYesterday)
dayjs.locale('ru')

function App() {
  const { isDark } = useThemeStore()

  // Синхронизируем фон body с темой — убираем белые полосы по краям
  useEffect(() => {
    document.body.style.background = isDark ? '#141414' : '#f5f7fa'
  }, [isDark])

  return (
    <ConfigProvider
      locale={ruRU}
      theme={{
        algorithm: isDark ? antTheme.darkAlgorithm : antTheme.defaultAlgorithm,
        token: {
          colorPrimary: '#667eea',
          borderRadius: 8,
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif",
        },
        components: {
          Layout: { siderBg: '#001529' },
          Menu:   { darkItemBg: '#001529' },
        },
      }}
    >
      <RouterProvider router={router} />
    </ConfigProvider>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
