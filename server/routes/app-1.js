'use strict'
const express = require('express')
const router = express.Router()
const { listPersonas, generateReply } = require('../controllers/app-1/index')

// GET  /api/app-1/personas
router.get('/personas', listPersonas)

// POST /api/app-1/reply
router.post('/reply', generateReply)

module.exports = router
