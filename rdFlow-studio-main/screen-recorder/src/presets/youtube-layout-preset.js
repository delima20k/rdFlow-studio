const { LayoutPreset } = require('./layout-preset');
const { VideoFormatType, LayoutType, WebcamPosition } = require('../models/enums');
const { VIDEO_FORMATS, WEBCAM_OVERLAY_CONFIG } = require('../models/constants');

/**
 * Preset para formato YouTube (16:9 - 1920x1080)
 * Tela grande como conteúdo principal + webcam pequena em overlay
 */
class YouTubeLayoutPreset extends LayoutPreset {
  constructor(layoutType = LayoutType.SCREEN_PLUS_WEBCAM_CORNER, webcamPosition = WebcamPosition.TOP_RIGHT) {
    super(VideoFormatType.YOUTUBE, layoutType);
    this.webcamPosition = webcamPosition;
    this.canvasConfig = VIDEO_FORMATS.YOUTUBE;
  }

  /**
   * Retorna as dimensões do canvas
   */
  getCanvasDimensions() {
    return {
      width: this.canvasConfig.width,
      height: this.canvasConfig.height,
      aspectRatio: this.canvasConfig.aspectRatio
    };
  }

  /**
   * Retorna a configuração de posicionamento da tela
   * A tela ocupa todo o canvas
   */
  getScreenLayout() {
    const { width, height } = this.canvasConfig;

    return {
      x: 0,
      y: 0,
      width: width,
      height: height,
      zIndex: 1,
      fitMode: 'contain' // Mantém aspect ratio, adiciona letterbox se necessário
    };
  }

  /**
   * Retorna a configuração de posicionamento da webcam
   * Webcam pequena em overlay no canto escolhido
   */
  getWebcamLayout() {
    if (this.layoutType === LayoutType.SCREEN_ONLY) {
      return null;
    }

    const overlayConfig = WEBCAM_OVERLAY_CONFIG.YOUTUBE[this.webcamPosition];

    if (!overlayConfig) {
      // Fallback para TOP_RIGHT se posição inválida
      return WEBCAM_OVERLAY_CONFIG.YOUTUBE.TOP_RIGHT;
    }

    return {
      x: overlayConfig.x,
      y: overlayConfig.y,
      width: overlayConfig.width,
      height: overlayConfig.height,
      zIndex: 2,
      borderRadius: 8,
      borderWidth: 2,
      borderColor: '#FFFFFF',
      shadowEnabled: true
    };
  }

  /**
   * Define a posição da webcam
   */
  setWebcamPosition(position) {
    if (!Object.values(WebcamPosition).includes(position)) {
      throw new Error(`Posição de webcam inválida: ${position}`);
    }

    this.webcamPosition = position;
  }

  /**
   * Retorna a posição atual da webcam
   */
  getWebcamPosition() {
    return this.webcamPosition;
  }

  /**
   * Retorna informações do preset
   */
  getInfo() {
    return {
      ...super.getInfo(),
      webcamPosition: this.webcamPosition,
      description: 'YouTube 16:9 - Tela em destaque com webcam em overlay'
    };
  }
}

module.exports = { YouTubeLayoutPreset };
