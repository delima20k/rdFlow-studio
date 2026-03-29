const path = require("path");
const { mkdir } = require("fs/promises");
const sqlite3 = require("sqlite3");
const { open } = require("sqlite");

async function initializeDatabase(dbPath) {
  const dbDirectory = path.dirname(dbPath);
  await mkdir(dbDirectory, { recursive: true });

  const database = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  await database.exec(`
    CREATE TABLE IF NOT EXISTS streams (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      stream_key TEXT UNIQUE NOT NULL,
      status TEXT NOT NULL,
      protocol TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  await database.exec("CREATE INDEX IF NOT EXISTS idx_streams_status ON streams(status)");

  return database;
}

module.exports = {
  initializeDatabase
};
