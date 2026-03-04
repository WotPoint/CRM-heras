import { AVATAR_COLORS } from '@/constants/colors'

/** Возвращает детерминированный цвет для заданного id */
export function getAvatarColor(id: string): string {
  const sum = id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
  return AVATAR_COLORS[sum % AVATAR_COLORS.length]
}

/** Возвращает инициалы (до 2 букв) из полного имени */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}
