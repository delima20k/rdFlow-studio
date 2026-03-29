class WebcamCaptureService {
  constructor() {
    this.webcamStream = null;
    this.devices = [];
  }

  async listDevices() {
    try {
      await navigator.mediaDevices.getUserMedia({ video: true });

      const allDevices = await navigator.mediaDevices.enumerateDevices();
      this.devices = allDevices.filter((device) => device.kind === "videoinput");

      return this.devices;
    } catch (error) {
      console.error("Erro ao listar dispositivos:", error);
      throw new Error("Falha ao acessar dispositivos de video.");
    }
  }

  async captureWebcam(deviceId = null, resolution = "youtube-fhd") {
    try {
      const resolutions = {
        // Vertical (9:16) - TikTok, Reels, Shorts
        "tiktok-fhd": { width: 1080, height: 1920, aspectRatio: 9/16 },
        "tiktok-hd": { width: 720, height: 1280, aspectRatio: 9/16 },
        "tiktok-sd": { width: 480, height: 854, aspectRatio: 9/16 },
        
        // Horizontal (16:9) - YouTube, Paisagem
        "youtube-4k": { width: 3840, height: 2160, aspectRatio: 16/9 },
        "youtube-fhd": { width: 1920, height: 1080, aspectRatio: 16/9 },
        "youtube-hd": { width: 1280, height: 720, aspectRatio: 16/9 },
        "youtube-sd": { width: 640, height: 480, aspectRatio: 16/9 },
        
        // Clássico (compatibilidade)
        sd: { width: 640, height: 480, aspectRatio: 4/3 },
        hd: { width: 1280, height: 720, aspectRatio: 16/9 },
        fhd: { width: 1920, height: 1080, aspectRatio: 16/9 }
      };

      const constraints = {
        video: {
          deviceId: deviceId ? { exact: deviceId } : undefined,
          width: { ideal: resolutions[resolution].width },
          height: { ideal: resolutions[resolution].height },
          frameRate: { ideal: 30 }
        },
        audio: false
      };

      this.webcamStream = await navigator.mediaDevices.getUserMedia(constraints);
      return this.webcamStream;
    } catch (error) {
      console.error("Erro ao capturar webcam:", error);
      throw new Error("Falha ao acessar webcam.");
    }
  }

  stopWebcam() {
    if (this.webcamStream) {
      this.webcamStream.getTracks().forEach((track) => track.stop());
      this.webcamStream = null;
    }
  }

  isCapturing() {
    return this.webcamStream !== null && this.webcamStream.active;
  }

  getActiveDevice() {
    if (!this.webcamStream) {
      return null;
    }

    const videoTrack = this.webcamStream.getVideoTracks()[0];
    return videoTrack?.getSettings().deviceId;
  }
}

export { WebcamCaptureService };
