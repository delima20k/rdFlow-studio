/**
 * TimelineRenderer - Renderizador de Timeline de Vídeo
 * 
 * Renderiza vídeo final frame por frame, aplicando layout exatamente
 * como no preview do editor. Gerencia camadas (vídeo principal, webcam,
 * textos, emojis) em canvas fixo de 1080x1920.
 * 
 * @class
 * @author DELIMA
 * @version 1.0.0
 */
class TimelineRenderer {
  // Campos privados
  #exportConfig;
  #videoFitEngine;
  #canvas;
  #ctx;
  #timelineState;
  #canvasWidth;
  #canvasHeight;

  /**
   * Cria instância do TimelineRenderer
   * 
   * @param {ExportConfig} exportConfig - Configuração de exportação
   * @param {VideoFitEngine} videoFitEngine - Motor de ajuste de vídeo
   * @throws {Error} Se parâmetros forem inválidos
   */
  constructor(exportConfig, videoFitEngine) {
    this.#validateConstructorParams(exportConfig, videoFitEngine);

    this.#exportConfig = exportConfig;
    this.#videoFitEngine = videoFitEngine;
    this.#canvasWidth = exportConfig.width;
    this.#canvasHeight = exportConfig.height;

    // Criar canvas de renderização
    this.#initializeCanvas();

    // Estado inicial vazio
    this.#timelineState = null;
  }

  /**
   * Define o estado da timeline capturado do editor
   * 
   * @param {Object} state - Estado da timeline
   * @param {Object} state.mainVideo - Configuração do vídeo principal
   * @param {Object} state.webcam - Configuração da webcam (opcional)
   * @param {Array} state.overlays - Array de overlays (textos/emojis)
   */
  setTimelineState(state) {
    this.#validateTimelineState(state);
    this.#timelineState = state;
  }

  /**
   * Renderiza um frame específico no tempo atual
   * 
   * Ordem de renderização (camadas):
   * 1. Background (cor sólida)
   * 2. Vídeo principal (com VideoFitEngine)
   * 3. Webcam overlay (se presente)
   * 4. Textos/Emojis overlay
   * 
   * @param {number} currentTime - Tempo em segundos
   * @returns {ImageData} Frame renderizado
   * @throws {Error} Se timeline state não foi definido
   */
  renderFrame(currentTime) {
    if (!this.#timelineState) {
      throw new Error('TimelineRenderer: defina o estado da timeline com setTimelineState() primeiro');
    }

    this.#validateCurrentTime(currentTime);

    // 1. Limpar e preparar canvas
    this.clear();

    const { mainVideo, webcam, overlays } = this.#timelineState;

    // 2. Renderizar vídeo principal
    if (mainVideo && mainVideo.element) {
      this.renderMainVideo(
        mainVideo.element,
        mainVideo.position || 'center',
        mainVideo.scale || 1.0,
        currentTime
      );
    }

    // 3. Renderizar webcam overlay
    if (webcam && webcam.element && webcam.visible !== false) {
      this.renderWebcam(
        webcam.element,
        webcam,
        currentTime
      );
    }

    // 4. Renderizar overlays (textos/emojis)
    if (overlays && overlays.length > 0) {
      this.renderOverlays(overlays);
    }

    // Retornar ImageData do frame atual
    return this.#ctx.getImageData(0, 0, this.#canvasWidth, this.#canvasHeight);
  }

  /**
   * Renderiza vídeo principal usando VideoFitEngine
   * 
   * @param {HTMLVideoElement} videoElement - Elemento de vídeo
   * @param {string} position - Posição vertical: 'top', 'center', 'bottom'
   * @param {number} scale - Escala adicional do usuário (1.0 = 100%)
   * @param {number} currentTime - Tempo em segundos
   */
  renderMainVideo(videoElement, position, scale, currentTime) {
    this.#validateVideoElement(videoElement);

    // Sincronizar vídeo com tempo atual
    this.#syncVideoTime(videoElement, currentTime);

    // Calcular fit usando VideoFitEngine
    const fit = this.#videoFitEngine.calculateFit(
      videoElement.videoWidth,
      videoElement.videoHeight,
      position
    );

