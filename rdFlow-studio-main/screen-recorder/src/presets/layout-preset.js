const { VideoFormatType, LayoutType, BackgroundMode } = require('../models/enums');
const { VIDEO_FORMATS, WEBCAM_OVERLAY_CONFIG, TIKTOK_LAYOUT_CONFIG } = require('../models/constants');

/**
 * Classe base abstrata para todos os presets de layout
 * Define o contrato que todos os presets devem seguir
 */
class LayoutPreset {
  constructor(formatType, layoutType) {
    if (this.constructor === LayoutPreset) {
      throw new Error('LayoutPreset é uma classe abstrata e não pode ser instanciada diretamente');
    }

    this.formatType = formatType;
    this.layoutType = layoutType;
    this.backgroundMode = BackgroundMode.BLACK;
  }

  /**
   * Retorna as dimensões do canvas
   * Deve ser implementado pelas classes filhas
   */
  getCanvasDimensions() {
    throw new Error('Método getCanvasDimensions() deve ser implementado');
  }

  /**
   * Retorna a configuração de posicionamento da tela
   * Deve ser implementado pelas classes filhas
   */
  getScreenLayout() {
    throw new Error('Método getScreenLayout() deve ser implementado');
  }

  /**
   * Retorna a configuração de posicionamento da webcam
   * Deve ser implementado pelas classes filhas
   */
  getWebcamLayout() {
    throw new Error('Método getWebcamLayout() deve ser implementado');
  }

  /**
   * Retorna o modo de background
   */
  getBackgroundMode() {
    return this.backgroundMode;
  }

  /**
   * Define o modo de background
   */
  setBackgroundMode(mode) {
    if (!Object.values(BackgroundMode).includes(mode)) {
      throw new Error(`Modo de background inválido: ${mode}`);
    }
    this.backgroundMode = mode;
  }

  /**
   * Retorna informações completas do preset
   */
  getInfo() {
    return {
      formatType: this.formatType,
      layoutType: this.layoutType,
      backgroundMode: this.backgroundMode,
      canvas: this.getCanvasDimensions(),
      screenLayout: this.getScreenLayout(),
      webcamLayout: this.getWebcamLayout()
    };
  }

  /**
   * Calcula dimensões mantendo aspect ratio
   */
  _calculateAspectRatioDimensions(originalWidth, originalHeight, targetWidth, targetHeight) {
    const originalRatio = originalWidth / originalHeight;
    const targetRatio = targetWidth / targetHeight;

    let finalWidth, finalHeight;

    if (originalRatio > targetRatio) {
      // Vídeo original é mais largo
      finalWidth = targetWidth;
      finalHeight = targetWidth / originalRatio;
    } else {
      // Vídeo original é mais alto
      finalHeight = targetHeight;
      finalWidth = targetHeight * originalRatio;
    }

    return {
      width: Math.round(finalWidth),
      height: Math.round(finalHeight)
    };
  }

  /**
   * Centraliza um elemento dentro de uma área
   */
  _centerInArea(elementWidth, elementHeight, areaX, areaY, areaWidth, areaHeight) {
    return {
      x: areaX + Math.round((areaWidth - elementWidth) / 2),
      y: areaY + Math.round((areaHeight - elementHeight) / 2)
    };
  }
}

module.exports = { LayoutPreset };
