const crypto = require("crypto");

class PhoneCameraService {
  constructor(sessionRepository, envConfig) {
    this.sessionRepository = sessionRepository;
    this.envConfig = envConfig;
  }

  async createSession() {
    await this.sessionRepository.deleteExpiredSessions();

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 30 * 60 * 1000);

    const sessionData = {
      id: crypto.randomUUID(),
      status: "waiting",
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString()
    };

    const session = await this.sessionRepository.create(sessionData);

    const connectionUrl = `${this.envConfig.apiBaseUrl}/camera?session=${session.id}&api=${this.envConfig.apiBaseUrl}`;
    const qrCodeUrl = connectionUrl;

    return {
      ...session.toPublic(),
      connectionUrl,
      qrCodeUrl
    };
  }

  async getSessionStatus(sessionId) {
    const session = await this.sessionRepository.findById(sessionId);

    if (!session) {
      throw new Error("Sessao nao encontrada.");
    }

    if (session.isExpired()) {
      throw new Error("Sessao expirada.");
    }

    return {
      status: session.status,
      offer: session.offer
    };
  }

  async receiveOffer(sessionId, offer) {
    const session = await this.sessionRepository.findById(sessionId);

    if (!session) {
      throw new Error("Sessao nao encontrada.");
    }

    if (session.isExpired()) {
      throw new Error("Sessao expirada.");
    }

    await this.sessionRepository.updateOffer(sessionId, offer);

    return { success: true };
  }

  async sendAnswer(sessionId, answer) {
    const session = await this.sessionRepository.findById(sessionId);

    if (!session) {
      throw new Error("Sessao nao encontrada.");
    }

    await this.sessionRepository.updateAnswer(sessionId, answer);

    return session.answer;
  }

  async getAnswer(sessionId) {
    const session = await this.sessionRepository.findById(sessionId);

    if (!session || !session.answer) {
      return null;
    }

    return session.answer;
  }
}

module.exports = {
  PhoneCameraService
};
