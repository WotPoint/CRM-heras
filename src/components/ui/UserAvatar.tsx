import { Avatar, Tooltip } from 'antd'
import { MOCK_USERS } from '@/mocks'

const COLORS = ['#1677ff', '#52c41a', '#fa8c16', '#722ed1', '#eb2f96', '#13c2c2']

function getColor(id: string) {
  const sum = id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
  return COLORS[sum % COLORS.length]
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

interface UserAvatarProps {
  userId: string
  size?: number
  showName?: boolean
  showTooltip?: boolean
}

export function UserAvatar({ userId, size = 28, showName = false, showTooltip = true }: UserAvatarProps) {
  const user = MOCK_USERS.find((u) => u.id === userId)
  if (!user) return null

  const avatar = (
    <Avatar size={size} style={{ background: getColor(userId), flexShrink: 0, fontSize: size * 0.4 }}>
      {getInitials(user.name)}
    </Avatar>
  )

  const content = showName ? (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      {avatar}
      <span style={{ fontSize: 13 }}>{user.name}</span>
    </span>
  ) : (
    avatar
  )

  return showTooltip && !showName ? (
    <Tooltip title={user.name}>{content}</Tooltip>
  ) : (
    content
  )
}

/** Короткое имя пользователя по id */
export function getUserName(userId: string): string {
  return MOCK_USERS.find((u) => u.id === userId)?.name ?? '—'
}
