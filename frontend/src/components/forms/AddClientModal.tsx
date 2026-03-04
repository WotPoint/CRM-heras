import { Modal, Form, Input, Select, Row, Col } from 'antd'
import { MOCK_USERS } from '@/mocks'
import { useAuthStore } from '@/store/authStore'
import type { Client, ClientStatus } from '@/types'
import type { Rule } from 'antd/es/form'

const { Option } = Select

const SOURCE_OPTIONS = ['Сайт', 'Звонок', 'Рекомендация', 'Выставка', 'Холодный звонок', 'Соцсети', 'Другое']
const STATUS_OPTIONS: { value: ClientStatus; label: string }[] = [
  { value: 'lead',     label: 'Лид'        },
  { value: 'active',   label: 'Активный'   },
  { value: 'regular',  label: 'Постоянный' },
  { value: 'archived', label: 'Архивный'   },
]

const phoneRule: Rule = {
  validator: (_, value: string) => {
    if (!value) return Promise.resolve()
    const digits = value.replace(/\D/g, '')
    if (digits.length < 10 || digits.length > 12)
      return Promise.reject(new Error('Введите корректный номер (10–11 цифр)'))
    return Promise.resolve()
  },
}

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
      <Form form={form} layout="vertical" style={{ marginTop: 16 }} scrollToFirstError>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="firstName"
              label="Имя"
              rules={[
                { required: true, message: 'Введите имя' },
                { min: 2, message: 'Минимум 2 символа' },
                { whitespace: true, message: 'Имя не может состоять только из пробелов' },
              ]}
            >
              <Input placeholder="Иван" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="lastName"
              label="Фамилия"
              rules={[
                { required: true, message: 'Введите фамилию' },
                { min: 2, message: 'Минимум 2 символа' },
                { whitespace: true, message: 'Фамилия не может состоять только из пробелов' },
              ]}
            >
              <Input placeholder="Петров" />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          name="company"
          label="Компания"
          rules={[{ whitespace: true, message: 'Поле не может состоять только из пробелов' }]}
        >
          <Input placeholder="ООО «Название»" />
        </Form.Item>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="email"
              label="Email"
              rules={[{ type: 'email', message: 'Введите корректный email' }]}
            >
              <Input placeholder="email@example.com" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="phone" label="Телефон" rules={[phoneRule]}>
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
          <Form.Item
            name="managerId"
            label="Менеджер"
            rules={[{ required: true, message: 'Выберите менеджера' }]}
          >
            <Select placeholder="Назначить менеджера">
              {managers.map((m) => <Option key={m.id} value={m.id}>{m.name}</Option>)}
            </Select>
          </Form.Item>
        )}

        <Form.Item name="tags" label="Теги">
          <Select mode="tags" placeholder="Добавьте теги" />
        </Form.Item>

        <Form.Item
          name="comment"
          label="Комментарий"
          rules={[{ max: 500, message: 'Максимум 500 символов' }]}
        >
          <Input.TextArea rows={3} placeholder="Дополнительная информация..." showCount maxLength={500} />
        </Form.Item>
      </Form>
    </Modal>
  )
}
