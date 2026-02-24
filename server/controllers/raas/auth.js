'use strict'
const bcrypt = require('bcryptjs')
const db = require('../../lib/raas/pgdb')
const { sign } = require('../../lib/raas/jwt')

async function login(req, res) {
  const { email, password } = req.body
  if (!email || !password) {
    return res.status(400).json({ error: 'email and password required' })
  }

  try {
    const result = await db.query(
      'SELECT id, tenant_id, email, password_hash, role FROM users WHERE email = $1',
      [email.toLowerCase().trim()]
    )
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    const user = result.rows[0]
    const valid = await bcrypt.compare(password, user.password_hash)
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    const token = sign({
      userId: user.id,
      tenantId: user.tenant_id,
      email: user.email,
      role: user.role,
    })

    return res.json({
      token,
      user: { id: user.id, email: user.email, role: user.role, tenantId: user.tenant_id },
    })
  } catch (err) {
    console.error('[auth] login error:', err.message)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

async function me(req, res) {
  try {
    const result = await db.query(
      'SELECT id, tenant_id, email, role, created_at FROM users WHERE id = $1',
      [req.user.userId]
    )
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' })
    const u = result.rows[0]
    return res.json({ id: u.id, email: u.email, role: u.role, tenantId: u.tenant_id })
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' })
  }
}

module.exports = { login, me }
