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
      // Check duplicate by phone
      const existing = await prisma.lead.findFirst({
        where: {
          phone: lead.phone,
          companyId: companyId
        }
      })

      if (existing) {
        skipped++
        continue
      }

      await prisma.lead.create({
        data: {
          name: lead.name,
          phone: lead.phone,
          email: lead.email || null,
          city: lead.city || null,
          source: 'Meta',
          status: 'NEW',
          companyId: companyId,
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

    if (user.role === 'MANAGER' || user.role === 'TEAM_LEAD') {
      where = { companyId: user.companyId }
    } else if (user.role === 'AGENT') {
      where = { assignedToId: user.id }
    }

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

// Assign lead to manager
router.put('/:id/assign', protect, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const { assignedToId } = req.body
    await prisma.lead.update({
      where: { id: parseInt(req.params.id) },
      data: {
        assignedToId,
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