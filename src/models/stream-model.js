class StreamModel {
  constructor({ id, title, streamKey, status, protocol, createdAt, updatedAt }) {
    this.id = id;
    this.title = title;
    this.streamKey = streamKey;
    this.status = status;
    this.protocol = protocol;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  toPublic() {
    return {
      id: this.id,
      title: this.title,
      status: this.status,
      protocol: this.protocol,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

module.exports = {
  StreamModel
};
