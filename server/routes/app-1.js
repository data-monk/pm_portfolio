'use strict'
const express = require('express')
const router = express.Router()
const { authenticate } = require('../middleware/raas-auth')
const { listPersonas, generateReply } = require('../controllers/app-1/index')

// GET  /api/app-1/personas
router.get('/personas', authenticate, listPersonas)

// POST /api/app-1/reply
router.post('/reply', authenticate, generateReply)

module.exports = router
