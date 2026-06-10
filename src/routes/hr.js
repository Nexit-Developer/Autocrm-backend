const express = require('express')
const router = express.Router()
const { protect, authorize } = require('../middleware/auth')
const prisma = require('../utils/prisma')

// Get HR stats
router.get('/stats', protect, authorize('HR', 'SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const companyId = req.user.companyId
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const [totalEmployees, presentToday, pendingLeaves, unpaidPayrolls] = await Promise.all([
      prisma.user.count({ where: { companyId, isActive: true } }),
      prisma.attendance.count({
        where: {
          user: { companyId },
          date: { gte: today },
          status: 'PRESENT'
        }
      }),
      prisma.leave.count({ where: { user: { companyId }, status: 'PENDING' } }),
      prisma.payroll.count({ where: { user: { companyId }, isPaid: false } }),
    ])

    res.json({ totalEmployees, presentToday, pendingLeaves, unpaidPayrolls })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Server error' })
  }
})

// Get all employees
router.get('/employees', protect, authorize('HR', 'SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const employees = await prisma.user.findMany({
      where: {
        companyId: req.user.companyId,
        isActive: true
      },
      orderBy: { name: 'asc' }
    })
    res.json(employees)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Server error' })
  }
})

// Get attendance by date
router.get('/attendance', protect, authorize('HR', 'SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const { date } = req.query
    const startDate = new Date(date)
    startDate.setHours(0, 0, 0, 0)
    const endDate = new Date(date)
    endDate.setHours(23, 59, 59, 999)

    const attendance = await prisma.attendance.findMany({
      where: {
        user: { companyId: req.user.companyId },
        date: { gte: startDate, lte: endDate }
      },
      include: { user: true }
    })
    res.json(attendance)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Server error' })
  }
})

// Mark attendance
router.post('/attendance', protect, authorize('HR', 'SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const { userId, date, status, checkIn, checkOut } = req.body

    const startDate = new Date(date)
    startDate.setHours(0, 0, 0, 0)
    const endDate = new Date(date)
    endDate.setHours(23, 59, 59, 999)

    const existing = await prisma.attendance.findFirst({
      where: {
        userId: parseInt(userId),
        date: { gte: startDate, lte: endDate }
      }
    })

    const checkInTime = checkIn ? new Date(`${date}T${checkIn}`) : null
    const checkOutTime = checkOut ? new Date(`${date}T${checkOut}`) : null

    if (existing) {
      await prisma.attendance.update({
        where: { id: existing.id },
        data: { status, checkIn: checkInTime, checkOut: checkOutTime }
      })
    } else {
      await prisma.attendance.create({
        data: {
          userId: parseInt(userId),
          date: new Date(date),
          status,
          checkIn: checkInTime,
          checkOut: checkOutTime
        }
      })
    }

    res.json({ message: 'Attendance marked successfully' })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Server error' })
  }
})

// Get all leaves
router.get('/leaves', protect, authorize('HR', 'SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const leaves = await prisma.leave.findMany({
      where: { user: { companyId: req.user.companyId } },
      include: { user: true },
      orderBy: { createdAt: 'desc' }
    })
    res.json(leaves)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Server error' })
  }
})

// Update leave status
router.put('/leaves/:id', protect, authorize('HR', 'SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    await prisma.leave.update({
      where: { id: parseInt(req.params.id) },
      data: { status: req.body.status }
    })
    res.json({ message: 'Leave updated successfully' })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Server error' })
  }
})

// Get payroll by month
router.get('/payroll', protect, authorize('HR', 'SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const { month } = req.query
    const payrolls = await prisma.payroll.findMany({
      where: {
        user: { companyId: req.user.companyId },
        month
      },
      include: { user: true }
    })
    res.json(payrolls)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Server error' })
  }
})

// Create or update payroll
router.post('/payroll', protect, authorize('HR', 'SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const { userId, month, basicSalary, deductions, bonus, netSalary } = req.body

    const existing = await prisma.payroll.findFirst({
      where: { userId: parseInt(userId), month }
    })

    if (existing) {
      await prisma.payroll.update({
        where: { id: existing.id },
        data: { basicSalary, deductions, bonus, netSalary }
      })
    } else {
      await prisma.payroll.create({
        data: {
          userId: parseInt(userId),
          month,
          basicSalary,
          deductions,
          bonus,
          netSalary
        }
      })
    }

    res.json({ message: 'Payroll saved successfully' })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Server error' })
  }
})

// Mark payroll as paid
router.put('/payroll/:id/mark-paid', protect, authorize('HR', 'SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    await prisma.payroll.update({
      where: { id: parseInt(req.params.id) },
      data: { isPaid: true }
    })
    res.json({ message: 'Payroll marked as paid' })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Server error' })
  }
})

