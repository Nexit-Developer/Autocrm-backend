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
// Save FCM token
router.post('/fcm-token', protect, async (req, res) => {
  try {
    const { fcmToken } = req.body
    await prisma.user.update({
      where: { id: req.user.id },
      data: { fcmToken }
    })
    res.json({ message: 'FCM token saved' })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Server error' })
  }
})



module.exports = router