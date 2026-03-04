import { Empty, Button } from 'antd'
import type { ReactNode } from 'react'

interface EmptyStateProps {
  description?: string
  actionLabel?: string
  onAction?: () => void
  icon?: ReactNode
}

export function EmptyState({ description = 'Нет данных', actionLabel, onAction, icon }: EmptyStateProps) {
  return (
    <div style={{ padding: '48px 0', textAlign: 'center' }}>
      <Empty
        image={icon ?? Empty.PRESENTED_IMAGE_SIMPLE}
        description={description}
      >
        {actionLabel && onAction && (
          <Button type="primary" onClick={onAction}>
            {actionLabel}
          </Button>
        )}
      </Empty>
    </div>
  )
}
