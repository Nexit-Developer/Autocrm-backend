const cron = require('node-cron')
const prisma = require('./prisma')

const startCronJobs = () => {
  // Run every day at 2:00 AM — mark absent for anyone who never checked in
  cron.schedule('0 2 * * *', async () => {
    console.log('Running auto-absent job at 2:00 AM...')
    try {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      yesterday.setHours(17, 0, 0, 0) // shift starts 5 PM

      const startOfShift = new Date(yesterday)
      startOfShift.setHours(17, 0, 0, 0)

      const endOfShift = new Date(yesterday)
      endOfShift.setDate(endOfShift.getDate() + 1)
      endOfShift.setHours(2, 0, 0, 0)

      // Get all active employees
      const employees = await prisma.user.findMany({
        where: { isActive: true }
      })

      for (const emp of employees) {
        // Check if they already have attendance for this shift
        const existing = await prisma.attendance.findFirst({
          where: {
            userId: emp.id,
            date: {
              gte: startOfShift,
              lte: endOfShift
            }
          }
        })

        // If no attendance record — mark absent
        if (!existing) {
          await prisma.attendance.create({
            data: {
              userId: emp.id,
              date: startOfShift,
              status: 'ABSENT'
            }
          })
        }
      }

      console.log('Auto-absent job completed successfully')
    } catch (error) {
      console.error('Auto-absent job failed:', error)
    }
  })

  console.log('Cron jobs started')
}

module.exports = { startCronJobs }