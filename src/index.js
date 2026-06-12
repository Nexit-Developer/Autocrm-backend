const express = require('express')
const cors = require('cors')
const http = require('http')
const { Server } = require('socket.io')
require('dotenv').config()
const { startCronJobs } = require('./utils/cronJobs')
const prisma = require('./utils/prisma')

const app = express()
const server = http.createServer(app)

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
})

app.use(cors())
app.use(express.json())

app.get('/', (req, res) => {
  res.json({ message: 'AutoCRM API is running!' })
})

app.use('/api/auth', require('./routes/auth'))
app.use('/api/admin', require('./routes/admin'))
app.use('/api/leads', require('./routes/leads'))
app.use('/api/customers', require('./routes/customers'))
app.use('/api/manager', require('./routes/manager'))
app.use('/api/teamlead', require('./routes/teamlead'))
app.use('/api/agent', require('./routes/agent'))
app.use('/api/hr', require('./routes/hr'))
app.use('/api/notifications', require('./routes/notifications'))
app.use('/api/announcements', require('./routes/announcements'))
app.use('/api/policy', require('./routes/policy'))
app.use('/api/messages', require('./routes/messages'))
app.use('/api/tasks', require('./routes/tasks'))

// Socket.io
const onlineUsers = new Map()

io.on('connection', (socket) => {
  console.log('User connected:', socket.id)

  // User joins with their ID
  socket.on('join', (userId) => {
    onlineUsers.set(userId, socket.id)
    socket.userId = userId
    console.log(`User ${userId} joined`)
  })

  // Send message
  socket.on('send_message', async (data) => {
    try {
      const { senderId, receiverId, content } = data

      // Save to database
      const message = await prisma.message.create({
        data: {
          senderId: parseInt(senderId),
          receiverId: parseInt(receiverId),
          content
        },
        include: {
          sender: { select: { id: true, name: true, role: true } },
          receiver: { select: { id: true, name: true, role: true } }
        }
      })

      // Send to receiver if online
      const receiverSocketId = onlineUsers.get(parseInt(receiverId))
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('receive_message', message)
      }

      // Send back to sender
      socket.emit('message_sent', message)

    } catch (error) {
      console.error('Socket message error:', error)
      socket.emit('message_error', { message: 'Failed to send message' })
    }
  })

  // Mark messages as read
  socket.on('mark_read', async (data) => {
    try {
      const { senderId, receiverId } = data
      await prisma.message.updateMany({
        where: {
          senderId: parseInt(senderId),
          receiverId: parseInt(receiverId),
          isRead: false
        },
        data: { isRead: true }
      })
    } catch (error) {
      console.error('Mark read error:', error)
    }
  })

  socket.on('disconnect', () => {
    if (socket.userId) {
      onlineUsers.delete(socket.userId)
    }
    console.log('User disconnected:', socket.id)
  })
})

const PORT = process.env.PORT || 5000

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`)
  startCronJobs()
})