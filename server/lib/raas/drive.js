'use strict'
const { google } = require('googleapis')

const SCOPES = ['https://www.googleapis.com/auth/drive.readonly']

const SUPPORTED_MIME_TYPES = new Set([
  'application/vnd.google-apps.document',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'text/markdown',
])

function createOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  )
}

function getAuthUrl() {
  const oauth2 = createOAuth2Client()
  return oauth2.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
  })
}

async function exchangeCode(code) {
  const oauth2 = createOAuth2Client()
  const { tokens } = await oauth2.getToken(code)
  return tokens
}

function createAuthedClient(accessToken, refreshToken, tokenExpiry) {
  const oauth2 = createOAuth2Client()
  oauth2.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
    expiry_date: tokenExpiry ? new Date(tokenExpiry).getTime() : undefined,
  })
  return oauth2
}

/**
 * List files in a Drive folder filtered to supported MIME types.
 * @param {object} auth - OAuth2 client
 * @param {string} folderId
 * @returns {Promise<{id, name, mimeType, webViewLink, modifiedTime, md5Checksum}[]>}
 */
async function listFiles(auth, folderId) {
  const drive = google.drive({ version: 'v3', auth })
  const files = []
  let pageToken

  do {
    const res = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields: 'nextPageToken, files(id, name, mimeType, webViewLink, modifiedTime, md5Checksum)',
      pageToken,
      pageSize: 100,
    })
    const batch = (res.data.files ?? []).filter((f) => SUPPORTED_MIME_TYPES.has(f.mimeType))
    files.push(...batch)
    pageToken = res.data.nextPageToken
  } while (pageToken)

  return files
}

/**
 * Get folder metadata (name) by folder ID.
 */
async function getFolderMeta(auth, folderId) {
  const drive = google.drive({ version: 'v3', auth })
  const res = await drive.files.get({ fileId: folderId, fields: 'id, name' })
  return res.data
}

/**
 * Download raw bytes for binary files (PDF, DOCX).
 * @returns {Promise<Buffer>}
 */
async function downloadFile(auth, fileId) {
  const drive = google.drive({ version: 'v3', auth })
  const res = await drive.files.get({ fileId, alt: 'media' }, { responseType: 'arraybuffer' })
  return Buffer.from(res.data)
}

/**
 * Export Google Docs to plain text.
 * @returns {Promise<string>}
 */
async function exportGoogleDoc(auth, fileId) {
  const drive = google.drive({ version: 'v3', auth })
  const res = await drive.files.export({ fileId, mimeType: 'text/plain' })
  return res.data
}

module.exports = {
  createOAuth2Client,
  createAuthedClient,
  getAuthUrl,
  exchangeCode,
  listFiles,
  getFolderMeta,
  downloadFile,
  exportGoogleDoc,
  SUPPORTED_MIME_TYPES,
}
