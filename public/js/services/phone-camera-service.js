class PhoneCameraService {
  constructor(apiBaseUrl) {
    this.apiBaseUrl = apiBaseUrl;
    this.peerConnection = null;
    this.remoteStream = null;
    this.sessionId = null;
    this.pollingInterval = null;
  }

  async createSession() {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/v1/phone-camera/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });

      const data = await response.json();
      this.sessionId = data.sessionId;

      return {
        sessionId: data.sessionId,
        qrCodeUrl: data.qrCodeUrl,
        connectionUrl: data.connectionUrl
      };
    } catch (error) {
      console.error("Erro ao criar sessao de camera:", error);
      throw new Error("Falha ao criar sessao.");
    }
  }

  async waitForConnection(onConnected) {
    if (!this.sessionId) {
      throw new Error("Sessao nao foi criada.");
    }

    this.pollingInterval = setInterval(async () => {
      try {
        const response = await fetch(
          `${this.apiBaseUrl}/api/v1/phone-camera/sessions/${this.sessionId}/status`
        );

        const data = await response.json();

        if (data.status === "connected" && data.offer) {
          clearInterval(this.pollingInterval);
          await this.establishConnection(data.offer);
          onConnected(this.remoteStream);
        }
      } catch (error) {
        console.error("Erro no polling de conexao:", error);
      }
    }, 2000);
  }

  async establishConnection(offer) {
    this.peerConnection = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
    });

    this.peerConnection.ontrack = (event) => {
      this.remoteStream = event.streams[0];
    };

    await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));

    const answer = await this.peerConnection.createAnswer();
    await this.peerConnection.setLocalDescription(answer);

    await fetch(`${this.apiBaseUrl}/api/v1/phone-camera/sessions/${this.sessionId}/answer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answer: this.peerConnection.localDescription })
    });
  }

  disconnect() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }

    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    this.remoteStream = null;
    this.sessionId = null;
  }

  isConnected() {
    return this.peerConnection?.connectionState === "connected";
  }
}

export { PhoneCameraService };
