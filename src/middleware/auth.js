const jwt = require('jsonwebtoken')
const prisma = require('../utils/prisma')
require('dotenv').config()

const protect = async (req, res, next) => {
  try {
    let token

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1]
    }

    if (!token) {
      return res.status(401).json({ message: 'Not authorized, no token' })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    req.user = await prisma.user.findUnique({
      where: { id: decoded.id },
      omit: { password: true }
    })

    next()
  } catch (error) {
    res.status(401).json({ message: 'Not authorized, token failed' })
  }
}

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: `Role ${req.user.role} is not authorized to access this route` 
      })
    }
    next()
  }
}

module.exports = { protect, authorize }