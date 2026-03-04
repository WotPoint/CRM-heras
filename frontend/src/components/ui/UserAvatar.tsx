import { Avatar, Tooltip } from 'antd'
import { MOCK_USERS } from '@/mocks'
import { getAvatarColor, getInitials } from '@/utils/avatar'

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
    <Avatar size={size} style={{ background: getAvatarColor(userId), flexShrink: 0, fontSize: size * 0.4 }}>
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
