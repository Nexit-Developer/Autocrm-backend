const { PrismaClient } = require('@prisma/client')
const { PrismaPg } = require('@prisma/adapter-pg')
const bcrypt = require('bcryptjs')
require('dotenv').config()

const adapter = new PrismaPg({ 
  connectionString: process.env.DATABASE_URL 
})

const prisma = new PrismaClient({ adapter })

const seed = async () => {
  try {
    console.log('Seeding database...')

    // Create parent company
    const nexitSolution = await prisma.company.upsert({
      where: { id: 1 },
      update: {},
      create: {
        name: 'Nexit Solution',
      }
    })
    console.log('✔ Nexit Solution company created')

    // Create sub companies
    const zenkiMotors = await prisma.company.upsert({
      where: { id: 2 },
      update: {},
      create: {
        name: 'Zenki Motors',
      }
    })
    console.log('✔ Zenki Motors company created')

    const primeWheel = await prisma.company.upsert({
      where: { id: 3 },
      update: {},
      create: {
        name: 'Prime Wheel',
      }
    })
    console.log('✔ Prime Wheel company created')

    // Create Super Admin
    const hashedPassword = await bcrypt.hash('superadmin123', 10)
    const superAdmin = await prisma.user.upsert({
      where: { email: 'superadmin@nexitsolution.com' },
      update: {},
      create: {
        name: 'Super Admin',
        email: 'superadmin@nexitsolution.com',
        password: hashedPassword,
        role: 'SUPER_ADMIN',
        companyId: nexitSolution.id
      }
    })
    console.log('✔ Super Admin created')

    // Create Admin
    const adminPassword = await bcrypt.hash('admin123', 10)
    const admin = await prisma.user.upsert({
      where: { email: 'admin@nexitsolution.com' },
      update: {},
      create: {
        name: 'Admin',
        email: 'admin@nexitsolution.com',
        password: adminPassword,
        role: 'ADMIN',
        companyId: nexitSolution.id
      }
    })
    console.log('✔ Admin created')

    // Create HR for Zenki Motors
    const hrPassword = await bcrypt.hash('hr123', 10)
    const hr = await prisma.user.upsert({
      where: { email: 'hr@zenkimotors.com' },
      update: {},
      create: {
        name: 'HR Manager',
        email: 'hr@zenkimotors.com',
        password: hrPassword,
        role: 'HR',
        companyId: zenkiMotors.id
      }
    })
    console.log('✔ HR created')

    // Create Manager for Zenki Motors
    const managerPassword = await bcrypt.hash('manager123', 10)
    const manager = await prisma.user.upsert({
      where: { email: 'manager@zenkimotors.com' },
      update: {},
      create: {
        name: 'Sales Manager',
        email: 'manager@zenkimotors.com',
        password: managerPassword,
        role: 'MANAGER',
        companyId: zenkiMotors.id
      }
    })
    console.log('✔ Manager created')

    // Create Team Lead for Zenki Motors
    const teamLeadPassword = await bcrypt.hash('teamlead123', 10)
    const teamLead = await prisma.user.upsert({
      where: { email: 'teamlead@zenkimotors.com' },
      update: {},
      create: {
        name: 'Team Lead',
        email: 'teamlead@zenkimotors.com',
        password: teamLeadPassword,
        role: 'TEAM_LEAD',
        companyId: zenkiMotors.id,
        managerId: manager.id
      }
    })
    console.log('✔ Team Lead created')

    // Create Agent for Zenki Motors
    const agentPassword = await bcrypt.hash('agent123', 10)
    const agent = await prisma.user.upsert({
      where: { email: 'agent@zenkimotors.com' },
      update: {},
      create: {
        name: 'Sales Agent',
        email: 'agent@zenkimotors.com',
        password: agentPassword,
        role: 'AGENT',
        companyId: zenkiMotors.id,
        managerId: teamLead.id
      }
    })
    console.log('✔ Agent created')

    console.log('\n✅ Database seeded successfully!')
    console.log('\n--- Login Credentials ---')
    console.log('Super Admin: superadmin@nexitsolution.com / superadmin123')
    console.log('Admin:       admin@nexitsolution.com / admin123')
    console.log('HR:          hr@zenkimotors.com / hr123')
    console.log('Manager:     manager@zenkimotors.com / manager123')
    console.log('Team Lead:   teamlead@zenkimotors.com / teamlead123')
    console.log('Agent:       agent@zenkimotors.com / agent123')

  } catch (error) {
    console.error('Seeding error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

seed()