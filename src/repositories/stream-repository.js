const { StreamModel } = require("../models/stream-model");

class StreamRepository {
  constructor(database) {
    this.database = database;
  }

  async create(streamData) {
    const { id, title, streamKey, status, protocol, createdAt, updatedAt } = streamData;

    await this.database.run(
      `INSERT INTO streams (id, title, stream_key, status, protocol, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, title, streamKey, status, protocol, createdAt, updatedAt]
    );

    return new StreamModel(streamData);
  }

  async findAll() {
    const rows = await this.database.all("SELECT * FROM streams ORDER BY created_at DESC");

    return rows.map((row) =>
      new StreamModel({
        id: row.id,
        title: row.title,
        streamKey: row.stream_key,
        status: row.status,
        protocol: row.protocol,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      })
    );
  }

  async findById(streamId) {
    const row = await this.database.get("SELECT * FROM streams WHERE id = ?", [streamId]);

    if (!row) {
      return null;
    }

    return new StreamModel({
      id: row.id,
      title: row.title,
      streamKey: row.stream_key,
      status: row.status,
      protocol: row.protocol,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    });
  }

  async updateStatus(streamId, status) {
    const updatedAt = new Date().toISOString();

    await this.database.run(
      "UPDATE streams SET status = ?, updated_at = ? WHERE id = ?",
      [status, updatedAt, streamId]
    );
  }
}

module.exports = {
  StreamRepository
};
