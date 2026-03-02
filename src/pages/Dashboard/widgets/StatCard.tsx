import { Card, Typography } from 'antd'
import type { ReactNode } from 'react'

const { Text } = Typography

interface StatCardProps {
  label: string
  value: string | number
  color?: string
  icon?: ReactNode
  suffix?: string
  onClick?: () => void
}

export function StatCard({ label, value, color = '#1677ff', icon, suffix, onClick }: StatCardProps) {
  return (
    <Card
      size="small"
      hoverable={!!onClick}
      onClick={onClick}
      style={{ borderRadius: 12, cursor: onClick ? 'pointer' : 'default' }}
      styles={{ body: { padding: '16px 20px' } }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
            {label}
          </Text>
          <div style={{ fontSize: 26, fontWeight: 700, color, lineHeight: 1.2 }}>
            {value}
            {suffix && (
              <Text style={{ fontSize: 14, color, marginLeft: 4, fontWeight: 500 }}>{suffix}</Text>
            )}
          </div>
        </div>
        {icon && (
          <div style={{
            width: 44, height: 44, borderRadius: 10,
            background: color + '15',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color, fontSize: 20,
          }}>
            {icon}
          </div>
        )}
      </div>
    </Card>
  )
}
