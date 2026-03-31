/**
 * Representa uma fonte de mídia capturada
 */
class MediaSource {
  constructor({
    type,
    filePath = null,
    blob = null,
    duration = 0,
    mimeType = null,
    metadata = {}
  }) {
    this.id = this._generateId();
    this.type = type;
    this.filePath = filePath;
    this.blob = blob;
    this.duration = duration;
    this.mimeType = mimeType;
    this.metadata = metadata;
    this.createdAt = new Date();
  }

  /**
   * Gera ID único para a fonte de mídia
   */
  _generateId() {
    return `media_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Verifica se a fonte está disponível
   */
  isAvailable() {
    return this.filePath !== null || this.blob !== null;
  }

  /**
   * Retorna o tamanho em bytes
   */
  getSize() {
    if (this.blob) {
      return this.blob.size;
    }
    
    if (this.metadata && this.metadata.fileSize) {
      return this.metadata.fileSize;
    }

    return 0;
  }

  /**
   * Retorna a duração em segundos
   */
  getDurationInSeconds() {
    return this.duration / 1000;
  }

  /**
   * Serializa para JSON
   */
  toJSON() {
    return {
      id: this.id,
      type: this.type,
      filePath: this.filePath,
      duration: this.duration,
      mimeType: this.mimeType,
      metadata: this.metadata,
      createdAt: this.createdAt.toISOString(),
      size: this.getSize()
    };
  }
}

/**
 * Tipos de fonte de mídia
 */
MediaSource.Type = Object.freeze({
  SCREEN: 'SCREEN',
  WEBCAM: 'WEBCAM',
  MICROPHONE_AUDIO: 'MICROPHONE_AUDIO',
  SYSTEM_AUDIO: 'SYSTEM_AUDIO',
  MIXED_AUDIO: 'MIXED_AUDIO'
});

module.exports = { MediaSource };
