const express = require('express')
const router = express.Router()
const { protect, authorize } = require('../middleware/auth')
const prisma = require('../utils/prisma')

// Get manager stats
router.get('/stats', protect, authorize('MANAGER'), async (req, res) => {
  try {
    const userId = req.user.id
    const companyId = req.user.companyId

    const [totalLeads, assignedLeads, convertedLeads, teamLeads] = await Promise.all([
      prisma.lead.count({ where: { companyId } }),
      prisma.lead.count({ where: { companyId, status: 'ASSIGNED' } }),
      prisma.lead.count({ where: { companyId, status: 'CONVERTED' } }),
      prisma.user.count({ where: { role: 'TEAM_LEAD', companyId, isActive: true } }),
    ])

    res.json({ totalLeads, assignedLeads, convertedLeads, teamLeads })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Server error' })
  }
})

// Get recent leads
router.get('/recent-leads', protect, authorize('MANAGER'), async (req, res) => {
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

// Get team leads
router.get('/team', protect, authorize('MANAGER'), async (req, res) => {
  try {
    const teamLeads = await prisma.user.findMany({
      where: {
        role: 'TEAM_LEAD',
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
    res.json(teamLeads)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Server error' })
  }
})

// Get all leads for manager company
router.get('/leads', protect, authorize('MANAGER'), async (req, res) => {
  try {
    const leads = await prisma.lead.findMany({
      where: { companyId: req.user.companyId },
      include: { assignedTo: true, company: true },
      orderBy: { createdAt: 'desc' }
    })
    res.json(leads)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Server error' })
  }
})

// Assign lead to team lead
router.put('/leads/:id/assign', protect, authorize('MANAGER'), async (req, res) => {
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

// Get team leads and agents for assigning
router.get('/team-leads', protect, authorize('MANAGER'), async (req, res) => {
  try {
    const teamLeads = await prisma.user.findMany({
      where: {
        companyId: req.user.companyId,
        role: 'TEAM_LEAD',
        isActive: true
      },
      orderBy: { name: 'asc' }
    })
    res.json(teamLeads)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Server error' })
  }
})

// Promote agent to team lead
router.put('/promote/:id', protect, authorize('MANAGER'), async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: parseInt(req.params.id) }
    })

    if (user.companyId !== req.user.companyId) {
      return res.status(403).json({ message: 'Not authorized' })
    }

    await prisma.user.update({
      where: { id: parseInt(req.params.id) },
      data: { role: 'TEAM_LEAD' }
    })

    res.json({ message: 'Agent promoted to Team Lead' })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Server error' })
  }
})
// Get all agents in company
router.get('/agents', protect, authorize('MANAGER'), async (req, res) => {
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

module.exports = router