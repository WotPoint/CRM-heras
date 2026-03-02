import { Modal, Form, Input, Select, DatePicker, Row, Col } from 'antd'
import { MOCK_CLIENTS, MOCK_DEALS, MOCK_USERS } from '@/mocks'
import { useAuthStore } from '@/store/authStore'
import type { Task, TaskPriority } from '@/types'
import dayjs from 'dayjs'

const { Option } = Select
const { TextArea } = Input

const PRIORITY_OPTIONS: { value: TaskPriority; label: string }[] = [
  { value: 'high',   label: 'Высокий' },
  { value: 'medium', label: 'Средний' },
  { value: 'low',    label: 'Низкий'  },
]

interface Props {
  open: boolean
  onClose: () => void
  onSubmit: (task: Omit<Task, 'id' | 'createdAt'>) => void
  initialClientId?: string
  initialDealId?: string
}

export function AddTaskModal({ open, onClose, onSubmit, initialClientId, initialDealId }: Props) {
  const [form] = Form.useForm()
  const { currentUser, hasRole, canViewManager } = useAuthStore()

  const clients = MOCK_CLIENTS.filter((c) => canViewManager(c.managerId))
  const deals = MOCK_DEALS.filter((d) => canViewManager(d.managerId))
  const managers = MOCK_USERS.filter((u) => u.role === 'manager')

  const handleOk = () => {
    form.validateFields().then((values) => {
      onSubmit({
        title: values.title,
        description: values.description,
        status: 'new',
        priority: values.priority ?? 'medium',
        assigneeId: values.assigneeId ?? currentUser?.id ?? '',
        clientId: values.clientId,
        dealId: values.dealId,
        deadline: values.deadline ? values.deadline.toISOString() : undefined,
      })
      form.resetFields()
      onClose()
    })
  }

  return (
    <Modal
      title="Новая задача"
      open={open}
      onOk={handleOk}
      onCancel={() => { form.resetFields(); onClose() }}
      okText="Создать"
      cancelText="Отмена"
      width={520}
    >
      <Form
        form={form}
        layout="vertical"
        style={{ marginTop: 16 }}
        initialValues={{
          priority: 'medium',
          assigneeId: currentUser?.id,
          clientId: initialClientId,
          dealId: initialDealId,
        }}
      >
        <Form.Item name="title" label="Название задачи" rules={[{ required: true, message: 'Введите название' }]}>
          <Input placeholder="Что нужно сделать?" />
        </Form.Item>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="priority" label="Приоритет">
              <Select>
                {PRIORITY_OPTIONS.map((p) => <Option key={p.value} value={p.value}>{p.label}</Option>)}
              </Select>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="deadline" label="Дедлайн">
              <DatePicker showTime format="DD.MM.YYYY HH:mm" style={{ width: '100%' }} />
            </Form.Item>
          </Col>
        </Row>

        {hasRole('supervisor', 'admin') && (
          <Form.Item name="assigneeId" label="Ответственный" rules={[{ required: true }]}>
            <Select>
              {managers.map((m) => <Option key={m.id} value={m.id}>{m.name}</Option>)}
            </Select>
          </Form.Item>
        )}

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="clientId" label="Клиент">
              <Select allowClear showSearch placeholder="Выберите клиента"
                filterOption={(input, opt) =>
                  String(opt?.children ?? '').toLowerCase().includes(input.toLowerCase())
                }>
                {clients.map((c) => (
                  <Option key={c.id} value={c.id}>{c.firstName} {c.lastName}</Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="dealId" label="Сделка">
              <Select allowClear showSearch placeholder="Выберите сделку"
                filterOption={(input, opt) =>
                  String(opt?.children ?? '').toLowerCase().includes(input.toLowerCase())
                }>
                {deals.map((d) => <Option key={d.id} value={d.id}>{d.title}</Option>)}
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Form.Item name="description" label="Описание">
          <TextArea rows={2} placeholder="Дополнительные детали (необязательно)" />
        </Form.Item>
      </Form>
    </Modal>
  )
}
