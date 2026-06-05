const nodemailer = require('nodemailer')
require('dotenv').config()

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT),
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false
  }
})

const sendOTPEmail = async (toEmail, name, otp) => {
  console.log('Attempting to send email to:', toEmail)
  console.log('Using host:', process.env.EMAIL_HOST)
  console.log('Using port:', process.env.EMAIL_PORT)
  console.log('Using user:', process.env.EMAIL_USER)

  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: toEmail,
    subject: 'AutoCRM — Verify your email',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; border: 1px solid #e5e7eb; border-radius: 12px;">
        <h2>Hi ${name},</h2>
        <p>Your verification code is:</p>
        <h1 style="color: #534AB7; letter-spacing: 8px;">${otp}</h1>
        <p>Expires in 10 minutes.</p>
      </div>
    `
  }

  try {
    const info = await transporter.sendMail(mailOptions)
    console.log('Email sent successfully:', info.messageId)
    return info
  } catch (error) {
    console.error('Email sending failed:', error.message)
    console.error('Full error:', error)
    throw error
  }
}

module.exports = { sendOTPEmail }