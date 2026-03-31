const { ScreenRecorder } = require('./screen-recorder');
const { WebcamRecorder } = require('./webcam-recorder');
const { AudioRecorder } = require('./audio-recorder');
const { RecordingSession } = require('../models/recording-session');
const { AudioSourceType } = require('../models/enums');

/**
 * Facade que orquestra todas as capturas de mídia
 * Responsabilidade: coordenar ScreenRecorder, WebcamRecorder e AudioRecorder
 */
class CaptureManager {
  constructor() {
    this.screenRecorder = new ScreenRecorder();
    this.webcamRecorder = new WebcamRecorder();
    this.audioRecorder = new AudioRecorder();
    this.currentSession = null;
  }

  /**
   * Lista dispositivos disponíveis
   */
  async listDevices() {
    const [webcamsResult, microphonesResult] = await Promise.all([
      this.webcamRecorder.listDevices(),
      this.audioRecorder.listMicrophones()
    ]);

    return {
      webcams: webcamsResult.success ? webcamsResult.devices : [],
      microphones: microphonesResult.success ? microphonesResult.devices : []
    };
  }

  /**
   * Inicia uma nova sessão de gravação
   */
  async startSession(config) {
    if (this.currentSession && this.currentSession.isActive()) {
      throw new Error('Já existe uma sessão de gravação ativa');
    }

    const validation = config.validate();
    if (!validation.isValid) {
      throw new Error(`Configuração inválida: ${validation.errors.join(', ')}`);
    }

    this.currentSession = new RecordingSession(config);
    this.currentSession.status = 'PREPARING';

    try {
      // Inicia captura de tela (obrigatório)
      const screenResult = await this.screenRecorder.startCapture();
      if (!screenResult.success) {
        throw new Error(`Falha ao capturar tela: ${screenResult.error.message}`);
      }

      // Inicia captura de webcam (se habilitado)
      if (config.webcamEnabled) {
        const webcamResult = await this.webcamRecorder.startCapture({
          width: 1920,
          height: 1080,
          fps: config.fps
        });

        if (!webcamResult.success) {
          console.warn('Webcam não disponível:', webcamResult.error.message);
        }
      }

      // Inicia captura de áudio (se habilitado)
      const audioPromises = [];

      if (config.microphoneEnabled) {
        audioPromises.push(this.audioRecorder.startMicrophoneCapture());
      }

      if (config.systemAudioEnabled) {
        audioPromises.push(this.audioRecorder.startSystemAudioCapture());
      }

      if (audioPromises.length > 0) {
        await Promise.all(audioPromises);
      }

      return {
        success: true,
        session: this.currentSession
      };
    } catch (error) {
      this.currentSession.setError(error);
      throw error;
    }
  }

  /**
   * Inicia a gravação de todas as fontes
   */
  async startRecording() {
    if (!this.currentSession) {
      throw new Error('Nenhuma sessão iniciada. Chame startSession() primeiro.');
    }

    try {
      const config = this.currentSession.config;

      // Inicia gravação da tela
      await this.screenRecorder.startRecording({
        videoBitrate: config.getQualitySettings().videoBitrate
      });

      // Inicia gravação da webcam
      if (config.webcamEnabled && this.webcamRecorder.getMediaStream()) {
        await this.webcamRecorder.startRecording({
          videoBitrate: config.getQualitySettings().videoBitrate
        });
      }

      // Inicia gravação de áudio
      if (config.microphoneEnabled || config.systemAudioEnabled) {
        let audioSourceType = AudioSourceType.MICROPHONE;

        if (config.microphoneEnabled && config.systemAudioEnabled) {
          audioSourceType = AudioSourceType.MIXED;
        } else if (config.systemAudioEnabled) {
          audioSourceType = AudioSourceType.SYSTEM;
        }

        await this.audioRecorder.startRecording(audioSourceType, {
          audioBitrate: config.getQualitySettings().audioBitrate
        });
      }

      this.currentSession.start();

      return {
        success: true,
        session: this.currentSession
      };
    } catch (error) {
      this.currentSession.setError(error);
      throw error;
    }
  }

  /**
   * Para a gravação de todas as fontes
   */
  async stopRecording() {
    if (!this.currentSession) {
      throw new Error('Nenhuma sessão ativa');
    }

    try {
      const results = await Promise.allSettled([
        this.screenRecorder.stopRecording(),
        this.webcamRecorder.getIsRecording() 
          ? this.webcamRecorder.stopRecording() 
          : Promise.resolve(null),
        this.audioRecorder.getIsRecording() 
          ? this.audioRecorder.stopRecording() 
          : Promise.resolve(null)
      ]);

      // Adiciona as fontes de mídia à sessão
      results.forEach((result) => {
        if (result.status === 'fulfilled' && result.value && result.value.mediaSource) {
          this.currentSession.addMediaSource(result.value.mediaSource);
        }
      });

      this.currentSession.stop();

      // Para as capturas
      this.screenRecorder.stopCapture();
      this.webcamRecorder.stopCapture();
      this.audioRecorder.stopCapture();

      return {
        success: true,
        session: this.currentSession
      };
    } catch (error) {
      this.currentSession.setError(error);
      throw error;
    }
  }

  /**
   * Pausa a gravação
   */
  pauseRecording() {
    if (!this.currentSession || !this.currentSession.isActive()) {
      throw new Error('Nenhuma gravação ativa para pausar');
    }

    // MediaRecorder API não suporta pause nativo de forma confiável
    // Esta é uma implementação simplificada
    this.currentSession.pause();

    return {
      success: true,
      session: this.currentSession
    };
  }

  /**
   * Resume a gravação
   */
  resumeRecording() {
    if (!this.currentSession || this.currentSession.status !== 'PAUSED') {
      throw new Error('Nenhuma gravação pausada para resumir');
    }

    this.currentSession.resume();

    return {
      success: true,
      session: this.currentSession
    };
  }

  /**
   * Retorna a sessão atual
   */
  getCurrentSession() {
    return this.currentSession;
  }

  /**
   * Retorna o status da gravação
   */
  getStatus() {
    if (!this.currentSession) {
      return {
        isActive: false,
        status: 'IDLE',
        duration: 0
      };
    }

    return {
      isActive: this.currentSession.isActive(),
      status: this.currentSession.status,
      duration: this.currentSession.getDuration(),
      durationInSeconds: this.currentSession.getDurationInSeconds()
    };
  }

  /**
   * Libera todos os recursos
   */
  dispose() {
    this.screenRecorder.dispose();
    this.webcamRecorder.dispose();
    this.audioRecorder.dispose();
    this.currentSession = null;
  }
}

module.exports = { CaptureManager };
