const express = require('express')
const cors = require('cors')
require('dotenv').config()
const { startCronJobs } = require('./utils/cronJobs')

const app = express()

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

const PORT = process.env.PORT || 5000

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`)
  startCronJobs()
})