const { PhoneCameraSession } = require("../models/phone-camera-session-model");

class PhoneCameraSessionRepository {
  constructor(database) {
    this.database = database;
  }

  async initialize() {
    await this.database.exec(`
      CREATE TABLE IF NOT EXISTS phone_camera_sessions (
        id TEXT PRIMARY KEY,
        status TEXT NOT NULL,
        offer TEXT,
        answer TEXT,
        created_at TEXT NOT NULL,
        expires_at TEXT NOT NULL
      )
    `);

    await this.database.exec("CREATE INDEX IF NOT EXISTS idx_sessions_status ON phone_camera_sessions(status)");
  }

  async create(sessionData) {
    const { id, status, createdAt, expiresAt } = sessionData;

    await this.database.run(
      `INSERT INTO phone_camera_sessions (id, status, offer, answer, created_at, expires_at)
       VALUES (?, ?, NULL, NULL, ?, ?)`,
      [id, status, createdAt, expiresAt]
    );

    return new PhoneCameraSession(sessionData);
  }

  async findById(sessionId) {
    const row = await this.database.get(
      "SELECT * FROM phone_camera_sessions WHERE id = ?",
      [sessionId]
    );

    if (!row) {
      return null;
    }

    return new PhoneCameraSession({
      id: row.id,
      status: row.status,
      offer: row.offer ? JSON.parse(row.offer) : null,
      answer: row.answer ? JSON.parse(row.answer) : null,
      createdAt: row.created_at,
      expiresAt: row.expires_at
    });
  }

  async updateOffer(sessionId, offer) {
    await this.database.run(
      "UPDATE phone_camera_sessions SET offer = ?, status = ? WHERE id = ?",
      [JSON.stringify(offer), "connected", sessionId]
    );
  }

  async updateAnswer(sessionId, answer) {
    await this.database.run(
      "UPDATE phone_camera_sessions SET answer = ? WHERE id = ?",
      [JSON.stringify(answer), sessionId]
    );
  }

  async deleteExpiredSessions() {
    const now = new Date().toISOString();

    await this.database.run(
      "DELETE FROM phone_camera_sessions WHERE expires_at < ?",
      [now]
    );
  }
}

module.exports = {
  PhoneCameraSessionRepository
};
