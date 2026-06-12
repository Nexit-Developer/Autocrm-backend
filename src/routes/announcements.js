const express = require('express')
const router = express.Router()
const { protect, authorize } = require('../middleware/auth')
const prisma = require('../utils/prisma')
const { sendNotificationToCompany } = require('../utils/sendNotification')

// Get all announcements for my company
router.get('/', protect, async (req, res) => {
  try {
    const announcements = await prisma.announcement.findMany({
      where: { companyId: req.user.companyId },
      include: { createdBy: { select: { name: true, role: true } } },
      orderBy: { createdAt: 'desc' }
    })
    res.json(announcements)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Server error' })
  }
})

// Create announcement (HR only)
router.post('/', protect, authorize('HR', 'SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const { title, message } = req.body

    const announcement = await prisma.announcement.create({
      data: {
        title,
        message,
        createdById: req.user.id,
        companyId: req.user.companyId
      }
    })

    // Notify all employees in company
    await sendNotificationToCompany(
  req.user.companyId,
  '📢 New announcement',
  title,
  'INFO',
  req.user.id,
  '/announcements'
)

    res.status(201).json(announcement)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Server error' })
  }
})

// Update announcement (HR only)
router.put('/:id', protect, authorize('HR', 'SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const { title, message } = req.body
    await prisma.announcement.update({
      where: { id: parseInt(req.params.id) },
      data: { title, message }
    })
    res.json({ message: 'Announcement updated' })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Server error' })
  }
})

// Delete announcement (HR only)
router.delete('/:id', protect, authorize('HR', 'SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    await prisma.announcement.delete({
      where: { id: parseInt(req.params.id) }
    })
    res.json({ message: 'Announcement deleted' })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Server error' })
  }
})

module.exports = router