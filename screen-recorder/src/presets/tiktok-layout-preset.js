const { LayoutPreset } = require('./layout-preset');
const { VideoFormatType, LayoutType } = require('../models/enums');
const { VIDEO_FORMATS, TIKTOK_LAYOUT_CONFIG } = require('../models/constants');

/**
 * Preset para formato TikTok/Vertical (9:16 - 1080x1920)
 * Webcam na parte superior + tela na parte inferior
 * Aproveita o espaço vertical de forma inteligente
 */
class TikTokLayoutPreset extends LayoutPreset {
  constructor(layoutType = LayoutType.SCREEN_PLUS_WEBCAM_TOP) {
    super(VideoFormatType.TIKTOK, layoutType);
    this.canvasConfig = VIDEO_FORMATS.TIKTOK;
    this.layoutConfig = TIKTOK_LAYOUT_CONFIG;
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
   * Tela ocupa a parte inferior (aproximadamente 2/3)
   */
  getScreenLayout() {
    if (this.layoutType === LayoutType.WEBCAM_ONLY) {
      return null;
    }

    const { canvasWidth, canvasHeight, webcamAreaHeight, padding } = this.layoutConfig;

    // Área disponível para a tela
    const screenAreaY = webcamAreaHeight;
    const screenAreaHeight = canvasHeight - webcamAreaHeight;

    return {
      x: 0,
      y: screenAreaY,
      width: canvasWidth,
      height: screenAreaHeight,
      zIndex: 1,
      fitMode: 'contain', // Mantém aspect ratio
      padding: padding,
      backgroundColor: '#000000'
    };
  }

  /**
   * Retorna a configuração de posicionamento da webcam
   * Webcam ocupa a parte superior (aproximadamente 1/3)
   */
  getWebcamLayout() {
    if (this.layoutType === LayoutType.SCREEN_ONLY) {
      return null;
    }

    const { canvasWidth, webcamAreaHeight } = this.layoutConfig;

    return {
      x: 0,
      y: 0,
      width: canvasWidth,
      height: webcamAreaHeight,
      zIndex: 2,
      fitMode: 'cover', // Preenche toda a área, pode cortar levemente
      borderRadius: 0,
      shadowEnabled: false
    };
  }

  /**
   * Retorna a área para futuros elementos (título, nome, etc.)
   */
  getOverlayAreas() {
    const { canvasWidth, canvasHeight } = this.layoutConfig;

    return {
      // Área superior para título
      titleArea: {
        x: 20,
        y: 20,
        width: canvasWidth - 40,
        height: 80,
        zIndex: 10
      },
      // Área inferior para informações
      infoArea: {
        x: 20,
        y: canvasHeight - 120,
        width: canvasWidth - 40,
        height: 100,
        zIndex: 10
      },
      // Área para avatar/logo
      avatarArea: {
        x: 20,
        y: canvasHeight - 240,
        width: 60,
        height: 60,
        zIndex: 10
      }
    };
  }

  /**
   * Calcula o layout otimizado baseado nas proporções reais dos vídeos
   */
  calculateOptimizedLayout(screenAspectRatio, webcamAspectRatio) {
    const { canvasWidth, canvasHeight, webcamAreaHeight } = this.layoutConfig;

    // Calcula dimensões otimizadas para webcam
    const webcamLayout = this._calculateFitDimensions(
      webcamAspectRatio,
      canvasWidth,
      webcamAreaHeight
    );

    // Calcula dimensões otimizadas para tela
    const screenAreaHeight = canvasHeight - webcamAreaHeight;
    const screenLayout = this._calculateFitDimensions(
      screenAspectRatio,
      canvasWidth,
      screenAreaHeight
    );

    return {
      webcam: {
        ...webcamLayout,
        y: Math.round((webcamAreaHeight - webcamLayout.height) / 2)
      },
      screen: {
        ...screenLayout,
        y: webcamAreaHeight + Math.round((screenAreaHeight - screenLayout.height) / 2)
      }
    };
  }

  /**
   * Calcula dimensões que cabem em uma área mantendo aspect ratio
   */
  _calculateFitDimensions(aspectRatio, maxWidth, maxHeight) {
    const targetRatio = maxWidth / maxHeight;

    let width, height;

    if (aspectRatio > targetRatio) {
      // Vídeo é mais largo - limita pela largura
      width = maxWidth;
      height = Math.round(maxWidth / aspectRatio);
    } else {
      // Vídeo é mais alto - limita pela altura
      height = maxHeight;
      width = Math.round(maxHeight * aspectRatio);
    }

    return {
      width,
      height,
      x: Math.round((maxWidth - width) / 2)
    };
  }

  /**
   * Retorna informações do preset
   */
  getInfo() {
    return {
      ...super.getInfo(),
      overlayAreas: this.getOverlayAreas(),
      description: 'TikTok 9:16 - Webcam superior, tela inferior, estilo live vertical'
    };
  }
}

module.exports = { TikTokLayoutPreset };
