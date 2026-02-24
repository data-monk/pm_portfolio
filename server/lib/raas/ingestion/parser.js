'use strict'
const pdfParse = require('pdf-parse')
const mammoth = require('mammoth')
const driveLib = require('../drive')

/**
 * Extract plain text from a Drive file.
 * @param {object} auth - OAuth2 client
 * @param {{id: string, mimeType: string}} file
 * @returns {Promise<string>}
 */
async function extractText(auth, file) {
  const { id: fileId, mimeType } = file

  switch (mimeType) {
    case 'application/vnd.google-apps.document':
      return driveLib.exportGoogleDoc(auth, fileId)

    case 'application/pdf': {
      const buf = await driveLib.downloadFile(auth, fileId)
      const result = await pdfParse(buf)
      return result.text
    }

    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': {
      const buf = await driveLib.downloadFile(auth, fileId)
      const result = await mammoth.extractRawText({ buffer: buf })
      return result.value
    }

    case 'text/plain':
    case 'text/markdown': {
      const buf = await driveLib.downloadFile(auth, fileId)
      return buf.toString('utf8')
    }

    default:
      throw new Error(`Unsupported MIME type: ${mimeType}`)
  }
}

module.exports = { extractText }
