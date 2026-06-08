const express = require('express')
const router = express.Router()
const { protect, authorize } = require('../middleware/auth')
const prisma = require('../utils/prisma')

// Get team lead stats
router.get('/stats', protect, authorize('TEAM_LEAD'), async (req, res) => {
  try {
    const companyId = req.user.companyId

    const [totalLeads, assignedLeads, convertedLeads, totalAgents] = await Promise.all([
      prisma.lead.count({ where: { companyId } }),
      prisma.lead.count({ where: { companyId, status: 'ASSIGNED' } }),
      prisma.lead.count({ where: { companyId, status: 'CONVERTED' } }),
      prisma.user.count({ where: { role: 'AGENT', companyId, isActive: true } }),
    ])

    res.json({ totalLeads, assignedLeads, convertedLeads, totalAgents })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Server error' })
  }
})

// Get recent leads
router.get('/recent-leads', protect, authorize('TEAM_LEAD'), async (req, res) => {
  try {
    const leads = await prisma.lead.findMany({
      where: { companyId: req.user.companyId },
      orderBy: { createdAt: 'desc' },
      take: 8,
      include: { assignedTo: true }
    })
    res.json(leads)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Server error' })
  }
})

// Get agents in company
router.get('/agents', protect, authorize('TEAM_LEAD'), async (req, res) => {
  try {
    const agents = await prisma.user.findMany({
      where: {
        role: 'AGENT',
        companyId: req.user.companyId,
        isActive: true
      },
      include: {
        _count: {
          select: { assignedLeads: true }
        }
      },
      orderBy: { name: 'asc' }
    })
    res.json(agents)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Server error' })
  }
})

// Get all leads for team lead company
router.get('/leads', protect, authorize('TEAM_LEAD'), async (req, res) => {
  try {
    const leads = await prisma.lead.findMany({
      where: { companyId: req.user.companyId },
      include: { assignedTo: true },
      orderBy: { createdAt: 'desc' }
    })
    res.json(leads)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Server error' })
  }
})

// Assign lead to agent
router.put('/leads/:id/assign', protect, authorize('TEAM_LEAD'), async (req, res) => {
  try {
    const { assignedToId } = req.body
    await prisma.lead.update({
      where: { id: parseInt(req.params.id) },
      data: {
        assignedToId: parseInt(assignedToId),
        status: 'ASSIGNED'
      }
    })
    res.json({ message: 'Lead assigned successfully' })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Server error' })
  }
})

module.exports = router