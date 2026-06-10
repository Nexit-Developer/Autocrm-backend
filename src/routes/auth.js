const express = require('express')
const router = express.Router()
const {
  sendOTP,
  verifyOTP,
  registerAgent,
  registerCustomer,
  login,
  customerLogin,
  getMe
} = require('../controllers/authController')
const { protect } = require('../middleware/auth')

router.post('/send-otp', sendOTP)
router.post('/verify-otp', verifyOTP)
router.post('/register/agent', registerAgent)
router.post('/register/customer', registerCustomer)
router.post('/login', login)
router.post('/customer/login', customerLogin)
router.get('/me', protect, getMe)



module.exports = router