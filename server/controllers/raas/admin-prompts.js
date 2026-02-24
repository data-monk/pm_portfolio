'use strict'
const db = require('../../lib/raas/pgdb')

// GET /api/raas/admin/prompts
async function list(req, res) {
  const tenantId = req.user.tenantId
  try {
    const result = await db.query(
      `SELECT sp.id, sp.name, sp.description, sp.is_default, sp.created_at, sp.updated_at,
              spv.id AS active_version_id, spv.version, spv.content, spv.created_at AS version_created_at
       FROM system_prompts sp
       LEFT JOIN system_prompt_versions spv ON spv.system_prompt_id = sp.id AND spv.is_active = TRUE
       WHERE sp.tenant_id = $1
       ORDER BY sp.is_default DESC, sp.created_at ASC`,
      [tenantId]
    )
    return res.json(result.rows)
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}

// POST /api/raas/admin/prompts
async function create(req, res) {
  const tenantId = req.user.tenantId
  const userId = req.user.userId
  const { name, description, content, isDefault } = req.body
  if (!name || !content) return res.status(400).json({ error: 'name and content required' })

  const client = await db.getClient()
  try {
    await client.query('BEGIN')

    if (isDefault) {
      await client.query(
        'UPDATE system_prompts SET is_default = FALSE WHERE tenant_id = $1',
        [tenantId]
      )
    }

    const spRes = await client.query(
      `INSERT INTO system_prompts (tenant_id, name, description, is_default)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [tenantId, name, description ?? null, isDefault ?? false]
    )
    const sp = spRes.rows[0]

    const vRes = await client.query(
      `INSERT INTO system_prompt_versions (system_prompt_id, version, content, is_active, created_by_user_id)
       VALUES ($1, 1, $2, TRUE, $3) RETURNING *`,
      [sp.id, content, userId]
    )

    await client.query('COMMIT')
    return res.status(201).json({ ...sp, activeVersion: vRes.rows[0] })
  } catch (err) {
    await client.query('ROLLBACK')
    if (err.code === '23505') return res.status(409).json({ error: 'Prompt name already exists' })
    return res.status(500).json({ error: err.message })
  } finally {
    client.release()
  }
}

// GET /api/raas/admin/prompts/:id
async function get(req, res) {
  const tenantId = req.user.tenantId
  const { id } = req.params
  try {
    const spRes = await db.query(
      'SELECT * FROM system_prompts WHERE id = $1 AND tenant_id = $2',
      [id, tenantId]
    )
    if (spRes.rows.length === 0) return res.status(404).json({ error: 'Not found' })

    const versRes = await db.query(
      'SELECT * FROM system_prompt_versions WHERE system_prompt_id = $1 ORDER BY version DESC',
      [id]
    )
    return res.json({ ...spRes.rows[0], versions: versRes.rows })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}

// PUT /api/raas/admin/prompts/:id
async function update(req, res) {
  const tenantId = req.user.tenantId
  const userId = req.user.userId
  const { id } = req.params
  const { name, description, content } = req.body
  if (!content) return res.status(400).json({ error: 'content required' })

  const client = await db.getClient()
  try {
    await client.query('BEGIN')

    const spRes = await client.query(
      'SELECT * FROM system_prompts WHERE id = $1 AND tenant_id = $2',
      [id, tenantId]
    )
    if (spRes.rows.length === 0) {
      await client.query('ROLLBACK')
      return res.status(404).json({ error: 'Not found' })
    }

    await client.query(
      `UPDATE system_prompts SET name = COALESCE($1, name), description = COALESCE($2, description), updated_at = NOW()
       WHERE id = $3`,
      [name ?? null, description ?? null, id]
    )

    // Deactivate all existing versions
    await client.query(
      'UPDATE system_prompt_versions SET is_active = FALSE WHERE system_prompt_id = $1',
      [id]
    )

    // Get next version number
    const vNumRes = await client.query(
      'SELECT COALESCE(MAX(version), 0) + 1 AS next FROM system_prompt_versions WHERE system_prompt_id = $1',
      [id]
    )
    const nextVersion = vNumRes.rows[0].next

    const vRes = await client.query(
      `INSERT INTO system_prompt_versions (system_prompt_id, version, content, is_active, created_by_user_id)
       VALUES ($1, $2, $3, TRUE, $4) RETURNING *`,
      [id, nextVersion, content, userId]
    )

    await client.query('COMMIT')
    return res.json({ id, newVersion: vRes.rows[0] })
  } catch (err) {
    await client.query('ROLLBACK')
    return res.status(500).json({ error: err.message })
  } finally {
    client.release()
  }
}

// DELETE /api/raas/admin/prompts/:id
async function remove(req, res) {
  const tenantId = req.user.tenantId
  const { id } = req.params
  try {
    const result = await db.query(
      'DELETE FROM system_prompts WHERE id = $1 AND tenant_id = $2 RETURNING id',
      [id, tenantId]
    )
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' })
    return res.json({ deleted: id })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}

// POST /api/raas/admin/prompts/:id/set-default
async function setDefault(req, res) {
  const tenantId = req.user.tenantId
  const { id } = req.params
  const client = await db.getClient()
  try {
    await client.query('BEGIN')
    await client.query(
      'UPDATE system_prompts SET is_default = FALSE WHERE tenant_id = $1',
      [tenantId]
    )
    const result = await client.query(
      'UPDATE system_prompts SET is_default = TRUE WHERE id = $1 AND tenant_id = $2 RETURNING id',
      [id, tenantId]
    )
    if (result.rows.length === 0) {
      await client.query('ROLLBACK')
      return res.status(404).json({ error: 'Not found' })
    }
    await client.query('COMMIT')
    return res.json({ default: id })
  } catch (err) {
    await client.query('ROLLBACK')
    return res.status(500).json({ error: err.message })
  } finally {
    client.release()
  }
}

module.exports = { list, create, get, update, remove, setDefault }
