const { BackgroundMode } = require('../models/enums');

/**
 * Motor de composição de vídeo
 * Responsável por combinar múltiplas fontes de vídeo em um canvas
 */
class CompositionEngine {
  constructor(preset) {
    this.preset = preset;
    this.canvas = null;
    this.context = null;
    this.screenVideo = null;
    this.webcamVideo = null;
    this.isInitialized = false;
  }

  /**
   * Inicializa o canvas de composição
   */
  initialize() {
    if (this.isInitialized) {
      return;
    }

    const dimensions = this.preset.getCanvasDimensions();

    this.canvas = document.createElement('canvas');
    this.canvas.width = dimensions.width;
    this.canvas.height = dimensions.height;
    this.context = this.canvas.getContext('2d', { alpha: false });

    this.isInitialized = true;
  }

  /**
   * Define a fonte de vídeo da tela
   */
  setScreenVideo(videoElement) {
    this.screenVideo = videoElement;
  }

  /**
   * Define a fonte de vídeo da webcam
   */
  setWebcamVideo(videoElement) {
    this.webcamVideo = videoElement;
  }

  /**
   * Define o preset de layout
   */
  setPreset(preset) {
    this.preset = preset;
    
    if (this.isInitialized) {
      const dimensions = this.preset.getCanvasDimensions();
      this.canvas.width = dimensions.width;
      this.canvas.height = dimensions.height;
    }
  }

  /**
   * Renderiza um frame da composição
   */
  renderFrame() {
    if (!this.isInitialized) {
      throw new Error('CompositionEngine não foi inicializado');
    }

    const { width, height } = this.preset.getCanvasDimensions();

    // Limpa o canvas
    this._clearCanvas();

    // Desenha o background
    this._drawBackground(width, height);

    // Desenha a tela
    const screenLayout = this.preset.getScreenLayout();
    if (screenLayout && this.screenVideo) {
      this._drawVideo(this.screenVideo, screenLayout);
    }

    // Desenha a webcam
    const webcamLayout = this.preset.getWebcamLayout();
    if (webcamLayout && this.webcamVideo) {
      this._drawVideo(this.webcamVideo, webcamLayout);
      this._drawWebcamBorder(webcamLayout);
    }
  }

  /**
   * Limpa o canvas
   */
  _clearCanvas() {
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  /**
   * Desenha o background baseado no modo configurado
   */
  _drawBackground(width, height) {
    const backgroundMode = this.preset.getBackgroundMode();

    switch (backgroundMode) {
      case BackgroundMode.BLACK:
        this.context.fillStyle = '#000000';
        this.context.fillRect(0, 0, width, height);
        break;

      case BackgroundMode.GRADIENT:
        const gradient = this.context.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, '#1a1a2e');
        gradient.addColorStop(1, '#0f0f1e');
        this.context.fillStyle = gradient;
        this.context.fillRect(0, 0, width, height);
        break;

      case BackgroundMode.BLUR:
        // Implementação simplificada: desenha a tela com blur
        if (this.screenVideo) {
          this.context.filter = 'blur(20px)';
          this.context.drawImage(this.screenVideo, 0, 0, width, height);
          this.context.filter = 'none';
        } else {
          this.context.fillStyle = '#000000';
          this.context.fillRect(0, 0, width, height);
        }
        break;

      case BackgroundMode.IMAGE:
        // Será implementado quando houver suporte a imagens customizadas
        this.context.fillStyle = '#000000';
        this.context.fillRect(0, 0, width, height);
        break;

      default:
        this.context.fillStyle = '#000000';
        this.context.fillRect(0, 0, width, height);
    }
  }

  /**
   * Desenha um vídeo no canvas seguindo o layout
   */
  _drawVideo(videoElement, layout) {
    if (!videoElement || videoElement.readyState < 2) {
      // Vídeo não está pronto
      this._drawPlaceholder(layout);
      return;
    }

    const { x, y, width, height, fitMode = 'contain', padding = 0 } = layout;

    // Calcula dimensões considerando o fit mode
    const videoDimensions = this._calculateVideoDimensions(
      videoElement.videoWidth,
      videoElement.videoHeight,
      width - (padding * 2),
      height - (padding * 2),
      fitMode
    );

    // Centraliza o vídeo na área disponível
    const drawX = x + padding + Math.round((width - padding * 2 - videoDimensions.width) / 2);
    const drawY = y + padding + Math.round((height - padding * 2 - videoDimensions.height) / 2);

    // Desenha o vídeo
    this.context.drawImage(
      videoElement,
      drawX,
      drawY,
      videoDimensions.width,
      videoDimensions.height
    );
  }

