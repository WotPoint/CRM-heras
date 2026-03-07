import { useState, useEffect, useRef } from 'react'
import {
  Typography, Button, Space, Spin, Empty, Modal, Form,
  Input, message, Alert,
} from 'antd'
import {
  MailOutlined, SendOutlined, SyncOutlined, InboxOutlined,
} from '@ant-design/icons'
import { emailApi } from '@/api'
import type { EmailThread, EmailMessage } from '@/types'
import dayjs from 'dayjs'

const { Title, Text } = Typography
const { TextArea } = Input

export default function EmailPage() {
  const [threads, setThreads] = useState<EmailThread[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [messages, setMessages] = useState<EmailMessage[]>([])
  const [currentThread, setCurrentThread] = useState<EmailThread | null>(null)
  const [threadLoading, setThreadLoading] = useState(false)
  const [composeOpen, setComposeOpen] = useState(false)
  const [composeSending, setComposeSending] = useState(false)
  const [composeForm] = Form.useForm()
  const [replyText, setReplyText] = useState('')
  const [replying, setReplying] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [notConnected, setNotConnected] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const loadThreads = async () => {
    try {
      setLoading(true)
      const data = await emailApi.threads()
      setThreads(data)
      setNotConnected(false)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : ''
      if (msg.includes('подключ') || msg.includes('connect')) setNotConnected(true)
      else message.error('Ошибка загрузки писем')
    } finally {
      setLoading(false)
    }
  }

  const loadThread = async (threadId: string) => {
    try {
      setThreadLoading(true)
      setMessages([])
      const data = await emailApi.thread(threadId)
      setCurrentThread(data.thread)
      setMessages(data.messages)
    } catch {
      message.error('Ошибка загрузки переписки')
    } finally {
      setThreadLoading(false)
    }
  }

  useEffect(() => { loadThreads() }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSelectThread = (id: string) => {
    setSelectedId(id)
    setReplyText('')
    loadThread(id)
  }

  const handleSync = async () => {
    setSyncing(true)
    try {
      const { synced } = await emailApi.sync()
      if (synced > 0) {
        message.success(`Синхронизировано ${synced} новых писем`)
        loadThreads()
        if (selectedId) loadThread(selectedId)
      } else {
        message.info('Новых писем нет')
      }
    } catch {
      message.error('Ошибка синхронизации')
    } finally {
      setSyncing(false)
    }
  }

  const handleCompose = async (values: { to: string; subject: string; body: string }) => {
    setComposeSending(true)
    try {
      const { thread } = await emailApi.send(values)
      message.success('Письмо отправлено')
      setComposeOpen(false)
      composeForm.resetFields()
      await loadThreads()
      handleSelectThread(thread.id)
    } catch (e: unknown) {
      message.error(e instanceof Error ? e.message : 'Ошибка отправки')
    } finally {
      setComposeSending(false)
    }
  }

  const handleReply = async () => {
    if (!selectedId || !replyText.trim()) return
    setReplying(true)
    try {
      await emailApi.reply(selectedId, { body: replyText })
      message.success('Ответ отправлен')
      setReplyText('')
      loadThread(selectedId)
      loadThreads()
    } catch (e: unknown) {
      message.error(e instanceof Error ? e.message : 'Ошибка отправки')
    } finally {
      setReplying(false)
    }
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <Title level={4} style={{ margin: 0 }}>Почта</Title>
        <Space>
          <Button icon={<SyncOutlined spin={syncing} />} onClick={handleSync} loading={syncing}>
            Синхронизировать
          </Button>
          <Button type="primary" icon={<SendOutlined />} onClick={() => setComposeOpen(true)}>
            Написать
          </Button>
        </Space>
      </div>

      {notConnected && (
        <Alert
          type="warning"
          showIcon
          message="Gmail не подключён"
          description={<span>Перейдите в <a href="/settings">Настройки → Gmail</a> для подключения аккаунта.</span>}
          style={{ marginBottom: 16, borderRadius: 8 }}
        />
      )}

      {/* Main layout */}
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>

        {/* Thread list panel */}
        <div style={{
          width: 300,
          flexShrink: 0,
          background: '#fff',
          borderRadius: 12,
          boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
          overflow: 'hidden',
          minHeight: 580,
        }}>
          <div style={{
            padding: '14px 16px',
            borderBottom: '1px solid #f0f0f0',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          }}>
            <span style={{ color: '#fff', fontWeight: 600, fontSize: 13 }}>
              Переписки
            </span>
            <span style={{
              float: 'right',
              background: 'rgba(255,255,255,0.25)',
              color: '#fff',
              borderRadius: 10,
              padding: '1px 8px',
              fontSize: 12,
            }}>
              {threads.length}
            </span>
          </div>

          <div style={{ overflowY: 'auto', maxHeight: 'calc(100vh - 220px)' }}>
            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
                <Spin />
              </div>
            ) : threads.length === 0 ? (
              <Empty
                description={<span style={{ color: '#aaa' }}>Нет писем</span>}
                style={{ padding: 40 }}
                image={<InboxOutlined style={{ fontSize: 40, color: '#ddd' }} />}
              />
            ) : (
              threads.map(thread => (
                <div
                  key={thread.id}
                  onClick={() => handleSelectThread(thread.id)}
                  style={{
                    padding: '12px 16px',
                    cursor: 'pointer',
                    background: selectedId === thread.id
                      ? 'linear-gradient(135deg, rgba(102,126,234,0.12) 0%, rgba(118,75,162,0.08) 100%)'
                      : '#fff',
                    borderLeft: selectedId === thread.id ? '3px solid #667eea' : '3px solid transparent',
                    borderBottom: '1px solid #f5f5f5',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => {
                    if (selectedId !== thread.id)
                      (e.currentTarget as HTMLElement).style.background = '#f7f8ff'
                  }}
                  onMouseLeave={e => {
                    if (selectedId !== thread.id)
                      (e.currentTarget as HTMLElement).style.background = '#fff'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{
                      fontWeight: selectedId === thread.id ? 700 : 600,
                      fontSize: 13,
                      color: selectedId === thread.id ? '#667eea' : '#1a1a1a',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      maxWidth: 185,
                    }}>
                      {thread.subject}
                    </span>
                    <span style={{ fontSize: 11, color: '#bbb', whiteSpace: 'nowrap', marginLeft: 8, flexShrink: 0 }}>
                      {dayjs(thread.lastMessageAt).format('DD.MM')}
                    </span>
                  </div>
                  <span style={{ fontSize: 12, color: '#aaa' }}>
                    {thread._count?.messages ?? 0} сообщ.
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Detail panel */}
        <div style={{
          flex: 1,
          background: '#fff',
          borderRadius: 12,
          boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
          display: 'flex',
          flexDirection: 'column',
          minHeight: 580,
          overflow: 'hidden',
        }}>
          {!selectedId ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
              <Space direction="vertical" align="center">
                <div style={{
                  width: 72,
                  height: 72,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, rgba(102,126,234,0.1) 0%, rgba(118,75,162,0.1) 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <MailOutlined style={{ fontSize: 32, color: '#667eea' }} />
                </div>
                <Text style={{ color: '#aaa', marginTop: 8 }}>Выберите переписку</Text>
              </Space>
            </div>
          ) : (
            <>
              {/* Thread header */}
              <div style={{
                padding: '14px 24px',
                borderBottom: '1px solid #f0f0f0',
                background: '#fafafa',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}>
                <div style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #667eea, #764ba2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <MailOutlined style={{ color: '#fff', fontSize: 16 }} />
                </div>
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: '#1a1a1a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {currentThread?.subject}
                  </div>
                  <div style={{ fontSize: 12, color: '#aaa' }}>
                    {messages.length} сообщений
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div style={{
                flex: 1,
                overflowY: 'auto',
                padding: '20px 24px',
                background: '#f8f9fc',
                maxHeight: 'calc(100vh - 380px)',
              }}>
                {threadLoading ? (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
                    <Spin />
                  </div>
                ) : (
                  messages.map(msg => (
                    <div key={msg.id} style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: msg.direction === 'outbound' ? 'flex-end' : 'flex-start',
                      marginBottom: 16,
                    }}>
                      <div style={{
                        maxWidth: '65%',
                        padding: '10px 14px',
                        borderRadius: msg.direction === 'outbound' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                        background: msg.direction === 'outbound'
                          ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                          : '#fff',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                      }}>
                        <span style={{
                          whiteSpace: 'pre-wrap',
                          color: msg.direction === 'outbound' ? '#fff' : '#2c2c2c',
                          fontSize: 13,
                          lineHeight: '1.5',
                          display: 'block',
                        }}>
                          {msg.bodyText}
                        </span>
                      </div>
                      <span style={{ fontSize: 11, color: '#bbb', marginTop: 4 }}>
                        {msg.direction === 'outbound' ? 'Вы' : msg.fromAddress}
                        {' · '}
                        {dayjs(msg.sentAt).format('DD.MM HH:mm')}
                      </span>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Reply area */}
              <div style={{
                padding: '16px 24px',
                borderTop: '1px solid #f0f0f0',
                background: '#fff',
              }}>
                <TextArea
                  rows={3}
                  placeholder="Написать ответ... (Ctrl+Enter для отправки)"
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  style={{
                    marginBottom: 10,
                    resize: 'none',
                    borderRadius: 8,
                    background: '#f8f9fc',
                    border: '1px solid #e8e8e8',
                    color: '#1a1a1a',
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleReply()
                  }}
                />
                <Button
                  type="primary"
                  icon={<SendOutlined />}
                  onClick={handleReply}
                  loading={replying}
                  disabled={!replyText.trim()}
                  style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    border: 'none',
                    borderRadius: 8,
                  }}
                >
                  Ответить
                </Button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Compose modal */}
      <Modal
        title={<span><SendOutlined style={{ marginRight: 8, color: '#667eea' }} />Новое письмо</span>}
        open={composeOpen}
        onCancel={() => { setComposeOpen(false); composeForm.resetFields() }}
        footer={null}
        width={560}
        destroyOnClose
      >
        <Form form={composeForm} layout="vertical" onFinish={handleCompose} style={{ marginTop: 16 }}>
          <Form.Item
            name="to"
            label="Кому"
            rules={[{ required: true, type: 'email', message: 'Введите корректный email получателя' }]}
          >
            <Input placeholder="email@example.com" />
          </Form.Item>
          <Form.Item
            name="subject"
            label="Тема"
            rules={[{ required: true, message: 'Введите тему' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="body"
            label="Текст письма"
            rules={[{ required: true, message: 'Введите текст письма' }]}
          >
            <TextArea rows={6} />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => { setComposeOpen(false); composeForm.resetFields() }}>
                Отмена
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                icon={<SendOutlined />}
                loading={composeSending}
                style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', border: 'none' }}
              >
                Отправить
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
