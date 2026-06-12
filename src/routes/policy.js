const express = require('express')
const router = express.Router()
const { protect, authorize } = require('../middleware/auth')
const prisma = require('../utils/prisma')

// Get company policy
router.get('/', protect, async (req, res) => {
  try {
    const policy = await prisma.policy.findFirst({
      where: { companyId: req.user.companyId },
      include: { updatedBy: { select: { name: true } } }
    })
    res.json(policy)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Server error' })
  }
})

// Create or update policy (HR only)
router.post('/', protect, authorize('HR', 'SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const { title, content } = req.body

    const existing = await prisma.policy.findFirst({
      where: { companyId: req.user.companyId }
    })

    if (existing) {
      await prisma.policy.update({
        where: { id: existing.id },
        data: { title, content, updatedById: req.user.id }
      })
    } else {
      await prisma.policy.create({
        data: {
          title,
          content,
          companyId: req.user.companyId,
          updatedById: req.user.id
        }
      })
    }

    res.json({ message: 'Policy saved successfully' })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Server error' })
  }
})

module.exports = router