// Get performance data
router.get('/performance', protect, authorize('HR', 'SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const employees = await prisma.user.findMany({
      where: {
        companyId: req.user.companyId,
        isActive: true,
        role: { in: ['AGENT', 'TEAM_LEAD', 'MANAGER'] }
      },
      include: {
        _count: {
          select: { assignedLeads: true }
        }
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
// Employee check in
// Employee check in
router.post('/attendance/checkin', protect, async (req, res) => {
  try {
    const now = new Date()
    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date()
    endOfDay.setHours(23, 59, 59, 999)

    const existing = await prisma.attendance.findFirst({
      where: {
        userId: req.user.id,
        date: { gte: startOfDay, lte: endOfDay }
      }
    })

    if (existing) {
      return res.status(400).json({ message: 'Already checked in today' })
    }

    const hours = now.getHours()
    const minutes = now.getMinutes()
    const timeInMinutes = hours * 60 + minutes

    // Office starts 5:00 PM = 17:00 = 1020 minutes
    // Late after 6:00 PM = 18:00 = 1080 minutes
    // Absent after 2:00 AM = 02:00 = 120 minutes (next day)
    // So absent window: 0 - 120 minutes (12:00 AM to 2:00 AM)

    let status = 'PRESENT'

    if (timeInMinutes >= 0 && timeInMinutes <= 120) {
      // Between 12:00 AM and 2:00 AM — too late, considered absent
      return res.status(400).json({ 
        message: 'Check in window has closed. You will be marked absent for today.' 
      })
    } else if (timeInMinutes >= 1080) {
      // After 6:00 PM
      status = 'LATE'
    } else if (timeInMinutes >= 1020) {
      // Between 5:00 PM and 6:00 PM
      status = 'PRESENT'
    }

    await prisma.attendance.create({
      data: {
        userId: req.user.id,
        date: now,
        checkIn: now,
        status
      }
    })

    res.json({ message: 'Checked in successfully', checkIn: now, status })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Server error' })
  }
})

// Employee check out
router.post('/attendance/checkout', protect, async (req, res) => {
  try {
    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date()
    endOfDay.setHours(23, 59, 59, 999)

    const existing = await prisma.attendance.findFirst({
      where: {
        userId: req.user.id,
        date: { gte: startOfDay, lte: endOfDay }
      }
    })

    if (!existing) {
      return res.status(400).json({ message: 'Please check in first' })
    }

    if (existing.checkOut) {
      return res.status(400).json({ message: 'Already checked out today' })
    }

    const now = new Date()
    await prisma.attendance.update({
      where: { id: existing.id },
      data: { checkOut: now }
    })

    res.json({ message: 'Checked out successfully', checkOut: now })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Server error' })
  }
})

// Get my today attendance
router.get('/attendance/my-today', protect, async (req, res) => {
  try {
    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date()
    endOfDay.setHours(23, 59, 59, 999)

    const attendance = await prisma.attendance.findFirst({
      where: {
        userId: req.user.id,
        date: { gte: startOfDay, lte: endOfDay }
      }
    })

    res.json(attendance)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Server error' })
  }
})

// HR update attendance status
router.put('/attendance/:id/status', protect, authorize('HR', 'SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    await prisma.attendance.update({
      where: { id: parseInt(req.params.id) },
      data: { status: req.body.status }
    })
    res.json({ message: 'Status updated' })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Server error' })
  }
})
// Get monthly attendance for an employee
router.get('/attendance/monthly/:userId', protect, authorize('HR', 'SUPER_ADMIN', 'ADMIN', 'MANAGER', 'TEAM_LEAD'), async (req, res) => {
  try {
    const { month } = req.query
    const startDate = new Date(`${month}-01`)
    const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0, 23, 59, 59)

    const attendance = await prisma.attendance.findMany({
      where: {
        userId: parseInt(req.params.userId),
        date: { gte: startDate, lte: endDate }
      },
      orderBy: { date: 'asc' }
    })

    const user = await prisma.user.findUnique({
      where: { id: parseInt(req.params.userId) },
      select: { name: true, role: true, email: true }
    })

    res.json({ user, attendance })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Server error' })
  }
})
// Any employee can apply for leave
router.post('/leaves/apply', protect, async (req, res) => {
  try {
    const { type, reason, startDate, endDate } = req.body
    await prisma.leave.create({
      data: {
        userId: req.user.id,
        type,
        reason,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        status: 'PENDING'
      }
    })
    res.status(201).json({ message: 'Leave application submitted successfully' })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Server error' })
  }
})

// Get my leaves
router.get('/leaves/my', protect, async (req, res) => {
  try {
    const leaves = await prisma.leave.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' }
    })
    res.json(leaves)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Server error' })
  }
})
module.exports = router