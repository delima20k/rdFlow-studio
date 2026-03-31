const { RecordingStatus } = require('./enums');
const { MediaSource } = require('./media-source');

/**
 * Representa uma sessão completa de gravação
 */
class RecordingSession {
  constructor(config) {
    this.id = this._generateId();
    this.config = config;
    this.status = RecordingStatus.IDLE;
    this.mediaSources = new Map();
    this.startTime = null;
    this.endTime = null;
    this.errors = [];
  }

  /**
   * Gera ID único para a sessão
   */
  _generateId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Adiciona uma fonte de mídia à sessão
   */
  addMediaSource(mediaSource) {
    if (!(mediaSource instanceof MediaSource)) {
      throw new Error('mediaSource deve ser uma instância de MediaSource');
    }

    this.mediaSources.set(mediaSource.type, mediaSource);
  }

  /**
   * Remove uma fonte de mídia
   */
  removeMediaSource(type) {
    this.mediaSources.delete(type);
  }

  /**
   * Obtém uma fonte de mídia específica
   */
  getMediaSource(type) {
    return this.mediaSources.get(type);
  }

  /**
   * Obtém todas as fontes de mídia
   */
  getAllMediaSources() {
    return Array.from(this.mediaSources.values());
  }

  /**
   * Verifica se tem fonte de tela
   */
  hasScreenSource() {
    return this.mediaSources.has(MediaSource.Type.SCREEN);
  }

  /**
   * Verifica se tem fonte de webcam
   */
  hasWebcamSource() {
    return this.mediaSources.has(MediaSource.Type.WEBCAM);
  }

  /**
   * Verifica se tem fonte de áudio
   */
  hasAudioSource() {
    return (
      this.mediaSources.has(MediaSource.Type.MICROPHONE_AUDIO) ||
      this.mediaSources.has(MediaSource.Type.SYSTEM_AUDIO) ||
      this.mediaSources.has(MediaSource.Type.MIXED_AUDIO)
    );
  }

  /**
   * Inicia a sessão
   */
  start() {
    this.status = RecordingStatus.RECORDING;
    this.startTime = new Date();
    this.errors = [];
  }

  /**
   * Para a sessão
   */
  stop() {
    this.status = RecordingStatus.STOPPED;
    this.endTime = new Date();
  }

  /**
   * Pausa a sessão
   */
  pause() {
    if (this.status === RecordingStatus.RECORDING) {
      this.status = RecordingStatus.PAUSED;
    }
  }

  /**
   * Resume a sessão
   */
  resume() {
    if (this.status === RecordingStatus.PAUSED) {
      this.status = RecordingStatus.RECORDING;
    }
  }

  /**
   * Marca a sessão como erro
   */
  setError(error) {
    this.status = RecordingStatus.ERROR;
    this.errors.push({
      message: error.message,
      stack: error.stack,
      timestamp: new Date()
    });
  }

  /**
   * Retorna a duração total da gravação em milissegundos
   */
  getDuration() {
    if (!this.startTime) {
      return 0;
    }

    const endTime = this.endTime || new Date();
    return endTime - this.startTime;
  }

  /**
   * Retorna a duração em segundos
   */
  getDurationInSeconds() {
    return Math.floor(this.getDuration() / 1000);
  }

  /**
   * Verifica se a sessão está ativa
   */
  isActive() {
    return this.status === RecordingStatus.RECORDING || this.status === RecordingStatus.PAUSED;
  }

  /**
   * Verifica se a sessão está completa
   */
  isComplete() {
    return this.status === RecordingStatus.STOPPED && this.mediaSources.size > 0;
  }

  /**
   * Serializa para JSON
   */
  toJSON() {
    return {
      id: this.id,
      config: this.config.toJSON(),
      status: this.status,
      mediaSources: Array.from(this.mediaSources.values()).map(ms => ms.toJSON()),
      startTime: this.startTime?.toISOString(),
      endTime: this.endTime?.toISOString(),
      duration: this.getDuration(),
      errors: this.errors
    };
  }
}

module.exports = { RecordingSession };
