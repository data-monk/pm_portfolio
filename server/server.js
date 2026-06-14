require('dotenv').config()
const express = require('express')
const cors = require('cors')
const rateLimit = require('express-rate-limit')
const appsRouter = require('./routes/apps')
const raasRouter = require('./routes/raas')
const app1Router = require('./routes/app-1')

const app = express()
const PORT = process.env.PORT || 5001

// Middleware
app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:3000' }))
app.use(express.json())

// Rate limiting
app.use('/api/raas/auth/login', rateLimit({ windowMs: 15 * 60_000, max: 20, standardHeaders: true, legacyHeaders: false }))
app.use('/api/app-1/reply', rateLimit({ windowMs: 60_000, max: 15, standardHeaders: true, legacyHeaders: false }))
app.use('/api/raas/research/query', rateLimit({ windowMs: 60_000, max: 20, standardHeaders: true, legacyHeaders: false }))

// Routes
app.use('/api/apps', appsRouter)
app.use('/api/raas', raasRouter)
app.use('/api/app-1', app1Router)

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
