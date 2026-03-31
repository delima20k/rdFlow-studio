/**
 * VideoFitEngine - Motor de Ajuste de Vídeo para Exportação
 * 
 * Responsável por calcular transformações geométricas para modo "cover",
 * garantindo que vídeos preencham completamente o canvas sem faixas pretas.
 * 
 * @class
 * @author DELIMA
 * @version 1.0.0
 */
class VideoFitEngine {
  // Campos privados
  #exportConfig;
  #canvasWidth;
  #canvasHeight;

  /**
   * Cria instância do VideoFitEngine
   * 
   * @param {ExportConfig} exportConfig - Configuração de exportação
   * @throws {Error} Se exportConfig for inválido
   */
  constructor(exportConfig) {
    this.#validateConfig(exportConfig);
    
    this.#exportConfig = exportConfig;
    this.#canvasWidth = exportConfig.width;
    this.#canvasHeight = exportConfig.height;
  }

  /**
   * Calcula transformações para ajuste "cover" de mídia
   * 
   * Modo cover: escala mídia para preencher TODO o espaço,
   * mesmo que precise fazer crop. NUNCA deixa faixas pretas.
   * 
   * @param {number} mediaWidth - Largura original da mídia
   * @param {number} mediaHeight - Altura original da mídia
   * @param {string} userPosition - Posição vertical: 'top', 'center', 'bottom'
   * @returns {Object} Transformações calculadas
   */
  calculateFit(mediaWidth, mediaHeight, userPosition = 'center') {
    this.#validateDimensions(mediaWidth, mediaHeight);
    this.#validatePosition(userPosition);

    // FÓRMULA OBRIGATÓRIA (modo cover)
    // Escolhe o MAIOR fator de escala para garantir preenchimento total
    const scale = Math.max(
      this.#canvasWidth / mediaWidth,
      this.#canvasHeight / mediaHeight
    );

    // Dimensões após escala
    const scaledWidth = mediaWidth * scale;
    const scaledHeight = mediaHeight * scale;

    // Centralização horizontal SEMPRE
    const offsetX = (this.#canvasWidth - scaledWidth) / 2;

    // Posição vertical baseada em userPosition
    const offsetY = this.#calculateVerticalOffset(
      scaledHeight,
      userPosition
    );

    // Calcular crop se necessário (quando mídia excede canvas)
    const crop = this.#calculateCrop(
      mediaWidth,
      mediaHeight,
      scaledWidth,
      scaledHeight,
      offsetX,
      offsetY
    );

