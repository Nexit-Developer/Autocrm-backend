const express = require('express')
const router = express.Router()
const { protect, authorize } = require('../middleware/auth')
const prisma = require('../utils/prisma')

// @desc    Get admin dashboard stats
// @route   GET /api/admin/stats
router.get('/stats', protect, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const [pendingUsers, totalAgents, totalLeads, totalCustomers] = await Promise.all([
      prisma.user.count({ where: { isActive: false } }),
      prisma.user.count({ where: { role: 'AGENT', isActive: true } }),
      prisma.lead.count(),
      prisma.customer.count(),
    ])

    res.json({ pendingUsers, totalAgents, totalLeads, totalCustomers })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Server error' })
  }
})

module.exports = router