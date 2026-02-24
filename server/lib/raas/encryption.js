'use strict'
const crypto = require('crypto')

const ALGO = 'aes-256-gcm'
const IV_LEN = 12
const TAG_LEN = 16

function getKey() {
  const hex = process.env.ENCRYPTION_KEY
  if (!hex || hex.length !== 64) throw new Error('ENCRYPTION_KEY must be 64 hex chars (32 bytes)')
  return Buffer.from(hex, 'hex')
}

function encrypt(plaintext) {
  if (!plaintext) return null
  const iv = crypto.randomBytes(IV_LEN)
  const cipher = crypto.createCipheriv(ALGO, getKey(), iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  // Format: iv(12) + tag(16) + ciphertext — all base64
  return Buffer.concat([iv, tag, encrypted]).toString('base64')
}

function decrypt(encoded) {
  if (!encoded) return null
  const buf = Buffer.from(encoded, 'base64')
  const iv = buf.slice(0, IV_LEN)
  const tag = buf.slice(IV_LEN, IV_LEN + TAG_LEN)
  const ciphertext = buf.slice(IV_LEN + TAG_LEN)
  const decipher = crypto.createDecipheriv(ALGO, getKey(), iv)
  decipher.setAuthTag(tag)
  return decipher.update(ciphertext) + decipher.final('utf8')
}

module.exports = { encrypt, decrypt }
