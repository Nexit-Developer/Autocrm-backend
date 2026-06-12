const express = require('express')
const router = express.Router()
const { protect, authorize } = require('../middleware/auth')
const prisma = require('../utils/prisma')

// Get team lead stats
router.get('/stats', protect, authorize('TEAM_LEAD'), async (req, res) => {
  try {
    const teamLeadId = req.user.id
    const [totalLeads, assignedLeads, convertedLeads, totalAgents] = await Promise.all([
      prisma.lead.count({ where: { teamLeadId } }),
      prisma.lead.count({ where: { teamLeadId, assignedToId: { not: null } } }),
      prisma.lead.count({ where: { teamLeadId, status: 'CONVERTED' } }),
      prisma.user.count({ where: { role: 'AGENT', companyId: req.user.companyId, isActive: true } }),
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
      where: { teamLeadId: req.user.id },
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

// Get all leads assigned to this team lead
router.get('/leads', protect, authorize('TEAM_LEAD'), async (req, res) => {
  try {
    const leads = await prisma.lead.findMany({
      where: { teamLeadId: req.user.id },
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
const { sendNotification } = require('../utils/sendNotification')

router.put('/leads/:id/assign', protect, authorize('TEAM_LEAD'), async (req, res) => {
  try {
    const { assignedToId } = req.body
    const lead = await prisma.lead.update({
      where: { id: parseInt(req.params.id) },
      data: {
        assignedToId: parseInt(assignedToId),
        status: 'ASSIGNED'
      }
    })

   await sendNotification(
  parseInt(assignedToId),
  'New lead assigned',
  `Team Lead assigned you a new lead: ${lead.name}`,
  'INFO',
  '/agent/leads'
)
    res.json({ message: 'Lead assigned successfully' })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Server error' })
  }
})

// Bulk assign to agent
router.post('/leads/bulk-assign', protect, authorize('TEAM_LEAD'), async (req, res) => {
  try {
    const { leadIds, assignedToId } = req.body
    await prisma.lead.updateMany({
      where: { id: { in: leadIds } },
      data: {
        assignedToId: parseInt(assignedToId),
        status: 'ASSIGNED'
      }
    })
    res.json({ message: `${leadIds.length} leads assigned successfully` })
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
        _count: { select: { assignedLeads: true } }
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