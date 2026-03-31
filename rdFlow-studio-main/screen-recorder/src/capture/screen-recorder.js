const { MediaSource } = require('../models/media-source');

/**
 * Responsável exclusivamente pela captura da tela do Windows
 */
class ScreenRecorder {
  constructor() {
    this.mediaStream = null;
    this.mediaRecorder = null;
    this.recordedChunks = [];
    this.isRecording = false;
  }

  /**
   * Solicita permissão e inicia captura da tela
   */
  async startCapture(options = {}) {
    try {
      const constraints = {
        video: {
          cursor: options.cursor || 'always',
          displaySurface: 'monitor',
          ...options.video
        },
        audio: false // Áudio da tela é capturado separadamente pelo AudioRecorder
      };

      this.mediaStream = await navigator.mediaDevices.getDisplayMedia(constraints);

      // Detecta se usuário cancelou a captura
      this.mediaStream.getVideoTracks()[0].addEventListener('ended', () => {
        this.stopCapture();
      });

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
          userCancelled: error.name === 'NotAllowedError'
        }
      };
    }
  }

  /**
   * Inicia a gravação da tela
   */
  async startRecording(options = {}) {
    if (!this.mediaStream) {
      throw new Error('Captura de tela não iniciada. Chame startCapture() primeiro.');
    }

    if (this.isRecording) {
      throw new Error('Gravação já está em andamento.');
    }

    const mimeType = this._getSupportedMimeType(options.mimeType);

    this.mediaRecorder = new MediaRecorder(this.mediaStream, {
      mimeType,
      videoBitsPerSecond: options.videoBitrate || 5000000
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
   * Para a gravação da tela
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
          type: MediaSource.Type.SCREEN,
          blob,
          mimeType: this.mediaRecorder.mimeType,
          metadata: {
            recordedChunks: this.recordedChunks.length,
            blobSize: blob.size
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
   * Para a captura da tela
   */
  stopCapture() {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }
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

module.exports = { ScreenRecorder };
