import cron from 'node-cron'
import prisma from '../lib/prisma.js'
import { sendNotification } from '../lib/notifications.js'
import { registerGmailWatch } from '../lib/gmail.js'

export function startDeadlineNotifier(): void {
  // Run daily at 08:00
  cron.schedule('0 8 * * *', async () => {
    console.log('[cron] Running deadline notifier...')
    await checkTaskDeadlines()
    await renewExpiredGmailWatches()
  })
  console.log('[cron] Deadline notifier scheduled (daily 08:00)')
}

async function checkTaskDeadlines(): Promise<void> {
  try {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    // Match tasks whose deadline starts with tomorrow's date string (YYYY-MM-DD)
    const tomorrowPrefix = tomorrow.toISOString().split('T')[0]

    const tasks = await prisma.task.findMany({
      where: {
        deadline: { startsWith: tomorrowPrefix },
        status: { not: 'done' },
        isArchived: false,
      },
    })

    for (const task of tasks) {
      sendNotification('task_deadline_approaching', {
        taskId: task.id,
        assigneeId: task.assigneeId,
        title: task.title,
        deadline: task.deadline,
        clientId: task.clientId,
      }).catch(err => console.error('[cron] deadline notification failed:', err))
    }

    console.log(`[cron] Deadline check: found ${tasks.length} task(s) due tomorrow`)
  } catch (err) {
    console.error('[cron] checkTaskDeadlines error:', err)
  }
}

async function renewExpiredGmailWatches(): Promise<void> {
  try {
    // Renew watches expiring within the next 24 hours
    const threshold = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

    const users = await prisma.user.findMany({
      where: {
        gmailRefreshToken: { not: null },
        gmailWatchExpiry: { lt: threshold },
      },
    })

    for (const user of users) {
      registerGmailWatch(user.id).catch(err =>
        console.error(`[cron] watch renewal failed for user ${user.id}:`, err)
      )
    }

    if (users.length > 0) {
      console.log(`[cron] Renewed Gmail watch for ${users.length} user(s)`)
    }
  } catch (err) {
    console.error('[cron] renewExpiredGmailWatches error:', err)
  }
}
