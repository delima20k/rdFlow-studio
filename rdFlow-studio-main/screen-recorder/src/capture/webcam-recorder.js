const { MediaSource } = require('../models/media-source');

/**
 * Responsável exclusivamente pela captura da webcam
 */
class WebcamRecorder {
  constructor() {
    this.mediaStream = null;
    this.mediaRecorder = null;
    this.recordedChunks = [];
    this.isRecording = false;
    this.selectedDeviceId = null;
  }

  /**
   * Lista dispositivos de vídeo disponíveis
   */
  async listDevices() {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');

      return {
        success: true,
        devices: videoDevices.map(device => ({
          id: device.deviceId,
          label: device.label || `Camera ${videoDevices.indexOf(device) + 1}`,
          groupId: device.groupId
        }))
      };
    } catch (error) {
      return {
        success: false,
        error: {
          message: error.message,
          code: error.name
        }
      };
    }
  }

  /**
   * Solicita permissão e inicia captura da webcam
   */
  async startCapture(options = {}) {
    try {
      const constraints = {
        video: {
          deviceId: this.selectedDeviceId ? { exact: this.selectedDeviceId } : undefined,
          width: { ideal: options.width || 1920 },
          height: { ideal: options.height || 1080 },
          frameRate: { ideal: options.fps || 30 },
          ...options.video
        },
        audio: false // Áudio é capturado separadamente
      };

      this.mediaStream = await navigator.mediaDevices.getUserMedia(constraints);

      return {
        success: true,
        stream: this.mediaStream
      };
    } catch (error) {
      return {
        success: false,
        error: {
          message: error.message,
          code: error.name,
          userDenied: error.name === 'NotAllowedError',
          deviceNotFound: error.name === 'NotFoundError'
        }
      };
    }
  }

  /**
   * Inicia a gravação da webcam
   */
  async startRecording(options = {}) {
    if (!this.mediaStream) {
      throw new Error('Captura de webcam não iniciada. Chame startCapture() primeiro.');
    }

    if (this.isRecording) {
      throw new Error('Gravação já está em andamento.');
    }

    const mimeType = this._getSupportedMimeType(options.mimeType);

    this.mediaRecorder = new MediaRecorder(this.mediaStream, {
      mimeType,
      videoBitsPerSecond: options.videoBitrate || 2500000
    });

    this.recordedChunks = [];

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        this.recordedChunks.push(event.data);
      }
    };

    this.mediaRecorder.start(options.timeslice || 1000);
    this.isRecording = true;

    return {
      success: true,
      mimeType
    };
  }

  /**
   * Para a gravação da webcam
   */
  async stopRecording() {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error('Nenhuma gravação em andamento.'));
        return;
      }

      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.recordedChunks, {
          type: this.mediaRecorder.mimeType
        });

        const mediaSource = new MediaSource({
          type: MediaSource.Type.WEBCAM,
          blob,
          mimeType: this.mediaRecorder.mimeType,
          metadata: {
            recordedChunks: this.recordedChunks.length,
            blobSize: blob.size,
            deviceId: this.selectedDeviceId
          }
        });

        this.isRecording = false;
        this.recordedChunks = [];

        resolve({
          success: true,
          mediaSource
        });
      };

      this.mediaRecorder.onerror = (error) => {
        this.isRecording = false;
        reject(error);
      };

      this.mediaRecorder.stop();
    });
  }

  /**
   * Para a captura da webcam
   */
  stopCapture() {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }
  }

  /**
   * Define o dispositivo de vídeo a ser usado
   */
  setDevice(deviceId) {
    this.selectedDeviceId = deviceId;
  }

  /**
   * Libera todos os recursos
   */
  dispose() {
    if (this.isRecording) {
      this.mediaRecorder?.stop();
    }

    this.stopCapture();
    this.recordedChunks = [];
    this.mediaRecorder = null;
  }

  /**
   * Verifica se está gravando
   */
  getIsRecording() {
    return this.isRecording;
  }

  /**
   * Retorna o stream atual
   */
  getMediaStream() {
    return this.mediaStream;
  }

  /**
   * Retorna o mime type suportado
   */
  _getSupportedMimeType(preferred) {
    const types = [
      preferred,
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8',
      'video/webm',
      'video/mp4'
    ].filter(Boolean);

    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }

    return types[types.length - 1];
  }
}

module.exports = { WebcamRecorder };
