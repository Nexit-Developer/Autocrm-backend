let admin
try {
  admin = require('firebase-admin')
} catch (e) {
  console.error('firebase-admin not found:', e.message)
}

const path = require('path')

let messaging = null

try {
  const serviceAccount = require(path.join(__dirname, '../../firebase-service-account.json'))
  
  if (admin && !admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    })
  }
  
  messaging = admin.messaging()
} catch (error) {
  console.error('Firebase init failed:', error.message)
}

const sendPushNotification = async (fcmToken, title, message, link = null) => {
  if (!messaging) return
  try {
    await messaging.send({
      token: fcmToken,
      notification: { title, body: message },
      webpush: {
        notification: { title, body: message, icon: '/logo.png' },
        fcm_options: { link: link || '/' }
      }
    })
  } catch (error) {
    console.error('Push notification failed:', error.message)
  }
}

const sendPushToMany = async (fcmTokens, title, message, link = null) => {
  if (!messaging) return
  try {
    const validTokens = fcmTokens.filter(Boolean)
    if (validTokens.length === 0) return
    const messages = validTokens.map((token) => ({
      token,
      notification: { title, body: message },
      webpush: {
        notification: { title, body: message, icon: '/logo.png' },
        fcm_options: { link: link || '/' }
      }
    }))
    await messaging.sendEach(messages)
  } catch (error) {
    console.error('Push notifications failed:', error.message)
  }
}

module.exports = { sendPushNotification, sendPushToMany }