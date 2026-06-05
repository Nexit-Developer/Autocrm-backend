const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const prisma = require('../utils/prisma')
const { sendOTPEmail } = require('../utils/sendEmail')
require('dotenv').config()

// Generate JWT token
const generateToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      role: user.role,
      companyId: user.companyId
    },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  )
}

// Generate 6 digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

// @desc    Send OTP to email
// @route   POST /api/auth/send-otp
const sendOTP = async (req, res) => {
  try {
    const { email, name } = req.body

    if (!email || !name) {
      return res.status(400).json({ message: 'Email and name are required' })
    }

    // Check if email already registered
    const existingUser = await prisma.user.findUnique({ where: { email } })
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered' })
    }

    // Check existing customer email
    const existingCustomer = await prisma.customer.findUnique({ where: { email } })
    if (existingCustomer) {
      return res.status(400).json({ message: 'Email already registered' })
    }

    // Delete any existing OTP for this email
    await prisma.oTP.deleteMany({ where: { email } })

    // Generate OTP
    const otp = generateOTP()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

    // Save OTP to database
    await prisma.oTP.create({
      data: { email, otp, expiresAt }
    })

    // Send email
    await sendOTPEmail(email, name, otp)

    res.json({ message: 'OTP sent successfully' })

  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Failed to send OTP' })
  }
}

// @desc    Verify OTP
// @route   POST /api/auth/verify-otp
const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body

    const record = await prisma.oTP.findFirst({
      where: { email, otp }
    })

    if (!record) {
      return res.status(400).json({ message: 'Invalid OTP' })
    }

    if (new Date() > record.expiresAt) {
      await prisma.oTP.delete({ where: { id: record.id } })
      return res.status(400).json({ message: 'OTP has expired. Please request a new one.' })
    }

    // Delete OTP after verification
    await prisma.oTP.delete({ where: { id: record.id } })

    res.json({ message: 'OTP verified successfully', verified: true })

  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'OTP verification failed' })
  }
}

// @desc    Register as Agent
// @route   POST /api/auth/register/agent
const registerAgent = async (req, res) => {
  try {
    const { name, email, password, phone } = req.body

    // Check if email exists
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return res.status(400).json({ message: 'Email already registered' })
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        phone,
        role: 'AGENT',
        isActive: false // Cannot login until admin approves
      }
    })

    res.status(201).json({
      message: 'Registration successful! Your account is pending admin approval. You will be notified once approved.',
    })

  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Registration failed' })
  }
}

// @desc    Register as Customer
// @route   POST /api/auth/register/customer
const registerCustomer = async (req, res) => {
  try {
    const { name, email, password, phone } = req.body

    // Check if email exists
    const existing = await prisma.customer.findUnique({ where: { email } })
    if (existing) {
      return res.status(400).json({ message: 'Email already registered' })
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const customer = await prisma.customer.create({
      data: {
        name,
        email,
        password: hashedPassword,
        phone,
        paymentStatus: 'UNPAID',
        isApproved: false, // Cannot login until admin approves
        leadId: null
      }
    })

    res.status(201).json({
      message: 'Registration successful! Your account is pending admin approval. You will be notified once approved.',
    })

  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Registration failed' })
  }
}

// @desc    Login user
// @route   POST /api/auth/login
const login = async (req, res) => {
  try {
    const { email, password } = req.body

    const user = await prisma.user.findUnique({
      where: { email },
      include: { company: true }
    })

    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' })
    }

    if (!user.isActive) {
      return res.status(401).json({ message: 'Your account is pending admin approval' })
    }

    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' })
    }

    res.json({
      token: generateToken(user),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        company: user.company
      }
    })

  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Server error' })
  }
}

// @desc    Customer login
// @route   POST /api/auth/customer/login
const customerLogin = async (req, res) => {
  try {
    const { email, password } = req.body

    const customer = await prisma.customer.findUnique({
      where: { email }
    })

    if (!customer) {
      return res.status(401).json({ message: 'Invalid email or password' })
    }

    if (!customer.isApproved) {
      return res.status(401).json({ message: 'Your account is pending admin approval' })
    }

    const isMatch = await bcrypt.compare(password, customer.password)
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' })
    }

    const token = jwt.sign(
      { id: customer.id, type: 'customer' },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    )

    res.json({
      token,
      customer: {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        paymentStatus: customer.paymentStatus,
        deliveryStatus: customer.deliveryStatus
      }
    })

  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Server error' })
  }
}

// @desc    Get current logged in user
// @route   GET /api/auth/me
const getMe = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { company: true },
      omit: { password: true }
    })
    res.json(user)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Server error' })
  }
}

module.exports = {
  sendOTP,
  verifyOTP,
  registerAgent,
  registerCustomer,
  login,
  customerLogin,
  getMe
}