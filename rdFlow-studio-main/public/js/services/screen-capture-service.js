class ScreenCaptureService {
  constructor() {
    this.screenStream = null;
    this.microphoneStream = null;
    this.combinedStream = null;
    this.mixAudioContext = null;
    this.mixDestination = null;
    this.mixStream = null;
    this.mixSources = [];
  }

  get audioStream() {
    return this.microphoneStream;
  }

  set audioStream(stream) {
    this.microphoneStream = stream;
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

      // Dicas extras para o chooser do navegador priorizar tela inteira.
      constraints.video.surfaceSwitching = "include";
      constraints.video.monitorTypeSurfaces = "include";
      constraints.video.selfBrowserSurface = "exclude";
      constraints.preferCurrentTab = false;

      this.screenStream = await navigator.mediaDevices.getDisplayMedia(constraints);

      const videoTrack = this.screenStream.getVideoTracks()[0];
      const settings = videoTrack?.getSettings?.() || {};
      const displaySurface = settings.displaySurface || 'unknown';

      if (displaySurface !== 'monitor') {
        this.stopCapture();
        throw new Error('Selecione a opção Tela 1 / monitor inteiro na janela do navegador. Aba ou janela não capturam as outras abas da mesma tela.');
      }

      if (includeAudio && !this.screenStream.getAudioTracks().length) {
        console.warn("Audio do sistema nao foi capturado. Usuario pode ter negado.");
      }

      return this.screenStream;
    } catch (error) {
      if (error.name === 'NotAllowedError' || error.name === 'AbortError') {
        console.warn("[ScreenCapture] Captura cancelada ou negada pelo usuário.");
        return null;
      }
      console.error("Erro ao capturar tela:", error);
      throw new Error("Falha ao capturar tela. Verifique as permissoes.");
    }
  }

  async captureMicrophone(deviceId = null) {
    try {
      if (this.microphoneStream) {
        this.microphoneStream.getTracks().forEach((track) => track.stop());
        this.microphoneStream = null;
      }

      this.microphoneStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          ...(deviceId ? { deviceId: { exact: deviceId } } : {}),
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      return this.microphoneStream;
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

    const validAudioStreams = audioStreams.filter((stream) => stream && stream.getAudioTracks().length > 0);

    if (validAudioStreams.length > 0) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;

      if (!AudioContextClass) {
        console.warn('[ScreenCapture] AudioContext não suportado; usando apenas a primeira trilha de áudio disponível.');
        tracks.push(...validAudioStreams[0].getAudioTracks());
      } else {
        if (!this.mixAudioContext || this.mixAudioContext.state === 'closed') {
          this.mixAudioContext = new AudioContextClass();
        }

        if (this.mixAudioContext.state === 'suspended') {
          this.mixAudioContext.resume().catch(() => {});
        }

        this.mixSources.forEach((source) => {
          try {
            source.disconnect();
          } catch (_) {
            // noop
          }
        });
        this.mixSources = [];

        this.mixDestination = this.mixAudioContext.createMediaStreamDestination();

        validAudioStreams.forEach((stream) => {
          const source = this.mixAudioContext.createMediaStreamSource(stream);
          const gainNode = this.mixAudioContext.createGain();
          gainNode.gain.value = 1.0;
          source.connect(gainNode);
          gainNode.connect(this.mixDestination);
          this.mixSources.push(source, gainNode);
        });

        this.mixStream = this.mixDestination.stream;
        tracks.push(...this.mixStream.getAudioTracks());
      }
    }

    this.combinedStream = new MediaStream(tracks);
    return this.combinedStream;
  }

  stopCapture() {
    [this.screenStream, this.combinedStream].forEach((stream) => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    });

    this.mixSources.forEach((source) => {
      try {
        source.disconnect();
      } catch (_) {
        // noop
      }
    });
    this.mixSources = [];

    if (this.mixStream) {
      this.mixStream.getTracks().forEach((track) => track.stop());
    }

    this.screenStream = null;
    this.combinedStream = null;
    this.mixDestination = null;
    this.mixStream = null;
  }

  stopMicrophone() {
    if (this.microphoneStream) {
      this.microphoneStream.getTracks().forEach((track) => track.stop());
      this.microphoneStream = null;
    }
  }

  stopAllCapture() {
    this.stopCapture();
    this.stopMicrophone();

    if (this.mixAudioContext && this.mixAudioContext.state !== 'closed') {
      this.mixAudioContext.close().catch(() => {});
    }
    this.mixAudioContext = null;
  }

  isCapturing() {
    return this.screenStream !== null && this.screenStream.active;
  }
}

export { ScreenCaptureService };
