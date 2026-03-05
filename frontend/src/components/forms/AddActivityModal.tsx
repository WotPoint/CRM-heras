import { Modal, Form, Input, Select, DatePicker, Row, Col } from 'antd'
import { useAuthStore } from '@/store/authStore'
import { useDataStore } from '@/store/dataStore'
import type { Activity, ActivityType } from '@/types'
import dayjs from 'dayjs'

const { Option } = Select
const { TextArea } = Input

const ACTIVITY_TYPES: { value: ActivityType; label: string }[] = [
  { value: 'call',    label: 'Звонок'  },
  { value: 'email',   label: 'Email'   },
  { value: 'meeting', label: 'Встреча' },
  { value: 'note',    label: 'Заметка' },
]

interface Props {
  open: boolean
  onClose: () => void
  onSubmit: (activity: Omit<Activity, 'id' | 'createdAt'>) => void
  initialClientId?: string
  initialDealId?: string
}

export function AddActivityModal({ open, onClose, onSubmit, initialClientId, initialDealId }: Props) {
  const [form] = Form.useForm()
  const { currentUser, canViewManager } = useAuthStore()

  const allClients = useDataStore((s) => s.clients)
  const allDeals = useDataStore((s) => s.deals)
  const clients = allClients.filter((c) => canViewManager(c.managerId))
  const deals = allDeals.filter((d) => canViewManager(d.managerId))

  const handleOk = () => {
    form.validateFields().then((values) => {
      onSubmit({
        type: values.type,
        managerId: currentUser?.id ?? '',
        clientId: values.clientId,
        dealId: values.dealId,
        date: values.date ? values.date.toISOString() : new Date().toISOString(),
        description: values.description,
        result: values.result,
      })
      form.resetFields()
      onClose()
    })
  }

  return (
    <Modal
      title="Новая активность"
      open={open}
      onOk={handleOk}
      onCancel={() => { form.resetFields(); onClose() }}
      okText="Сохранить"
      cancelText="Отмена"
      width={540}
    >
      <Form
        form={form}
        layout="vertical"
        style={{ marginTop: 16 }}
        initialValues={{
          type: 'call',
          date: dayjs(),
          clientId: initialClientId,
          dealId: initialDealId,
        }}
        scrollToFirstError
      >
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="type"
              label="Тип"
              rules={[{ required: true, message: 'Выберите тип активности' }]}
            >
              <Select>
                {ACTIVITY_TYPES.map((t) => <Option key={t.value} value={t.value}>{t.label}</Option>)}
              </Select>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="date"
              label="Дата и время"
              rules={[{ required: true, message: 'Укажите дату' }]}
            >
              <DatePicker showTime format="DD.MM.YYYY HH:mm" style={{ width: '100%' }} />
            </Form.Item>
          </Col>
        </Row>

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

        <Form.Item
          name="description"
          label="Описание"
          rules={[
            { required: true, message: 'Введите описание' },
            { min: 3, message: 'Минимум 3 символа' },
            { whitespace: true, message: 'Описание не может состоять только из пробелов' },
            { max: 1000, message: 'Максимум 1000 символов' },
          ]}
        >
          <TextArea rows={3} placeholder="Что произошло?" showCount maxLength={1000} />
        </Form.Item>

        <Form.Item
          name="result"
          label="Результат"
          rules={[{ max: 500, message: 'Максимум 500 символов' }]}
        >
          <Input placeholder="Итог (необязательно)" />
        </Form.Item>
      </Form>
    </Modal>
  )
}
