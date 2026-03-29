const { MediaSource } = require('../models/media-source');
const { AudioSourceType } = require('../models/enums');

/**
 * Responsável pela captura de áudio do sistema e/ou microfone
 */
class AudioRecorder {
  constructor() {
    this.microphoneStream = null;
    this.systemStream = null;
    this.mediaRecorder = null;
    this.recordedChunks = [];
    this.isRecording = false;
    this.selectedMicrophoneId = null;
    this.audioContext = null;
    this.mixedStream = null;
  }

  /**
   * Lista dispositivos de áudio disponíveis
   */
  async listMicrophones() {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioDevices = devices.filter(device => device.kind === 'audioinput');

      return {
        success: true,
        devices: audioDevices.map(device => ({
          id: device.deviceId,
          label: device.label || `Microphone ${audioDevices.indexOf(device) + 1}`,
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
   * Inicia captura do microfone
   */
  async startMicrophoneCapture(options = {}) {
    try {
      const constraints = {
        audio: {
          deviceId: this.selectedMicrophoneId ? { exact: this.selectedMicrophoneId } : undefined,
          echoCancellation: options.echoCancellation !== false,
          noiseSuppression: options.noiseSuppression !== false,
          autoGainControl: options.autoGainControl !== false,
          sampleRate: options.sampleRate || 48000,
          ...options.audio
        },
        video: false
      };

      this.microphoneStream = await navigator.mediaDevices.getUserMedia(constraints);

      return {
        success: true,
        stream: this.microphoneStream
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
   * Inicia captura de áudio do sistema
   * Nota: Requer getDisplayMedia com audio: true
   */
  async startSystemAudioCapture(options = {}) {
    try {
      const constraints = {
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          ...options.audio
        },
        video: true // Necessário para capturar áudio do sistema
      };

      const displayStream = await navigator.mediaDevices.getDisplayMedia(constraints);
      
      // Extrai apenas o áudio
      const audioTracks = displayStream.getAudioTracks();
      
      if (audioTracks.length === 0) {
        // Para o vídeo se não houver áudio
        displayStream.getVideoTracks().forEach(track => track.stop());
        
        return {
          success: false,
          error: {
            message: 'Nenhum áudio do sistema disponível',
            code: 'NoSystemAudio'
          }
        };
      }

      this.systemStream = new MediaStream(audioTracks);
      
      // Para o vídeo, mantém só o áudio
      displayStream.getVideoTracks().forEach(track => track.stop());

      return {
        success: true,
        stream: this.systemStream
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
   * Mixa áudio do microfone e do sistema
   */
  async mixAudioSources() {
    if (!this.microphoneStream && !this.systemStream) {
      throw new Error('Nenhuma fonte de áudio disponível para mixar');
    }

    this.audioContext = new AudioContext();
    const destination = this.audioContext.createMediaStreamDestination();

    if (this.microphoneStream) {
      const micSource = this.audioContext.createMediaStreamSource(this.microphoneStream);
      micSource.connect(destination);
    }

    if (this.systemStream) {
      const systemSource = this.audioContext.createMediaStreamSource(this.systemStream);
      systemSource.connect(destination);
    }

    this.mixedStream = destination.stream;

    return {
      success: true,
      stream: this.mixedStream
    };
  }

  /**
   * Inicia gravação de áudio
   */
  async startRecording(sourceType = AudioSourceType.MICROPHONE, options = {}) {
    if (this.isRecording) {
      throw new Error('Gravação de áudio já está em andamento');
    }

    let streamToRecord;

    switch (sourceType) {
      case AudioSourceType.MICROPHONE:
        if (!this.microphoneStream) {
          throw new Error('Microfone não iniciado. Chame startMicrophoneCapture() primeiro.');
        }
        streamToRecord = this.microphoneStream;
        break;

      case AudioSourceType.SYSTEM:
        if (!this.systemStream) {
          throw new Error('Áudio do sistema não iniciado. Chame startSystemAudioCapture() primeiro.');
        }
        streamToRecord = this.systemStream;
        break;

      case AudioSourceType.MIXED:
        if (!this.mixedStream) {
          await this.mixAudioSources();
        }
        streamToRecord = this.mixedStream;
        break;

      default:
        throw new Error(`Tipo de fonte de áudio inválido: ${sourceType}`);
    }

    const mimeType = this._getSupportedMimeType(options.mimeType);

    this.mediaRecorder = new MediaRecorder(streamToRecord, {
      mimeType,
      audioBitsPerSecond: options.audioBitrate || 128000
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
      mimeType,
      sourceType
    };
  }

  /**
   * Para a gravação de áudio
   */
  async stopRecording() {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error('Nenhuma gravação em andamento'));
        return;
      }

      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.recordedChunks, {
          type: this.mediaRecorder.mimeType
        });

        // Determina o tipo baseado em qual stream foi usado
        let mediaType = MediaSource.Type.MICROPHONE_AUDIO;
        if (this.mixedStream) {
          mediaType = MediaSource.Type.MIXED_AUDIO;
        } else if (this.systemStream && !this.microphoneStream) {
          mediaType = MediaSource.Type.SYSTEM_AUDIO;
        }

        const mediaSource = new MediaSource({
          type: mediaType,
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
   * Para todas as capturas de áudio
   */
  stopCapture() {
    if (this.microphoneStream) {
      this.microphoneStream.getTracks().forEach(track => track.stop());
      this.microphoneStream = null;
    }

    if (this.systemStream) {
      this.systemStream.getTracks().forEach(track => track.stop());
      this.systemStream = null;
    }

    if (this.mixedStream) {
      this.mixedStream.getTracks().forEach(track => track.stop());
      this.mixedStream = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }

  /**
   * Define o dispositivo de microfone a ser usado
   */
  setMicrophone(deviceId) {
    this.selectedMicrophoneId = deviceId;
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
   * Retorna o mime type suportado para áudio
   */
  _getSupportedMimeType(preferred) {
    const types = [
      preferred,
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/mp4'
    ].filter(Boolean);

    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }

    return types[types.length - 1];
  }
}

module.exports = { AudioRecorder };
