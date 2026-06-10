const express = require('express')
const router = express.Router()
const { protect, authorize } = require('../middleware/auth')
const prisma = require('../utils/prisma')

// Import leads from Excel
router.post('/import', protect, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const { leads, companyId } = req.body

    if (!leads || leads.length === 0) {
      return res.status(400).json({ message: 'No leads provided' })
    }

    let imported = 0
    let skipped = 0

   for (const lead of leads) {
  const existing = await prisma.lead.findFirst({
    where: {
      phone: String(lead.phone),
      companyId: companyId
    }
  })

  if (existing) {
    skipped++
    continue
  }

  await prisma.lead.create({
    data: {
      name: String(lead.name || ''),
      phone: String(lead.phone || ''),
      email: lead.email ? String(lead.email) : null,
      city: lead.city ? String(lead.city) : null,
      source: 'Meta',
      platform: lead.platform ? String(lead.platform) : 'fb',
      adName: lead.adName ? String(lead.adName) : null,
      campaignName: lead.campaignName ? String(lead.campaignName) : null,
      status: 'NEW',
      companyId: parseInt(companyId),
      createdById: req.user.id
    }
  })
  imported++
}

    res.json({
      total: leads.length,
      imported,
      skipped
    })

  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Import failed' })
  }
})

// Get all leads
router.get('/', protect, authorize('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'TEAM_LEAD', 'AGENT'), async (req, res) => {
  try {
    const user = req.user
    let where = {}

    if (user.role === 'MANAGER') {
      // Manager only sees leads assigned TO them
      where = { assignedToId: user.id }
    } else if (user.role === 'TEAM_LEAD') {
      // Team lead only sees leads assigned TO them
      where = { assignedToId: user.id }
    } else if (user.role === 'AGENT') {
      // Agent only sees leads assigned TO them
      where = { assignedToId: user.id }
    }
    // SUPER_ADMIN and ADMIN see everything (where = {})

    const leads = await prisma.lead.findMany({
      where,
      include: {
        company: true,
        assignedTo: true,
        createdBy: true
      },
      orderBy: { createdAt: 'desc' }
    })
    res.json(leads)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Server error' })
  }
})

// Assign lead to manager (Admin does this)
// Assign lead to manager (Admin does this)
router.put('/:id/assign', protect, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const { assignedToId } = req.body
    await prisma.lead.update({
      where: { id: parseInt(req.params.id) },
      data: {
        assignedToId: parseInt(assignedToId),
        managerId: parseInt(assignedToId),
        teamLeadId: null,  // clear teamLeadId when assigning to manager
        status: 'ASSIGNED'
      }
    })
    res.json({ message: 'Lead assigned successfully' })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Server error' })
  }
})

// Bulk assign to manager
router.post('/bulk-assign', protect, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const { leadIds, assignedToId } = req.body
    await prisma.lead.updateMany({
      where: { id: { in: leadIds } },
      data: {
        assignedToId: parseInt(assignedToId),
        managerId: parseInt(assignedToId),
        teamLeadId: null,  // clear teamLeadId
        status: 'ASSIGNED'
      }
    })
    res.json({ message: `${leadIds.length} leads assigned successfully` })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Server error' })
  }
})
// Bulk assign leads to manager
router.post('/bulk-assign', protect, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
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
// Delete single lead
router.delete('/:id', protect, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    await prisma.activity.deleteMany({ where: { leadId: parseInt(req.params.id) } })
    await prisma.lead.delete({ where: { id: parseInt(req.params.id) } })
    res.json({ message: 'Lead deleted successfully' })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Server error' })
  }
})

// Bulk delete leads
router.post('/bulk-delete', protect, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const { leadIds } = req.body
    await prisma.activity.deleteMany({ where: { leadId: { in: leadIds } } })
    await prisma.lead.deleteMany({ where: { id: { in: leadIds } } })
    res.json({ message: `${leadIds.length} leads deleted successfully` })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Server error' })
  }
})
module.exports = router