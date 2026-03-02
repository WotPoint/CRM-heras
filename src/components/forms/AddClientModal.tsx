import { Modal, Form, Input, Select, Row, Col } from 'antd'
import { MOCK_USERS } from '@/mocks'
import { useAuthStore } from '@/store/authStore'
import type { Client, ClientStatus } from '@/types'

const { Option } = Select

const SOURCE_OPTIONS = ['Сайт', 'Звонок', 'Рекомендация', 'Выставка', 'Холодный звонок', 'Соцсети', 'Другое']
const STATUS_OPTIONS: { value: ClientStatus; label: string }[] = [
  { value: 'lead',     label: 'Лид'        },
  { value: 'active',   label: 'Активный'   },
  { value: 'regular',  label: 'Постоянный' },
  { value: 'archived', label: 'Архивный'   },
]

interface Props {
  open: boolean
  onClose: () => void
  onSubmit: (client: Omit<Client, 'id' | 'createdAt'>) => void
}

export function AddClientModal({ open, onClose, onSubmit }: Props) {
  const [form] = Form.useForm()
  const { currentUser, hasRole } = useAuthStore()

  const managers = MOCK_USERS.filter((u) => u.role === 'manager')

  const handleOk = () => {
    form.validateFields().then((values) => {
      onSubmit({
        ...values,
        managerId: values.managerId ?? currentUser?.id ?? '',
        tags: values.tags ?? [],
        status: values.status ?? 'lead',
      })
      form.resetFields()
      onClose()
    })
  }

  return (
    <Modal
      title="Новый клиент"
      open={open}
      onOk={handleOk}
      onCancel={() => { form.resetFields(); onClose() }}
      okText="Создать"
      cancelText="Отмена"
      width={600}
    >
      <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="firstName" label="Имя" rules={[{ required: true, message: 'Введите имя' }]}>
              <Input placeholder="Иван" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="lastName" label="Фамилия">
              <Input placeholder="Петров" />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item name="company" label="Компания">
          <Input placeholder="ООО «Название»" />
        </Form.Item>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="email" label="Email" rules={[{ type: 'email', message: 'Некорректный email' }]}>
              <Input placeholder="email@example.com" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="phone" label="Телефон">
              <Input placeholder="+7 900 000-00-00" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="status" label="Статус" initialValue="lead">
              <Select>
                {STATUS_OPTIONS.map((o) => <Option key={o.value} value={o.value}>{o.label}</Option>)}
              </Select>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="source" label="Источник">
              <Select allowClear placeholder="Выберите источник">
                {SOURCE_OPTIONS.map((s) => <Option key={s} value={s}>{s}</Option>)}
              </Select>
            </Form.Item>
          </Col>
        </Row>

        {hasRole('supervisor', 'admin') && (
          <Form.Item name="managerId" label="Менеджер" rules={[{ required: true, message: 'Выберите менеджера' }]}>
            <Select placeholder="Назначить менеджера">
              {managers.map((m) => <Option key={m.id} value={m.id}>{m.name}</Option>)}
            </Select>
          </Form.Item>
        )}

        <Form.Item name="tags" label="Теги">
          <Select mode="tags" placeholder="Добавьте теги" />
        </Form.Item>

        <Form.Item name="comment" label="Комментарий">
          <Input.TextArea rows={3} placeholder="Дополнительная информация..." />
        </Form.Item>
      </Form>
    </Modal>
  )
}
