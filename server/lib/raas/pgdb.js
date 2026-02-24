'use strict'
const { Pool } = require('pg')

let pool

function getPool() {
  if (!pool) {
    pool = new Pool({ connectionString: process.env.POSTGRES_URL })
    pool.on('error', (err) => {
      console.error('[pgdb] Unexpected pool error', err.message)
    })
  }
  return pool
}

async function query(sql, params) {
  return getPool().query(sql, params)
}

async function getClient() {
  return getPool().connect()
}

module.exports = { query, getClient, getPool }