    // Aplicar escala adicional do usuário
    if (scale !== 1.0) {
      fit.scaledWidth *= scale;
      fit.scaledHeight *= scale;
      fit.offsetX = (this.#canvasWidth - fit.scaledWidth) / 2;
      fit.offsetY = this.#calculateScaledVerticalOffset(fit.scaledHeight, position);
    }

    // Desenhar vídeo no canvas
    this.#videoFitEngine.applyToCanvas(
      this.#ctx,
      videoElement,
      fit,
      0,
      0
    );
  }

  /**
   * Renderiza webcam em overlay
   * 
   * @param {HTMLVideoElement} webcamElement - Elemento da webcam
   * @param {Object} webcamConfig - Configuração da webcam
   * @param {number} webcamConfig.x - Posição X
   * @param {number} webcamConfig.y - Posição Y
   * @param {number} webcamConfig.width - Largura
   * @param {number} webcamConfig.height - Altura
   * @param {number} currentTime - Tempo em segundos
   */
  renderWebcam(webcamElement, webcamConfig, currentTime) {
    this.#validateVideoElement(webcamElement);

    // Sincronizar webcam com tempo atual
    this.#syncVideoTime(webcamElement, currentTime);

    // Valores padrão
    const x = webcamConfig.x || 0;
    const y = webcamConfig.y || 0;
    const width = webcamConfig.width || 200;
    const height = webcamConfig.height || 200;

    // Salvar estado
    this.#ctx.save();

    try {
      // Adicionar borda opcional para webcam
      if (webcamConfig.borderWidth) {
        this.#ctx.strokeStyle = webcamConfig.borderColor || '#ffffff';
        this.#ctx.lineWidth = webcamConfig.borderWidth;
        this.#ctx.strokeRect(x, y, width, height);
      }

      // Desenhar webcam
      this.#ctx.drawImage(
        webcamElement,
        x,
        y,
        width,
        height
      );
    } finally {
      this.#ctx.restore();
    }
  }

  /**
   * Renderiza overlays (textos e emojis)
   * 
   * @param {Array} overlays - Array de objetos overlay
   */
  renderOverlays(overlays) {
    if (!Array.isArray(overlays)) {
      return;
    }

    overlays.forEach(overlay => {
      switch (overlay.type) {
        case 'text':
          this.#renderTextOverlay(overlay);
          break;
        
        case 'emoji':
          this.#renderEmojiOverlay(overlay);
          break;
        
        default:
          console.warn(`TimelineRenderer: tipo de overlay desconhecido: ${overlay.type}`);
      }
    });
  }

  /**
   * Limpa o canvas e preenche com backgroundColor
   */
  clear() {
    this.#ctx.fillStyle = this.#exportConfig.backgroundColor;
    this.#ctx.fillRect(0, 0, this.#canvasWidth, this.#canvasHeight);
  }

  /**
   * Retorna o canvas com frame atual
   * Usado pelo Mp4Exporter
   * 
   * @returns {HTMLCanvasElement}
   */
  getCanvas() {
    return this.#canvas;
  }

  /**
   * Retorna contexto 2D do canvas
   * 
   * @returns {CanvasRenderingContext2D}
   */
  getContext() {
    return this.#ctx;
  }

  /**
   * Retorna dimensões do canvas
   * 
   * @returns {Object} {width, height}
   */
  getDimensions() {
    return {
      width: this.#canvasWidth,
      height: this.#canvasHeight
    };
  }

  // ===================================
  // MÉTODOS PRIVADOS
  // ===================================

  /**
   * Inicializa canvas de renderização
   * 
   * @private
   */
  #initializeCanvas() {
    // Criar canvas (browser ou node)
    if (typeof document !== 'undefined') {
      this.#canvas = document.createElement('canvas');
    } else {
      // Ambiente Node.js (usando canvas library)
      const { createCanvas } = require('canvas');
      this.#canvas = createCanvas(this.#canvasWidth, this.#canvasHeight);
    }

    this.#canvas.width = this.#canvasWidth;
    this.#canvas.height = this.#canvasHeight;

    this.#ctx = this.#canvas.getContext('2d');

    // Configurações de qualidade
    this.#ctx.imageSmoothingEnabled = true;
    this.#ctx.imageSmoothingQuality = 'high';
  }

  /**
   * Sincroniza tempo do vídeo
   * 
   * @private
   * @param {HTMLVideoElement} videoElement - Elemento de vídeo
   * @param {number} currentTime - Tempo em segundos
   */
  #syncVideoTime(videoElement, currentTime) {
    if (Math.abs(videoElement.currentTime - currentTime) > 0.01) {
      videoElement.currentTime = currentTime;
    }
  }

  /**
   * Calcula offset vertical considerando escala adicional
   * 
   * @private
   * @param {number} scaledHeight - Altura escalada
   * @param {string} position - Posição vertical
   * @returns {number} Offset Y
   */
  #calculateScaledVerticalOffset(scaledHeight, position) {
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
   * Renderiza overlay de texto
   * 
   * @private
   * @param {Object} overlay - Configuração do texto
   */
  #renderTextOverlay(overlay) {
    this.#ctx.save();

    try {
      // Configurar fonte
      const fontSize = overlay.fontSize || 48;
      const fontFamily = overlay.fontFamily || 'Arial, sans-serif';
      const fontWeight = overlay.fontWeight || 'normal';
      
      this.#ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
      this.#ctx.fillStyle = overlay.color || '#ffffff';
      this.#ctx.textAlign = overlay.align || 'left';
      this.#ctx.textBaseline = overlay.baseline || 'top';

      // Sombra opcional
      if (overlay.shadow) {
        this.#ctx.shadowColor = overlay.shadowColor || 'rgba(0, 0, 0, 0.8)';
        this.#ctx.shadowBlur = overlay.shadowBlur || 4;
        this.#ctx.shadowOffsetX = overlay.shadowOffsetX || 2;
        this.#ctx.shadowOffsetY = overlay.shadowOffsetY || 2;
      }

      // Desenhar texto
      this.#ctx.fillText(overlay.content, overlay.x, overlay.y);
    } finally {
      this.#ctx.restore();
    }
  }

  /**
   * Renderiza overlay de emoji
   * 
   * @private
   * @param {Object} overlay - Configuração do emoji
   */
  #renderEmojiOverlay(overlay) {
    this.#ctx.save();

    try {
      const fontSize = overlay.fontSize || 48;
      
      this.#ctx.font = `${fontSize}px Arial, sans-serif`;
      this.#ctx.textAlign = 'center';
      this.#ctx.textBaseline = 'middle';

      // Emojis não precisam de cor, mas pode ter sombra
      if (overlay.shadow) {
        this.#ctx.shadowColor = overlay.shadowColor || 'rgba(0, 0, 0, 0.5)';
        this.#ctx.shadowBlur = overlay.shadowBlur || 4;
      }

      this.#ctx.fillText(overlay.content, overlay.x, overlay.y);
    } finally {
      this.#ctx.restore();
    }
  }

  // ===================================
  // VALIDAÇÕES
  // ===================================

  /**
   * @private
   */
  #validateConstructorParams(config, fitEngine) {
    if (!config) {
      throw new Error('TimelineRenderer: exportConfig é obrigatório');
    }
    if (!fitEngine) {
      throw new Error('TimelineRenderer: videoFitEngine é obrigatório');
    }
  }

  /**
   * @private
   */
  #validateTimelineState(state) {
    if (!state) {
      throw new Error('TimelineRenderer: estado da timeline é obrigatório');
    }
    if (!state.mainVideo) {
      throw new Error('TimelineRenderer: estado deve conter mainVideo');
    }
  }

  /**
   * @private
   */
  #validateCurrentTime(time) {
    if (typeof time !== 'number' || time < 0) {
      throw new Error(`TimelineRenderer: currentTime inválido: ${time}`);
    }
  }

  /**
   * @private
   */
  #validateVideoElement(video) {
    if (!video || !(video instanceof HTMLVideoElement)) {
      throw new Error('TimelineRenderer: videoElement deve ser HTMLVideoElement');
    }
  }
}

// Exportar para uso em módulos
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TimelineRenderer;
}
