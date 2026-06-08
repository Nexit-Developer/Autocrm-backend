const prisma = require('../utils/prisma')
const { protect, authorize } = require('../middleware/auth')
const express = require('express')
const router = express.Router()

// Get admin stats
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

// Get pending users
router.get('/pending-users', protect, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const [agents, customers] = await Promise.all([
      prisma.user.findMany({
        where: { isActive: false },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.customer.findMany({
        where: { isApproved: false },
        orderBy: { createdAt: 'desc' }
      })
    ])
    res.json({ agents, customers })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Server error' })
  }
})

// Get all companies
router.get('/companies', protect, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const companies = await prisma.company.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' }
    })
    res.json(companies)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Server error' })
  }
})

// Get all active agents
router.get('/agents', protect, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const agents = await prisma.user.findMany({
      where: { role: 'AGENT', isActive: true },
      include: { company: true },
      orderBy: { name: 'asc' }
    })
    res.json(agents)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Server error' })
  }
})

// Approve agent
router.post('/approve-agent/:id', protect, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const { companyId, role } = req.body
    const { id } = req.params

    await prisma.user.update({
      where: { id: parseInt(id) },
      data: {
        isActive: true,
        companyId: parseInt(companyId),
        role: role
      }
    })

    res.json({ message: 'Agent approved successfully' })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Server error' })
  }
})

// Approve customer
router.post('/approve-customer/:id', protect, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const { companyId, assignedAgentId } = req.body
    const { id } = req.params

    await prisma.customer.update({
      where: { id: parseInt(id) },
      data: {
        isApproved: true,
        companyId: parseInt(companyId),
        assignedAgentId: parseInt(assignedAgentId)
      }
    })

    res.json({ message: 'Customer approved successfully' })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Server error' })
  }
})

// Reject agent
router.post('/reject/agent/:id', protect, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    await prisma.user.delete({
      where: { id: parseInt(req.params.id) }
    })
    res.json({ message: 'Agent rejected' })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Server error' })
  }
})

// Reject customer
router.post('/reject/customer/:id', protect, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    await prisma.customer.delete({
      where: { id: parseInt(req.params.id) }
    })
    res.json({ message: 'Customer rejected' })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Server error' })
  }
})
// Get all users
router.get('/users', protect, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      include: { company: true },
      orderBy: { createdAt: 'desc' }
    })
    res.json(users)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Server error' })
  }
})

// Update user role and company
router.put('/users/:id', protect, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const { role, companyId } = req.body
    await prisma.user.update({
      where: { id: parseInt(req.params.id) },
      data: {
        role,
        companyId: parseInt(companyId)
      }
    })
    res.json({ message: 'User updated successfully' })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Server error' })
  }
})

// Toggle user active status
router.put('/users/:id/toggle-active', protect, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: parseInt(req.params.id) }
    })
    await prisma.user.update({
      where: { id: parseInt(req.params.id) },
      data: { isActive: !user.isActive }
    })
    res.json({ message: 'User status updated' })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Server error' })
  }
})
// Add company
router.post('/companies', protect, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const { name } = req.body
    const company = await prisma.company.create({
      data: { name }
    })
    res.status(201).json(company)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Server error' })
  }
})

// Update company
router.put('/companies/:id', protect, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const { name } = req.body
    await prisma.company.update({
      where: { id: parseInt(req.params.id) },
      data: { name }
    })
    res.json({ message: 'Company updated successfully' })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Server error' })
  }
})

// Toggle company active
router.put('/companies/:id/toggle-active', protect, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const company = await prisma.company.findUnique({
      where: { id: parseInt(req.params.id) }
    })
    await prisma.company.update({
      where: { id: parseInt(req.params.id) },
      data: { isActive: !company.isActive }
    })
    res.json({ message: 'Company status updated' })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Server error' })
  }
})
// Get all managers
router.get('/managers', protect, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const managers = await prisma.user.findMany({
      where: { role: 'MANAGER', isActive: true },
      include: { company: true },
      orderBy: { name: 'asc' }
    })
    res.json(managers)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Server error' })
  }
})
module.exports = router