  /**
   * Calcula as dimensões do vídeo baseado no fit mode
   */
  _calculateVideoDimensions(videoWidth, videoHeight, targetWidth, targetHeight, fitMode) {
    const videoRatio = videoWidth / videoHeight;
    const targetRatio = targetWidth / targetHeight;

    let width, height;

    if (fitMode === 'contain') {
      // Mantém todo o vídeo visível
      if (videoRatio > targetRatio) {
        width = targetWidth;
        height = targetWidth / videoRatio;
      } else {
        height = targetHeight;
        width = targetHeight * videoRatio;
      }
    } else if (fitMode === 'cover') {
      // Preenche toda a área, pode cortar
      if (videoRatio > targetRatio) {
        height = targetHeight;
        width = targetHeight * videoRatio;
      } else {
        width = targetWidth;
        height = targetWidth / videoRatio;
      }
    } else {
      // Stretch - estica para preencher
      width = targetWidth;
      height = targetHeight;
    }

    return {
      width: Math.round(width),
      height: Math.round(height)
    };
  }

  /**
   * Desenha placeholder quando vídeo não está disponível
   */
  _drawPlaceholder(layout) {
    const { x, y, width, height } = layout;

    this.context.fillStyle = '#1a1a2e';
    this.context.fillRect(x, y, width, height);

    this.context.strokeStyle = '#333344';
    this.context.lineWidth = 2;
    this.context.strokeRect(x, y, width, height);

    // Desenha X no centro
    this.context.strokeStyle = '#555566';
    this.context.beginPath();
    this.context.moveTo(x, y);
    this.context.lineTo(x + width, y + height);
    this.context.moveTo(x + width, y);
    this.context.lineTo(x, y + height);
    this.context.stroke();
  }

  /**
   * Desenha borda e sombra na webcam
   */
  _drawWebcamBorder(layout) {
    const { x, y, width, height, borderRadius = 0, borderWidth = 0, borderColor = '#FFFFFF', shadowEnabled = false } = layout;

    if (shadowEnabled) {
      this.context.shadowColor = 'rgba(0, 0, 0, 0.5)';
      this.context.shadowBlur = 10;
      this.context.shadowOffsetX = 2;
      this.context.shadowOffsetY = 2;
    }

    if (borderWidth > 0) {
      this.context.strokeStyle = borderColor;
      this.context.lineWidth = borderWidth;

      if (borderRadius > 0) {
        this._roundRect(x, y, width, height, borderRadius);
        this.context.stroke();
      } else {
        this.context.strokeRect(x, y, width, height);
      }
    }

    // Reseta shadow
    this.context.shadowColor = 'transparent';
    this.context.shadowBlur = 0;
    this.context.shadowOffsetX = 0;
    this.context.shadowOffsetY = 0;
  }

  /**
   * Desenha retângulo com bordas arredondadas
   */
  _roundRect(x, y, width, height, radius) {
    this.context.beginPath();
    this.context.moveTo(x + radius, y);
    this.context.lineTo(x + width - radius, y);
    this.context.quadraticCurveTo(x + width, y, x + width, y + radius);
    this.context.lineTo(x + width, y + height - radius);
    this.context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    this.context.lineTo(x + radius, y + height);
    this.context.quadraticCurveTo(x, y + height, x, y + height - radius);
    this.context.lineTo(x, y + radius);
    this.context.quadraticCurveTo(x, y, x + radius, y);
    this.context.closePath();
  }

  /**
   * Retorna o canvas
   */
  getCanvas() {
    return this.canvas;
  }

  /**
   * Retorna o stream do canvas
   */
  getCaptureStream(frameRate = 30) {
    if (!this.isInitialized) {
      throw new Error('CompositionEngine não foi inicializado');
    }

    return this.canvas.captureStream(frameRate);
  }

  /**
   * Libera recursos
   */
  dispose() {
    this.screenVideo = null;
    this.webcamVideo = null;
    this.canvas = null;
    this.context = null;
    this.isInitialized = false;
  }
}

module.exports = { CompositionEngine };
