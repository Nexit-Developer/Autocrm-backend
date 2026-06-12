const express = require('express')
const router = express.Router()
const { protect } = require('../middleware/auth')
const prisma = require('../utils/prisma')
const { sendNotification } = require('../utils/sendNotification')

// Get all tasks for current user
router.get('/', protect, async (req, res) => {
  try {
    const user = req.user
    let where = {}

    if (user.role === 'AGENT') {
      where = { assignedToId: user.id }
    } else if (user.role === 'TEAM_LEAD') {
      where = {
        OR: [
          { assignedToId: user.id },
          { createdById: user.id }
        ]
      }
    } else if (user.role === 'MANAGER') {
      where = {
        OR: [
          { assignedToId: user.id },
          { createdById: user.id }
        ]
      }
    } else if (user.role === 'HR') {
      where = { companyId: user.companyId }
    } else {
      // SUPER_ADMIN, ADMIN see all
      where = {}
    }

    const tasks = await prisma.task.findMany({
      where,
      include: {
        assignedTo: { select: { id: true, name: true, role: true } },
        createdBy: { select: { id: true, name: true, role: true } },
        company: { select: { name: true } },
        comments: {
          include: {
            user: { select: { id: true, name: true, role: true } }
          },
          orderBy: { createdAt: 'asc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    res.json(tasks)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Server error' })
  }
})

// Create task
router.post('/', protect, async (req, res) => {
  try {
    const { title, description, dueDate, priority, assignedToId, companyId } = req.body

    const task = await prisma.task.create({
      data: {
        title,
        description: description || null,
        dueDate: dueDate ? new Date(dueDate) : null,
        priority: priority || 'MEDIUM',
        status: 'TODO',
        companyId: parseInt(companyId || req.user.companyId),
        createdById: req.user.id,
        assignedToId: parseInt(assignedToId)
      },
      include: {
        assignedTo: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } }
      }
    })

    // Notify assignee
    await sendNotification(
      parseInt(assignedToId),
      '📋 New task assigned',
      `${req.user.name} assigned you a task: ${title}`,
      'INFO',
      '/tasks'
    )

    res.status(201).json(task)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Server error' })
  }
})

// Update task status
router.put('/:id/status', protect, async (req, res) => {
  try {
    const { status } = req.body
    const taskId = parseInt(req.params.id)

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        createdBy: { select: { id: true, name: true } },
        assignedTo: { select: { id: true, name: true } }
      }
    })

    if (!task) return res.status(404).json({ message: 'Task not found' })

    // Only assignee can mark as completed
    if (status === 'COMPLETED' && task.assignedToId !== req.user.id) {
      return res.status(403).json({ message: 'Only the assignee can mark task as completed' })
    }

    // Only creator or upper level can approve
    if (status === 'APPROVED' && task.createdById !== req.user.id) {
      return res.status(403).json({ message: 'Only the task creator can approve completion' })
    }

    await prisma.task.update({
      where: { id: taskId },
      data: { status }
    })

    // Notify creator when task is completed
    if (status === 'COMPLETED') {
      await sendNotification(
        task.createdById,
        '✅ Task completed',
        `${task.assignedTo.name} completed the task: ${task.title}. Please review and approve.`,
        'SUCCESS',
        '/tasks'
      )
    }

    // Notify assignee when task is approved
    if (status === 'APPROVED') {
      await sendNotification(
        task.assignedToId,
        '🎉 Task approved',
        `${req.user.name} approved your task: ${task.title}`,
        'SUCCESS',
        '/tasks'
      )
    }

    res.json({ message: 'Task status updated' })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Server error' })
  }
})

// Update task details
router.put('/:id', protect, async (req, res) => {
  try {
    const { title, description, dueDate, priority } = req.body
    const task = await prisma.task.findUnique({
      where: { id: parseInt(req.params.id) }
    })

    if (!task) return res.status(404).json({ message: 'Task not found' })
    if (task.createdById !== req.user.id) {
      return res.status(403).json({ message: 'Only task creator can edit' })
    }

    await prisma.task.update({
      where: { id: parseInt(req.params.id) },
      data: {
        title,
        description: description || null,
        dueDate: dueDate ? new Date(dueDate) : null,
        priority
      }
    })

    res.json({ message: 'Task updated successfully' })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Server error' })
  }
})

// Delete task
router.delete('/:id', protect, async (req, res) => {
  try {
    const task = await prisma.task.findUnique({
      where: { id: parseInt(req.params.id) }
    })

    if (!task) return res.status(404).json({ message: 'Task not found' })
    if (task.createdById !== req.user.id) {
      return res.status(403).json({ message: 'Only task creator can delete' })
    }

    await prisma.taskComment.deleteMany({ where: { taskId: parseInt(req.params.id) } })
    await prisma.task.delete({ where: { id: parseInt(req.params.id) } })

    res.json({ message: 'Task deleted' })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Server error' })
  }
})

// Add comment
router.post('/:id/comments', protect, async (req, res) => {
  try {
    const { content } = req.body
    const taskId = parseInt(req.params.id)

    const task = await prisma.task.findUnique({
      where: { id: taskId }
    })

    if (!task) return res.status(404).json({ message: 'Task not found' })

    const comment = await prisma.taskComment.create({
      data: {
        content,
        taskId,
        userId: req.user.id
      },
      include: {
        user: { select: { id: true, name: true, role: true } }
      }
    })

    // Notify the other person
    const notifyId = task.createdById === req.user.id
      ? task.assignedToId
      : task.createdById

    await sendNotification(
      notifyId,
      '💬 New comment on task',
      `${req.user.name} commented on: ${task.title}`,
      'INFO',
      '/tasks'
    )

    res.status(201).json(comment)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Server error' })
  }
})

// Get users available to assign tasks to
router.get('/assignable-users', protect, async (req, res) => {
  try {
    const user = req.user
    let where = {}

    if (user.role === 'MANAGER') {
      where = {
        companyId: user.companyId,
        role: { in: ['TEAM_LEAD', 'AGENT'] },
        isActive: true
      }
    } else if (user.role === 'TEAM_LEAD') {
      where = {
        companyId: user.companyId,
        role: 'AGENT',
        isActive: true
      }
    } else if (user.role === 'HR') {
      where = {
        companyId: user.companyId,
        isActive: true,
        id: { not: user.id }
      }
    } else {
      // SUPER_ADMIN, ADMIN
      where = {
        isActive: true,
        id: { not: user.id }
      }
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        role: true,
        company: { select: { name: true } }
      },
      orderBy: { name: 'asc' }
    })

    res.json(users)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Server error' })
  }
})

module.exports = router