const express = require('express')
const router = express.Router()
const { protect, authorize } = require('../middleware/auth')
const prisma = require('../utils/prisma')

// Get all customers
router.get('/', protect, authorize('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'TEAM_LEAD', 'AGENT'), async (req, res) => {
  try {
    const user = req.user
    let where = { isApproved: true }

    if (user.role === 'AGENT') {
      where = { ...where, assignedAgentId: user.id }
    } else if (user.role === 'MANAGER' || user.role === 'TEAM_LEAD') {
      where = { ...where, companyId: user.companyId }
    }

    const customers = await prisma.customer.findMany({
      where,
      include: {
        company: true,
        assignedAgent: true,
      },
      orderBy: { createdAt: 'desc' }
    })
    res.json(customers)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Server error' })
  }
})

// Update customer
router.put('/:id', protect, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const { paymentStatus, deliveryStatus, carModel, carColor, amount, assignedAgentId } = req.body

    await prisma.customer.update({
      where: { id: parseInt(req.params.id) },
      data: {
        paymentStatus,
        deliveryStatus: deliveryStatus || null,
        carModel: carModel || null,
        carColor: carColor || null,
        amount: amount ? parseFloat(amount) : null,
        assignedAgentId: assignedAgentId ? parseInt(assignedAgentId) : null
      }
    })
    res.json({ message: 'Customer updated successfully' })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Server error' })
  }
})

module.exports = router