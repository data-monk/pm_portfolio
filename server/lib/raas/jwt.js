'use strict'
const jwt = require('jsonwebtoken')

const SECRET = () => {
  if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET not set')
  return process.env.JWT_SECRET
}

function sign(payload, expiresIn = '7d') {
  return jwt.sign(payload, SECRET(), { expiresIn })
}

function verify(token) {
  return jwt.verify(token, SECRET())
}

module.exports = { sign, verify }
