import { useState } from 'react'
import { Timeline, Typography, Button, Form, Input, Select, DatePicker, Space, Tag, Tooltip } from 'antd'
import {
  PhoneOutlined, MailOutlined, TeamOutlined,
  FileTextOutlined, PlusOutlined, SwapOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import type { Activity, ActivityType } from '@/types'
import { UserAvatar } from './UserAvatar'
import { useAuthStore } from '@/store/authStore'

const { Text, Paragraph } = Typography
const { Option } = Select
const { TextArea } = Input

const ACTIVITY_CONFIG: Record<ActivityType, { icon: React.ReactNode; color: string; label: string }> = {
  call:          { icon: <PhoneOutlined />,    color: '#52c41a', label: 'Звонок'          },
  email:         { icon: <MailOutlined />,     color: '#1677ff', label: 'Email'           },
  meeting:       { icon: <TeamOutlined />,     color: '#722ed1', label: 'Встреча'         },
  note:          { icon: <FileTextOutlined />, color: '#fa8c16', label: 'Заметка'         },
  status_change: { icon: <SwapOutlined />,     color: '#13c2c2', label: 'Смена статуса'   },
}

interface Props {
  activities: Activity[]
  onAdd?: (activity: Omit<Activity, 'id' | 'createdAt'>) => void
  clientId?: string
  dealId?: string
}

export function InteractionTimeline({ activities, onAdd, clientId, dealId }: Props) {
  const { currentUser } = useAuthStore()
  const [showForm, setShowForm] = useState(false)
  const [form] = Form.useForm()

  const sorted = [...activities].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  )

  const handleAdd = () => {
    form.validateFields().then((values) => {
      onAdd?.({
        type: values.type,
        managerId: currentUser?.id ?? '',
        clientId,
        dealId,
        date: values.date ? values.date.toISOString() : new Date().toISOString(),
        description: values.description,
        result: values.result,
      })
      form.resetFields()
      setShowForm(false)
    })
  }

  const timelineItems = sorted.map((a) => {
    const cfg = ACTIVITY_CONFIG[a.type]
    return {
      key: a.id,
      color: cfg.color,
      dot: (
        <div
          style={{
            width: 28, height: 28, borderRadius: '50%',
            background: cfg.color + '20',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: cfg.color, fontSize: 13,
          }}
        >
          {cfg.icon}
        </div>
      ),
      children: (
        <div style={{ paddingBottom: 4 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Tag color={cfg.color} style={{ margin: 0 }}>{cfg.label}</Tag>
              <UserAvatar userId={a.managerId} size={20} />
            </div>
            <Tooltip title={dayjs(a.date).format('D MMMM YYYY, HH:mm')}>
              <Text type="secondary" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                {dayjs(a.date).fromNow()}
              </Text>
            </Tooltip>
          </div>
          <Paragraph style={{ margin: '6px 0 0', fontSize: 13 }}>
            {a.description}
          </Paragraph>
          {a.result && (
            <div
              style={{
                marginTop: 4, padding: '4px 10px',
                background: '#f6ffed', borderRadius: 6,
                borderLeft: '3px solid #52c41a',
              }}
            >
              <Text style={{ fontSize: 12, color: '#389e0d' }}>
                Результат: {a.result}
              </Text>
            </div>
          )}
        </div>
      ),
    }
  })

  return (
    <div>
      {/* Кнопка добавления */}
      {onAdd && (
        <div style={{ marginBottom: 16 }}>
          {!showForm ? (
            <Button icon={<PlusOutlined />} onClick={() => setShowForm(true)}>
              Добавить запись
            </Button>
          ) : (
            <div
              style={{
                padding: 16, background: '#fafafa',
                borderRadius: 10, border: '1px solid #e8e8e8', marginBottom: 16,
              }}
            >
              <Form form={form} layout="vertical" size="small">
                <Space style={{ width: '100%' }} direction="vertical" size={8}>
                  <Space wrap size={8} style={{ width: '100%' }}>
                    <Form.Item name="type" label="Тип" rules={[{ required: true }]} style={{ margin: 0, minWidth: 140 }}>
                      <Select placeholder="Тип">
                        {(Object.keys(ACTIVITY_CONFIG) as ActivityType[])
                          .filter((t) => t !== 'status_change')
                          .map((t) => (
                            <Option key={t} value={t}>{ACTIVITY_CONFIG[t].label}</Option>
                          ))}
                      </Select>
                    </Form.Item>
                    <Form.Item name="date" label="Дата и время" style={{ margin: 0 }}>
                      <DatePicker showTime format="DD.MM.YYYY HH:mm" />
                    </Form.Item>
                  </Space>
                  <Form.Item name="description" label="Описание" rules={[{ required: true, message: 'Введите описание' }]} style={{ margin: 0 }}>
                    <TextArea rows={2} placeholder="Что произошло?" />
                  </Form.Item>
                  <Form.Item name="result" label="Результат" style={{ margin: 0 }}>
                    <Input placeholder="Итог взаимодействия (необязательно)" />
                  </Form.Item>
                  <Space>
                    <Button type="primary" size="small" onClick={handleAdd}>Сохранить</Button>
                    <Button size="small" onClick={() => { form.resetFields(); setShowForm(false) }}>Отмена</Button>
                  </Space>
                </Space>
              </Form>
            </div>
          )}
        </div>
      )}

      {sorted.length === 0 ? (
        <Text type="secondary">Взаимодействий пока нет</Text>
      ) : (
        <Timeline items={timelineItems} style={{ marginTop: 8 }} />
      )}
    </div>
  )
}
