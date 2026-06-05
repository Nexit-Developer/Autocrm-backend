const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const prisma = require('../utils/prisma')

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

// @desc    Login user
// @route   POST /api/auth/login
const login = async (req, res) => {
  try {
    const { email, password } = req.body

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email },
      include: { company: true }
    })

    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' })
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({ message: 'Your account has been deactivated' })
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' })
    }

    // Return user data and token
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

module.exports = { login, getMe }