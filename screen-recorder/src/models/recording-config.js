const { VideoFormatType, LayoutType, ExportQuality, WebcamPosition } = require('./enums');
const { VIDEO_FORMATS, QUALITY_PRESETS } = require('./constants');

/**
 * Configuração de uma sessão de gravação
 */
class RecordingConfig {
  constructor({
    formatType = VideoFormatType.YOUTUBE,
    layoutType = LayoutType.SCREEN_PLUS_WEBCAM_CORNER,
    quality = ExportQuality.HIGH,
    webcamEnabled = true,
    webcamPosition = WebcamPosition.TOP_RIGHT,
    microphoneEnabled = true,
    systemAudioEnabled = false,
    fps = 30,
    outputDirectory = './recordings',
    projectName = 'untitled'
  } = {}) {
    this.formatType = formatType;
    this.layoutType = layoutType;
    this.quality = quality;
    this.webcamEnabled = webcamEnabled;
    this.webcamPosition = webcamPosition;
    this.microphoneEnabled = microphoneEnabled;
    this.systemAudioEnabled = systemAudioEnabled;
    this.fps = fps;
    this.outputDirectory = outputDirectory;
    this.projectName = projectName;
    
    // Data de criação
    this.createdAt = new Date();
  }

  /**
   * Retorna as dimensões do canvas baseado no formato
   */
  getCanvasDimensions() {
    const format = VIDEO_FORMATS[this.formatType];
    
    if (!format) {
      throw new Error(`Formato inválido: ${this.formatType}`);
    }

    return {
      width: format.width,
      height: format.height,
      aspectRatio: format.aspectRatio
    };
  }

  /**
   * Retorna as configurações de qualidade
   */
  getQualitySettings() {
    const qualityPreset = QUALITY_PRESETS[this.quality];
    
    if (!qualityPreset) {
      throw new Error(`Qualidade inválida: ${this.quality}`);
    }

    return {
      ...qualityPreset,
      fps: this.fps || qualityPreset.fps
    };
  }

  /**
   * Valida a configuração
   */
  validate() {
    const errors = [];

    if (!Object.values(VideoFormatType).includes(this.formatType)) {
      errors.push('Formato de vídeo inválido');
    }

    if (!Object.values(LayoutType).includes(this.layoutType)) {
      errors.push('Tipo de layout inválido');
    }

    if (!Object.values(ExportQuality).includes(this.quality)) {
      errors.push('Qualidade de exportação inválida');
    }

    if (this.fps <= 0 || this.fps > 120) {
      errors.push('FPS deve estar entre 1 e 120');
    }

    if (!this.projectName || this.projectName.trim() === '') {
      errors.push('Nome do projeto é obrigatório');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Clona a configuração
   */
  clone() {
    return new RecordingConfig({
      formatType: this.formatType,
      layoutType: this.layoutType,
      quality: this.quality,
      webcamEnabled: this.webcamEnabled,
      webcamPosition: this.webcamPosition,
      microphoneEnabled: this.microphoneEnabled,
      systemAudioEnabled: this.systemAudioEnabled,
      fps: this.fps,
      outputDirectory: this.outputDirectory,
      projectName: this.projectName
    });
  }

  /**
   * Serializa para JSON
   */
  toJSON() {
    return {
      formatType: this.formatType,
      layoutType: this.layoutType,
      quality: this.quality,
      webcamEnabled: this.webcamEnabled,
      webcamPosition: this.webcamPosition,
      microphoneEnabled: this.microphoneEnabled,
      systemAudioEnabled: this.systemAudioEnabled,
      fps: this.fps,
      outputDirectory: this.outputDirectory,
      projectName: this.projectName,
      createdAt: this.createdAt.toISOString()
    };
  }

  /**
   * Cria a partir de JSON
   */
  static fromJSON(json) {
    const config = new RecordingConfig(json);
    config.createdAt = new Date(json.createdAt);
    return config;
  }
}

module.exports = { RecordingConfig };
