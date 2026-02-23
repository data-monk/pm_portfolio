const express = require('express')
const router = express.Router()
const db = require('../database')

// GET /api/apps — return all active portfolio apps
router.get('/', (req, res) => {
  try {
    const rows = db
      .prepare(
        `SELECT id, title, summary, image_url AS imageUrl, route, tags, sort_order
         FROM portfolio_apps
         WHERE active = 1
         ORDER BY sort_order ASC`
      )
      .all()

    // Parse tags from JSON string to array
    const apps = rows.map((row) => ({
      ...row,
      tags: JSON.parse(row.tags || '[]'),
    }))

    res.json(apps)
  } catch (err) {
    console.error('Error fetching apps:', err)
    res.status(500).json({ error: 'Failed to fetch apps' })
  }
})

// GET /api/apps/:id — return a single app by id
router.get('/:id', (req, res) => {
  try {
    const row = db
      .prepare(
        `SELECT id, title, summary, image_url AS imageUrl, route, tags, sort_order
         FROM portfolio_apps WHERE id = ? AND active = 1`
      )
      .get(req.params.id)

    if (!row) return res.status(404).json({ error: 'App not found' })

    res.json({ ...row, tags: JSON.parse(row.tags || '[]') })
  } catch (err) {
    console.error('Error fetching app:', err)
    res.status(500).json({ error: 'Failed to fetch app' })
  }
})

module.exports = router
