require('dotenv').config()
const express = require('express')
const cors = require('cors')
const appsRouter = require('./routes/apps')

const app = express()
const PORT = process.env.PORT || 5001

// Middleware
app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:3000' }))
app.use(express.json())

// Routes
app.use('/api/apps', appsRouter)

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
