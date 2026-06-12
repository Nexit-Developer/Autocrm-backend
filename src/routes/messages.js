const express = require('express')
const router = express.Router()
const { protect } = require('../middleware/auth')
const prisma = require('../utils/prisma')

// Get all conversations for current user
router.get('/conversations', protect, async (req, res) => {
  try {
    const userId = req.user.id

    // Get all users I have chatted with
    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: userId },
          { receiverId: userId }
        ]
      },
      include: {
        sender: { select: { id: true, name: true, role: true } },
        receiver: { select: { id: true, name: true, role: true } }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Get unique conversations
    const conversationMap = new Map()
    messages.forEach((msg) => {
      const otherId = msg.senderId === userId ? msg.receiverId : msg.senderId
      const otherUser = msg.senderId === userId ? msg.receiver : msg.sender
      if (!conversationMap.has(otherId)) {
        conversationMap.set(otherId, {
          user: otherUser,
          lastMessage: msg,
          unreadCount: 0
        })
      }
    })

    // Count unread messages
    const unreadMessages = await prisma.message.groupBy({
      by: ['senderId'],
      where: { receiverId: userId, isRead: false },
      _count: { id: true }
    })

    unreadMessages.forEach((item) => {
      if (conversationMap.has(item.senderId)) {
        conversationMap.get(item.senderId).unreadCount = item._count.id
      }
    })

    res.json(Array.from(conversationMap.values()))
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Server error' })
  }
})

// Get messages between two users
router.get('/:userId', protect, async (req, res) => {
  try {
    const myId = req.user.id
    const otherId = parseInt(req.params.userId)

    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: myId, receiverId: otherId },
          { senderId: otherId, receiverId: myId }
        ]
      },
      include: {
        sender: { select: { id: true, name: true, role: true } }
      },
      orderBy: { createdAt: 'asc' }
    })

    // Mark messages as read
    await prisma.message.updateMany({
      where: {
        senderId: otherId,
        receiverId: myId,
        isRead: false
      },
      data: { isRead: true }
    })

    res.json(messages)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Server error' })
  }
})

// Get users I can chat with based on my role
router.get('/users/available', protect, async (req, res) => {
  try {
    const user = req.user
    let where = {}

    if (user.role === 'AGENT') {
      // Agent can chat with Team Lead, Manager, HR, Admin, Super Admin
      where = {
        companyId: user.companyId,
        role: { in: ['TEAM_LEAD', 'MANAGER', 'HR', 'ADMIN', 'SUPER_ADMIN'] },
        isActive: true,
        id: { not: user.id }
      }
    } else if (user.role === 'TEAM_LEAD') {
      where = {
        companyId: user.companyId,
        role: { in: ['AGENT', 'MANAGER', 'HR', 'ADMIN', 'SUPER_ADMIN'] },
        isActive: true,
        id: { not: user.id }
      }
    } else if (user.role === 'MANAGER') {
      where = {
        companyId: user.companyId,
        role: { in: ['TEAM_LEAD', 'AGENT', 'HR', 'ADMIN', 'SUPER_ADMIN'] },
        isActive: true,
        id: { not: user.id }
      }
    } else if (user.role === 'HR') {
      where = {
        companyId: user.companyId,
        isActive: true,
        id: { not: user.id }
      }
    } else if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') {
      where = {
        isActive: true,
        id: { not: user.id }
      }
    }

    const users = await prisma.user.findMany({
      where,
      select: { id: true, name: true, role: true, company: { select: { name: true } } },
      orderBy: { name: 'asc' }
    })

    res.json(users)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Server error' })
  }
})

module.exports = router