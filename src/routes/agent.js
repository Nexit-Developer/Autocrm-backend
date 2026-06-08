const express = require('express')
const router = express.Router()
const { protect, authorize } = require('../middleware/auth')
const prisma = require('../utils/prisma')

// Get agent stats
router.get('/stats', protect, authorize('AGENT'), async (req, res) => {
  try {
    const agentId = req.user.id

    const [totalLeads, calledLeads, interestedLeads, convertedLeads] = await Promise.all([
      prisma.lead.count({ where: { assignedToId: agentId } }),
      prisma.lead.count({ where: { assignedToId: agentId, status: 'CALLED' } }),
      prisma.lead.count({ where: { assignedToId: agentId, status: 'INTERESTED' } }),
      prisma.lead.count({ where: { assignedToId: agentId, status: 'CONVERTED' } }),
    ])

    res.json({ totalLeads, calledLeads, interestedLeads, convertedLeads })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Server error' })
  }
})

// Get agent leads
router.get('/leads', protect, authorize('AGENT'), async (req, res) => {
  try {
    const leads = await prisma.lead.findMany({
      where: { assignedToId: req.user.id },
      include: {
        activities: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      },
      orderBy: { createdAt: 'desc' }
    })
    res.json(leads)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Server error' })
  }
})

// Log activity
router.post('/leads/:id/activity', protect, authorize('AGENT'), async (req, res) => {
  try {
    const { type, notes, status } = req.body
    const leadId = parseInt(req.params.id)

    // Verify lead belongs to agent
    const lead = await prisma.lead.findFirst({
      where: { id: leadId, assignedToId: req.user.id }
    })

    if (!lead) {
      return res.status(403).json({ message: 'Not authorized' })
    }

    // Create activity
    await prisma.activity.create({
      data: {
        type,
        notes,
        leadId,
        userId: req.user.id
      }
    })

    // Update lead status
    if (status) {
      await prisma.lead.update({
        where: { id: leadId },
        data: { status }
      })
    }

    res.json({ message: 'Activity logged successfully' })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Server error' })
  }
})

// Get lead activities
router.get('/leads/:id/activities', protect, authorize('AGENT'), async (req, res) => {
  try {
    const activities = await prisma.activity.findMany({
      where: { leadId: parseInt(req.params.id) },
      include: { user: true },
      orderBy: { createdAt: 'desc' }
    })
    res.json(activities)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Server error' })
  }
})

module.exports = router