const prisma = require('./prisma')
const { sendPushNotification, sendPushToMany } = require('./firebase')

const sendNotification = async (userId, title, message, type = 'INFO', link = null) => {
  try {
    // Save to database
    await prisma.notification.create({
      data: { userId, title, message, type, link }
    })

    // Send push notification
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { fcmToken: true }
    })
    if (user?.fcmToken) {
      await sendPushNotification(user.fcmToken, title, message, link)
    }
  } catch (error) {
    console.error('Failed to send notification:', error)
  }
}

const sendNotificationToMany = async (userIds, title, message, type = 'INFO', link = null) => {
  try {
    // Save to database
    await prisma.notification.createMany({
      data: userIds.map((userId) => ({
        userId, title, message, type, link
      }))
    })

    // Send push notifications
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { fcmToken: true }
    })
    const tokens = users.map((u) => u.fcmToken).filter(Boolean)
    if (tokens.length > 0) {
      await sendPushToMany(tokens, title, message, link)
    }
  } catch (error) {
    console.error('Failed to send notifications:', error)
  }
}

const sendNotificationToCompany = async (companyId, title, message, type = 'INFO', excludeUserId = null, link = null) => {
  try {
    const users = await prisma.user.findMany({
      where: {
        companyId,
        isActive: true,
        ...(excludeUserId && { id: { not: excludeUserId } })
      },
      select: { id: true }
    })
    const userIds = users.map((u) => u.id)
    if (userIds.length > 0) {
      await sendNotificationToMany(userIds, title, message, type, link)
    }
  } catch (error) {
    console.error('Failed to send company notifications:', error)
  }
}

const sendNotificationToAdmins = async (title, message, type = 'ALERT', link = null) => {
  try {
    const admins = await prisma.user.findMany({
      where: {
        role: { in: ['SUPER_ADMIN', 'ADMIN'] },
        isActive: true
      },
      select: { id: true }
    })
    const adminIds = admins.map((u) => u.id)
    if (adminIds.length > 0) {
      await sendNotificationToMany(adminIds, title, message, type, link)
    }
  } catch (error) {
    console.error('Failed to send admin notifications:', error)
  }
}

module.exports = {
  sendNotification,
  sendNotificationToMany,
  sendNotificationToCompany,
  sendNotificationToAdmins
}