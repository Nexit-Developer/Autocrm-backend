const prisma = require('../utils/prisma')
const { protect, authorize } = require('../middleware/auth')
const express = require('express')
const router = express.Router()

// Get admin stats
const { getOrSet, invalidate, invalidatePattern } = require('../utils/cache')

// Get admin stats - cache for 2 minutes
router.get('/stats', protect, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const data = await getOrSet('admin:stats', async () => {
      const [pendingUsers, totalAgents, totalLeads, totalCustomers] = await Promise.all([
        prisma.user.count({ where: { isActive: false } }),
        prisma.user.count({ where: { role: 'AGENT', isActive: true } }),
        prisma.lead.count(),
        prisma.customer.count(),
      ])
      return { pendingUsers, totalAgents, totalLeads, totalCustomers }
    }, 120)
    res.json(data)
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

// Get all companies - cache for 10 minutes
router.get('/companies', protect, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const data = await getOrSet('admin:companies', async () => {
      return await prisma.company.findMany({
        where: { isActive: true },
        orderBy: { name: 'asc' }
      })
    }, 600)
    res.json(data)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Server error' })
  }
})

// Get all agents - cache for 5 minutes
router.get('/agents', protect, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const data = await getOrSet('admin:agents', async () => {
      return await prisma.user.findMany({
        where: { role: 'AGENT', isActive: true },
        include: { company: true },
        orderBy: { name: 'asc' }
      })
    }, 300)
    res.json(data)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Server error' })
  }
})

// Approve agent
const { sendNotificationToAdmins } = require('../utils/sendNotification')
 // Clear cache so new user appears immediately
    invalidate('admin:agents')
    invalidate('admin:stats')
    invalidatePattern('admin:')

// In approve agent route add:
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

    // Notify the approved user
    const { sendNotification } = require('../utils/sendNotification')
    await sendNotification(
      
  parseInt(id),
  'Account approved',
  'Your account has been approved. You can now login to AutoCRM.',
  'SUCCESS',
  '/profile'
)

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
// Get all managers - cache for 5 minutes
router.get('/managers', protect, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const data = await getOrSet('admin:managers', async () => {
      return await prisma.user.findMany({
        where: { role: 'MANAGER', isActive: true },
        include: { company: true },
        orderBy: { name: 'asc' }
      })
    }, 300)
    res.json(data)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Server error' })
  }
})
// Get all employees across all companies
router.get('/all-employees', protect, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const employees = await prisma.user.findMany({
      where: { isActive: true },
      include: { company: true },
      orderBy: { name: 'asc' }
    })
    res.json(employees)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Server error' })
  }
})

// Get payroll across all companies
router.get('/payroll', protect, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const { month } = req.query
    const payrolls = await prisma.payroll.findMany({
      where: { month },
      include: { user: { include: { company: true } } }
    })
    res.json(payrolls)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Server error' })
  }
})

// Get performance across all companies
router.get('/performance', protect, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const employees = await prisma.user.findMany({
      where: {
        isActive: true,
        role: { in: ['AGENT', 'TEAM_LEAD', 'MANAGER'] }
      },
      include: {
        company: true,
        _count: { select: { assignedLeads: true } }
      }
    })

    const performance = await Promise.all(
      employees.map(async (emp) => {
        const [contactedLeads, convertedLeads] = await Promise.all([
          prisma.lead.count({
            where: {
              assignedToId: emp.id,
              status: { in: ['CALLED', 'INTERESTED', 'CONVERTED'] }
            }
          }),
          prisma.lead.count({
            where: { assignedToId: emp.id, status: 'CONVERTED' }
          })
        ])
        return {
          id: emp.id,
          name: emp.name,
          email: emp.email,
          role: emp.role,
          companyId: emp.companyId,
          companyName: emp.company?.name,
          totalLeads: emp._count.assignedLeads,
          contactedLeads,
          convertedLeads
        }
      })
    )

    res.json(performance)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Server error' })
  }
})
module.exports = router