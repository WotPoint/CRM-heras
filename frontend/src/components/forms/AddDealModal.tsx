import { Modal, Form, Input, Select, InputNumber, DatePicker, Row, Col } from 'antd'
import { useAuthStore } from '@/store/authStore'
import { useDataStore } from '@/store/dataStore'
import type { Deal, DealStatus } from '@/types'
import dayjs from 'dayjs'

const { Option } = Select
const { TextArea } = Input

const STATUS_OPTIONS: { value: DealStatus; label: string }[] = [
  { value: 'new',              label: 'Новая'              },
  { value: 'negotiation',      label: 'Переговоры'         },
  { value: 'proposal_sent',    label: 'КП отправлено'      },
  { value: 'awaiting_payment', label: 'Ожидает оплаты'     },
  { value: 'won',              label: 'Закрыта / Выиграна' },
  { value: 'lost',             label: 'Закрыта / Проиграна'},
]

interface Props {
  open: boolean
  onClose: () => void
  onSubmit: (deal: Omit<Deal, 'id' | 'createdAt' | 'updatedAt'>) => void
  initialClientId?: string
}

export function AddDealModal({ open, onClose, onSubmit, initialClientId }: Props) {
  const [form] = Form.useForm()
  const { currentUser, hasRole, canViewManager } = useAuthStore()

  const { users, clients: allClients } = useDataStore()
  const managers = users.filter((u) => u.role === 'manager' && u.isActive)
  const clients = allClients.filter((c) => canViewManager(c.managerId))

  const handleOk = () => {
    form.validateFields().then((values) => {
      onSubmit({
        title: values.title,
        clientId: values.clientId,
        managerId: values.managerId ?? currentUser?.id ?? '',
        status: values.status ?? 'new',
        amount: values.amount ?? 0,
        deadline: values.deadline ? values.deadline.toISOString() : undefined,
        description: values.description,
      })
      form.resetFields()
      onClose()
    })
  }

  return (
    <Modal
      title="Новая сделка"
      open={open}
      onOk={handleOk}
      onCancel={() => { form.resetFields(); onClose() }}
      okText="Создать"
      cancelText="Отмена"
      width={560}
    >
      <Form
        form={form}
        layout="vertical"
        style={{ marginTop: 16 }}
        initialValues={{ status: 'new', clientId: initialClientId }}
        scrollToFirstError
      >
        <Form.Item
          name="title"
          label="Название сделки"
          rules={[
            { required: true, message: 'Введите название сделки' },
            { min: 3, message: 'Минимум 3 символа' },
            { whitespace: true, message: 'Название не может состоять только из пробелов' },
          ]}
        >
          <Input placeholder="Например: Поставка оборудования" />
        </Form.Item>

        <Form.Item
          name="clientId"
          label="Клиент"
          rules={[{ required: true, message: 'Выберите клиента' }]}
        >
          <Select
            showSearch
            placeholder="Выберите клиента"
            filterOption={(input, option) =>
              String(option?.children ?? '').toLowerCase().includes(input.toLowerCase())
            }
          >
            {clients.map((c) => (
              <Option key={c.id} value={c.id}>
                {c.firstName} {c.lastName}{c.company ? ` (${c.company})` : ''}
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="amount"
              label="Сумма (₽)"
              rules={[
                {
                  validator: (_, value) => {
                    if (value === null || value === undefined) return Promise.resolve()
                    if (value < 0) return Promise.reject(new Error('Сумма не может быть отрицательной'))
                    if (value > 1_000_000_000) return Promise.reject(new Error('Введите реальную сумму'))
                    return Promise.resolve()
                  },
                },
              ]}
            >
              <InputNumber
                min={0}
                style={{ width: '100%' }}
                placeholder="0"
                formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="status" label="Статус">
              <Select>
                {STATUS_OPTIONS.map((o) => <Option key={o.value} value={o.value}>{o.label}</Option>)}
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="deadline"
              label="Дедлайн"
              rules={[
                {
                  validator: (_, value) => {
                    if (!value) return Promise.resolve()
                    if (dayjs(value).isBefore(dayjs(), 'day'))
                      return Promise.reject(new Error('Дедлайн не может быть в прошлом'))
                    return Promise.resolve()
                  },
                },
              ]}
            >
              <DatePicker
                style={{ width: '100%' }}
                format="DD.MM.YYYY"
                disabledDate={(d) => d.isBefore(dayjs(), 'day')}
              />
            </Form.Item>
          </Col>
          {hasRole('supervisor', 'admin') && (
            <Col span={12}>
              <Form.Item
                name="managerId"
                label="Менеджер"
                rules={[{ required: true, message: 'Выберите менеджера' }]}
              >
                <Select placeholder="Назначить">
                  {managers.map((m) => <Option key={m.id} value={m.id}>{m.name}</Option>)}
                </Select>
              </Form.Item>
            </Col>
          )}
        </Row>

        <Form.Item
          name="description"
          label="Описание"
          rules={[{ max: 1000, message: 'Максимум 1000 символов' }]}
        >
          <TextArea rows={3} placeholder="Детали сделки..." showCount maxLength={1000} />
        </Form.Item>
      </Form>
    </Modal>
  )
}
