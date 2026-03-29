class ScreenCaptureService {
  constructor() {
    this.screenStream = null;
    this.audioStream = null;
    this.combinedStream = null;
  }

  async captureScreen(includeAudio = true) {
    try {
      const constraints = {
        video: {
          cursor: "always",
          displaySurface: "monitor"
        },
        audio: includeAudio ? {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        } : false
      };

      this.screenStream = await navigator.mediaDevices.getDisplayMedia(constraints);

      if (includeAudio && !this.screenStream.getAudioTracks().length) {
        console.warn("Audio do sistema nao foi capturado. Usuario pode ter negado.");
      }

      return this.screenStream;
    } catch (error) {
      console.error("Erro ao capturar tela:", error);
      throw new Error("Falha ao capturar tela. Verifique as permissoes.");
    }
  }

  async captureMicrophone() {
    try {
      this.audioStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      return this.audioStream;
    } catch (error) {
      console.error("Erro ao capturar microfone:", error);
      throw new Error("Falha ao acessar microfone.");
    }
  }

  combineStreams(videoStream, audioStreams = []) {
    const tracks = [];

    if (videoStream) {
      tracks.push(...videoStream.getVideoTracks());
    }

    audioStreams.forEach((stream) => {
      if (stream) {
        tracks.push(...stream.getAudioTracks());
      }
    });

    this.combinedStream = new MediaStream(tracks);
    return this.combinedStream;
  }

  stopCapture() {
    [this.screenStream, this.audioStream, this.combinedStream].forEach((stream) => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    });

    this.screenStream = null;
    this.audioStream = null;
    this.combinedStream = null;
  }

  isCapturing() {
    return this.screenStream !== null && this.screenStream.active;
  }
}

export { ScreenCaptureService };