    return {
      scale,
      scaledWidth,
      scaledHeight,
      offsetX,
      offsetY,
      cropX: crop.x,
      cropY: crop.y,
      cropWidth: crop.width,
      cropHeight: crop.height,
      drawWidth: Math.min(scaledWidth, this.#canvasWidth),
      drawHeight: Math.min(scaledHeight, this.#canvasHeight)
    };
  }

  /**
   * Aplica transformações e desenha vídeo no canvas
   * 
   * @param {CanvasRenderingContext2D} ctx - Contexto 2D do canvas
   * @param {HTMLVideoElement} videoElement - Elemento de vídeo HTML5
   * @param {Object} fit - Resultado de calculateFit()
   * @param {number} x - Posição X no canvas (offset adicional)
   * @param {number} y - Posição Y no canvas (offset adicional)
   */
  applyToCanvas(ctx, videoElement, fit, x = 0, y = 0) {
    this.#validateContext(ctx);
    this.#validateVideoElement(videoElement);
    this.#validateFit(fit);

    // Salvar estado do contexto
    ctx.save();

    try {
      // Se houver crop, usar drawImage com 9 parâmetros
      if (this.#needsCrop(fit)) {
        ctx.drawImage(
          videoElement,
          fit.cropX,                    // sx: início do crop na fonte
          fit.cropY,                    // sy: início do crop na fonte
          fit.cropWidth,                // sWidth: largura do crop
          fit.cropHeight,               // sHeight: altura do crop
          x + fit.offsetX,              // dx: posição X no canvas
          y + fit.offsetY,              // dy: posição Y no canvas
          fit.drawWidth,                // dWidth: largura no destino
          fit.drawHeight                // dHeight: altura no destino
        );
      } else {
        // Sem crop, usar drawImage com 5 parâmetros
        ctx.drawImage(
          videoElement,
          x + fit.offsetX,
          y + fit.offsetY,
          fit.scaledWidth,
          fit.scaledHeight
        );
      }
    } finally {
      // Restaurar estado do contexto
      ctx.restore();
    }
  }

  /**
   * Gera string CSS com transformações
   * Útil para preview visual no navegador
   * 
   * @param {number} mediaWidth - Largura original da mídia
   * @param {number} mediaHeight - Altura original da mídia
   * @param {string} userPosition - Posição vertical
   * @returns {string} String CSS com transform
   */
  getTransformCSS(mediaWidth, mediaHeight, userPosition = 'center') {
    const fit = this.calculateFit(mediaWidth, mediaHeight, userPosition);
    
    const transforms = [
      `scale(${fit.scale})`,
      `translateX(${fit.offsetX / fit.scale}px)`,
      `translateY(${fit.offsetY / fit.scale}px)`
    ];

    return transforms.join(' ');
  }

  /**
   * Retorna dimensões do canvas final
   * 
   * @returns {Object} {width, height}
   */
  getCanvasDimensions() {
    return {
      width: this.#canvasWidth,
      height: this.#canvasHeight
    };
  }

  // ===================================
  // MÉTODOS PRIVADOS
  // ===================================

  /**
   * Calcula offset vertical baseado na posição do usuário
   * 
   * @private
   * @param {number} scaledHeight - Altura após escala
   * @param {string} position - 'top', 'center', 'bottom'
   * @returns {number} Offset Y em pixels
   */
  #calculateVerticalOffset(scaledHeight, position) {
    switch (position) {
      case 'top':
        return 0;
      
      case 'bottom':
        return this.#canvasHeight - scaledHeight;
      
      case 'center':
      default:
        return (this.#canvasHeight - scaledHeight) / 2;
    }
  }

  /**
   * Calcula área de crop quando mídia excede canvas
   * 
   * @private
   * @param {number} mediaWidth - Largura original
   * @param {number} mediaHeight - Altura original
   * @param {number} scaledWidth - Largura escalada
   * @param {number} scaledHeight - Altura escalada
   * @param {number} offsetX - Offset horizontal
   * @param {number} offsetY - Offset vertical
   * @returns {Object} {x, y, width, height} na escala da mídia original
   */
  #calculateCrop(mediaWidth, mediaHeight, scaledWidth, scaledHeight, offsetX, offsetY) {
    // Determinar quanto da mídia escalada está fora do canvas
    const excessWidth = Math.max(0, scaledWidth - this.#canvasWidth);
    const excessHeight = Math.max(0, scaledHeight - this.#canvasHeight);

    // Se offset é negativo, a mídia começa fora do canvas (precisa crop)
    const cropStartX = offsetX < 0 ? Math.abs(offsetX) : 0;
    const cropStartY = offsetY < 0 ? Math.abs(offsetY) : 0;

    // Converter coordenadas de volta para escala original da mídia
    const scale = scaledWidth / mediaWidth;
    
    return {
      x: cropStartX / scale,
      y: cropStartY / scale,
      width: mediaWidth - (excessWidth / scale),
      height: mediaHeight - (excessHeight / scale)
    };
  }

  /**
   * Verifica se crop é necessário
   * 
   * @private
   * @param {Object} fit - Objeto de fit calculado
   * @returns {boolean}
   */
  #needsCrop(fit) {
    return fit.cropWidth < fit.scaledWidth || 
           fit.cropHeight < fit.scaledHeight;
  }

  // ===================================
  // VALIDAÇÕES
  // ===================================

  /**
   * @private
   */
  #validateConfig(config) {
    if (!config) {
      throw new Error('VideoFitEngine: exportConfig é obrigatório');
    }
    if (!config.width || !config.height) {
      throw new Error('VideoFitEngine: exportConfig deve ter width e height');
    }
  }

  /**
   * @private
   */
  #validateDimensions(width, height) {
    if (!width || !height || width <= 0 || height <= 0) {
      throw new Error(`VideoFitEngine: dimensões inválidas: ${width}x${height}`);
    }
  }

  /**
   * @private
   */
  #validatePosition(position) {
    const validPositions = ['top', 'center', 'bottom'];
    if (!validPositions.includes(position)) {
      throw new Error(`VideoFitEngine: posição inválida: ${position}. Use: ${validPositions.join(', ')}`);
    }
  }

  /**
   * @private
   */
  #validateContext(ctx) {
    if (!ctx || typeof ctx.drawImage !== 'function') {
      throw new Error('VideoFitEngine: contexto 2D inválido');
    }
  }

  /**
   * @private
   */
  #validateVideoElement(video) {
    if (!video || !(video instanceof HTMLVideoElement)) {
      throw new Error('VideoFitEngine: videoElement deve ser HTMLVideoElement');
    }
  }

  /**
   * @private
   */
  #validateFit(fit) {
    if (!fit || typeof fit.scale !== 'number') {
      throw new Error('VideoFitEngine: objeto fit inválido');
    }
  }
}

// Exportar para uso em módulos
if (typeof module !== 'undefined' && module.exports) {
  module.exports = VideoFitEngine;
}
