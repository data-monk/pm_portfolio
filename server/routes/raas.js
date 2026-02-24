'use strict'
const express = require('express')
const { authenticate, requireAdmin } = require('../middleware/raas-auth')
const authCtrl = require('../controllers/raas/auth')
const driveCtrl = require('../controllers/raas/admin-drive')
const promptsCtrl = require('../controllers/raas/admin-prompts')
const researchCtrl = require('../controllers/raas/research')

const router = express.Router()

// ── Auth ─────────────────────────────────────────────────────────────────────
router.post('/auth/login', authCtrl.login)
router.get('/auth/me', authenticate, authCtrl.me)

// ── Admin: Drive ─────────────────────────────────────────────────────────────
router.post('/admin/drive/connect', authenticate, requireAdmin, driveCtrl.connect)
router.get('/admin/drive/callback', driveCtrl.callback)          // OAuth callback — no auth header (redirect from Google)
router.put('/admin/drive/folder', authenticate, requireAdmin, driveCtrl.setFolder)
router.get('/admin/drive/status', authenticate, requireAdmin, driveCtrl.status)
router.post('/admin/drive/sync', authenticate, requireAdmin, driveCtrl.sync)
router.get('/admin/drive/documents', authenticate, requireAdmin, driveCtrl.documents)

// ── Admin: Prompts ────────────────────────────────────────────────────────────
router.get('/admin/prompts', authenticate, requireAdmin, promptsCtrl.list)
router.post('/admin/prompts', authenticate, requireAdmin, promptsCtrl.create)
router.get('/admin/prompts/:id', authenticate, requireAdmin, promptsCtrl.get)
router.put('/admin/prompts/:id', authenticate, requireAdmin, promptsCtrl.update)
router.delete('/admin/prompts/:id', authenticate, requireAdmin, promptsCtrl.remove)
router.post('/admin/prompts/:id/set-default', authenticate, requireAdmin, promptsCtrl.setDefault)

// ── User: Research ────────────────────────────────────────────────────────────
router.get('/prompts', authenticate, researchCtrl.listPrompts)
router.post('/research/query', authenticate, researchCtrl.queryResearch)

module.exports = router
