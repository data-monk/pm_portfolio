const Database = require('better-sqlite3')
const fs = require('fs')
const path = require('path')

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../database/portfolio.db')
const SCHEMA_PATH = path.join(__dirname, '../database/init.sql')

// Ensure the database directory exists
const dbDir = path.dirname(DB_PATH)
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true })
}

const db = new Database(DB_PATH)
db.pragma('journal_mode = WAL')

// Run schema / seed on startup
const schema = fs.readFileSync(SCHEMA_PATH, 'utf8')
db.exec(schema)

module.exports = db
