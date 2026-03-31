class PhoneCameraSession {
  constructor({ id, status, offer, answer, createdAt, expiresAt }) {
    this.id = id;
    this.status = status;
    this.offer = offer;
    this.answer = answer;
    this.createdAt = createdAt;
    this.expiresAt = expiresAt;
  }

  isExpired() {
    return new Date() > new Date(this.expiresAt);
  }

  toPublic() {
    return {
      sessionId: this.id,
      status: this.status,
      createdAt: this.createdAt,
      expiresAt: this.expiresAt
    };
  }
}

module.exports = {
  PhoneCameraSession
};
