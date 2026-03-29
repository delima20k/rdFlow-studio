/**
 * ===================================================================
 * VIDEO EDITOR ENGINE - Sistema de Edição de Vídeo Vertical
 * ===================================================================
 * 
 * Arquitetura baseada em orientação a objetos para renderização
 * precisa de vídeos verticais (9:16) com composição de camadas.
 * 
 * @author DELIMA
 * @version 2.0
 */

// ===== CONSTANTES DE EXPORTAÇÃO =====
// PADRÃO PROFISSIONAL MOBILE-FIRST
// Sempre exportar em 1080x1920 (Full HD Vertical 9:16)
// Vídeo SEMPRE ocupa 100% da tela - SEM FAIXAS PRETAS
// Modo 'cover' corta o excesso ao invés de adicionar letterbox
// Upscale automático aplicado se fonte for menor
const EXPORT_CONFIG = {
  width: 1080,
  height: 1920,
  fps: 30,
  videoBitsPerSecond: 5000000,
  mimeType: 'video/webm;codecs=vp9'
};

// ===== CLASSE BASE: LAYER =====

/**
 * Classe abstrata para todas as camadas do editor
 */
class Layer {
  constructor(id, type) {
    this.id = id;
    this.type = type;
    this.x = 0; // Posição normalizada (0-1)
    this.y = 0; // Posição normalizada (0-1)
    this.width = 0; // Largura normalizada (0-1)
    this.height = 0; // Altura normalizada (0-1)
    this.scale = 1.0;
    this.rotation = 0; // Em graus
    this.zIndex = 0;
    this.visible = true;
    this.alpha = 1.0;
  }

  /**
   * Converte coordenadas normalizadas para pixels do canvas
   */
  toCanvasCoordinates(canvasWidth, canvasHeight) {
    return {
      x: this.x * canvasWidth,
      y: this.y * canvasHeight,
      width: this.width * canvasWidth * this.scale,
      height: this.height * canvasHeight * this.scale
    };
  }

  /**
   * Converte coordenadas de pixels para normalizadas
   */
  fromPixelCoordinates(pixelX, pixelY, referenceWidth, referenceHeight) {
    this.x = pixelX / referenceWidth;
    this.y = pixelY / referenceHeight;
  }

  /**
   * Método abstrato - deve ser implementado pelas subclasses
   */
  render(ctx, canvasWidth, canvasHeight) {
    throw new Error('render() deve ser implementado pela subclasse');
  }

  /**
   * Serializa camada para objeto simples
   */
  toJSON() {
    return {
      id: this.id,
      type: this.type,
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
      scale: this.scale,
      rotation: this.rotation,
      zIndex: this.zIndex,
      visible: this.visible,
      alpha: this.alpha
    };
  }
}

// ===== CLASSE: VIDEO LAYER =====

/**
 * Camada de vídeo principal (vídeo da tela gravada)
 */
class VideoLayer extends Layer {
  constructor(id, videoElement) {
    super(id, 'video');
    this.videoElement = videoElement;
    this.maintainAspectRatio = true;
    this.fitMode = 'cover'; // 'cover' = preenche toda a tela sem barras pretas (padrão TikTok/Reels)
  }

  /**
   * Calcula dimensões respeitando aspect ratio
   */
  calculateAspectRatioDimensions(canvasWidth, canvasHeight) {
    const videoWidth = this.videoElement.videoWidth;
    const videoHeight = this.videoElement.videoHeight;
    
    if (!videoWidth || !videoHeight) {
      return { width: canvasWidth, height: canvasHeight };
    }

    const videoAspect = videoWidth / videoHeight;
    const canvasAspect = canvasWidth / canvasHeight;

    let renderWidth, renderHeight;

    if (this.fitMode === 'contain') {
      if (videoAspect > canvasAspect) {
        // Vídeo mais largo
        renderWidth = canvasWidth;
        renderHeight = canvasWidth / videoAspect;
      } else {
        // Vídeo mais alto
        renderHeight = canvasHeight;
        renderWidth = canvasHeight * videoAspect;
      }
    } else if (this.fitMode === 'cover') {
      if (videoAspect > canvasAspect) {
        renderHeight = canvasHeight;
        renderWidth = canvasHeight * videoAspect;
      } else {
        renderWidth = canvasWidth;
        renderHeight = canvasWidth / videoAspect;
      }
    } else { // 'fill'
      renderWidth = canvasWidth;
      renderHeight = canvasHeight;
    }

    return { width: renderWidth, height: renderHeight };
  }

  render(ctx, canvasWidth, canvasHeight) {
    if (!this.visible || this.alpha === 0) return;

    ctx.save();
    ctx.globalAlpha = this.alpha;

    const coords = this.toCanvasCoordinates(canvasWidth, canvasHeight);
    
    // Aplicar rotação se necessário
    if (this.rotation !== 0) {
      ctx.translate(coords.x + coords.width / 2, coords.y + coords.height / 2);
      ctx.rotate((this.rotation * Math.PI) / 180);
      ctx.translate(-(coords.x + coords.width / 2), -(coords.y + coords.height / 2));
    }

    try {
      // Calcular dimensões respeitando aspect ratio se necessário
      if (this.maintainAspectRatio) {
        const dimensions = this.calculateAspectRatioDimensions(coords.width, coords.height);
        const offsetX = (coords.width - dimensions.width) / 2;
        const offsetY = (coords.height - dimensions.height) / 2;
        
        // MODO 'COVER': Preenche toda a tela cortando o excesso (padrão TikTok/Reels)
        // Aplica clipping para cortar partes do vídeo que excedem a área
        // RESULTADO: Vídeo sempre em fullscreen sem faixas pretas
        if (this.fitMode === 'cover') {
          ctx.beginPath();
          ctx.rect(coords.x, coords.y, coords.width, coords.height);
          ctx.clip();
        }
        
        ctx.drawImage(
          this.videoElement,
          coords.x + offsetX,
          coords.y + offsetY,
          dimensions.width,
          dimensions.height
        );
      } else {
        ctx.drawImage(
          this.videoElement,
          coords.x,
          coords.y,
          coords.width,
          coords.height
        );
      }
    } catch (error) {
      console.warn('[VideoLayer] Erro ao renderizar:', error);
    }

    ctx.restore();
  }

  toJSON() {
    return {
      ...super.toJSON(),
      maintainAspectRatio: this.maintainAspectRatio,
      fitMode: this.fitMode,
      videoWidth: this.videoElement.videoWidth,
      videoHeight: this.videoElement.videoHeight
    };
  }
}

// ===== CLASSE: WEBCAM LAYER =====

/**
 * Camada de webcam (vídeo gravado ou stream ao vivo)
 */
class WebcamLayer extends VideoLayer {
  constructor(id, videoElement) {
    super(id, videoElement);
    this.type = 'webcam';
    this.frameStyle = 'circular'; // 'circular', 'square', 'rounded-square', etc.
    this.borderWidth = 0.003; // Normalizado (3px em 1080)
    this.borderColor = '#ffffff';
    this.shadowBlur = 0.01; // Normalizado
    this.shadowColor = 'rgba(0, 0, 0, 0.5)';
  }

  render(ctx, canvasWidth, canvasHeight) {
    if (!this.visible || this.alpha === 0) return;

    ctx.save();
    ctx.globalAlpha = this.alpha;

    const coords = this.toCanvasCoordinates(canvasWidth, canvasHeight);
    const centerX = coords.x + coords.width / 2;
    const centerY = coords.y + coords.height / 2;
    const radius = Math.min(coords.width, coords.height) / 2;

    // Aplicar sombra
    if (this.shadowBlur > 0) {
      ctx.shadowBlur = this.shadowBlur * canvasWidth;
      ctx.shadowColor = this.shadowColor;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = this.shadowBlur * canvasWidth * 0.5;
    }

    // Criar clipping path baseado no estilo
    ctx.beginPath();
    
    switch (this.frameStyle) {
      case 'circular':
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        break;
      
      case 'square':
        ctx.rect(coords.x, coords.y, coords.width, coords.height);
        break;
      
      case 'rounded-square':
        const roundRadius = radius * 0.2;
        this.roundRect(ctx, coords.x, coords.y, coords.width, coords.height, roundRadius);
        break;
      
      case 'hexagon':
        this.hexagonPath(ctx, centerX, centerY, radius);
        break;
      
      default:
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    }

    ctx.clip();

    // Desenhar vídeo
    try {
      ctx.drawImage(
        this.videoElement,
        coords.x,
        coords.y,
        coords.width,
        coords.height
      );
    } catch (error) {
      console.warn('[WebcamLayer] Erro ao renderizar:', error);
      // Fallback: desenhar placeholder
      ctx.fillStyle = '#667eea';
      ctx.fill();
    }

    ctx.restore();
    ctx.save();

    // Desenhar borda (fora do clip)
    if (this.borderWidth > 0) {
      ctx.beginPath();
      
      switch (this.frameStyle) {
        case 'circular':
          ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
          break;
        
        case 'square':
          ctx.rect(coords.x, coords.y, coords.width, coords.height);
          break;
        
        case 'rounded-square':
          const roundRadius = radius * 0.2;
          this.roundRect(ctx, coords.x, coords.y, coords.width, coords.height, roundRadius);
          break;
        
        case 'hexagon':
          this.hexagonPath(ctx, centerX, centerY, radius);
          break;
      }

      ctx.strokeStyle = this.borderColor;
      ctx.lineWidth = this.borderWidth * canvasWidth;
      ctx.stroke();
    }

    ctx.restore();
  }

  /**
   * Helper: Desenha retângulo com cantos arredondados
   */
  roundRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  /**
   * Helper: Desenha hexágono
   */
  hexagonPath(ctx, centerX, centerY, radius) {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.closePath();
  }

  toJSON() {
    return {
      ...super.toJSON(),
      frameStyle: this.frameStyle,
      borderWidth: this.borderWidth,
      borderColor: this.borderColor
    };
  }
}

// ===== CLASSE: OVERLAY LAYER (Emoji, Texto) =====

/**
 * Camada de overlay (emoji, texto, adesivos)
 */
class OverlayLayer extends Layer {
  constructor(id, contentType, content) {
    super(id, 'overlay');
    this.contentType = contentType; // 'emoji', 'text', 'image'
    this.content = content;
    
    // Propriedades específicas de texto
    this.fontSize = 0.025; // Normalizado (24px em 1080)
    this.fontFamily = 'Arial, sans-serif';
    this.fontWeight = 'bold';
    this.textColor = '#ffffff';
    this.textAlign = 'center';
    this.textBaseline = 'middle';
    
    // Background do texto
    this.hasBackground = true;
    this.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    this.backgroundPadding = 0.015; // Normalizado
    
    // Sombra
    this.hasShadow = true;
    this.shadowBlur = 0.004; // Normalizado
    this.shadowColor = 'rgba(0, 0, 0, 0.8)';
    this.shadowOffsetX = 0.002; // Normalizado
    this.shadowOffsetY = 0.002; // Normalizado
  }

  render(ctx, canvasWidth, canvasHeight) {
    if (!this.visible || this.alpha === 0) return;

    ctx.save();
    ctx.globalAlpha = this.alpha;

    const coords = this.toCanvasCoordinates(canvasWidth, canvasHeight);
    
    // Centralizar na posição especificada
    ctx.translate(coords.x, coords.y);

    // Aplicar rotação se necessário
    if (this.rotation !== 0) {
      ctx.rotate((this.rotation * Math.PI) / 180);
    }

    if (this.contentType === 'emoji') {
      this.renderEmoji(ctx, canvasWidth, canvasHeight);
    } else if (this.contentType === 'text') {
      this.renderText(ctx, canvasWidth, canvasHeight);
    }

    ctx.restore();
  }

  /**
   * Renderiza emoji
   */
  renderEmoji(ctx, canvasWidth, canvasHeight) {
    const fontSize = this.fontSize * canvasWidth * this.scale;
    
    ctx.font = `${fontSize}px Arial`;
    ctx.textAlign = this.textAlign;
    ctx.textBaseline = this.textBaseline;
    
    // Sombra
    if (this.hasShadow) {
      ctx.shadowColor = this.shadowColor;
      ctx.shadowBlur = this.shadowBlur * canvasWidth;
      ctx.shadowOffsetX = this.shadowOffsetX * canvasWidth;
      ctx.shadowOffsetY = this.shadowOffsetY * canvasWidth;
    }
    
    ctx.fillText(this.content, 0, 0);
  }

  /**
   * Renderiza texto
   */
  renderText(ctx, canvasWidth, canvasHeight) {
    const fontSize = this.fontSize * canvasWidth * this.scale;
    
    ctx.font = `${this.fontWeight} ${fontSize}px ${this.fontFamily}`;
    ctx.textAlign = this.textAlign;
    ctx.textBaseline = this.textBaseline;

    // Medir texto para background
    const textMetrics = ctx.measureText(this.content);
    const textWidth = textMetrics.width;
    const textHeight = fontSize;

    // Desenhar background se habilitado
    if (this.hasBackground) {
      const padding = this.backgroundPadding * canvasWidth;
      
      ctx.fillStyle = this.backgroundColor;
      ctx.fillRect(
        -textWidth / 2 - padding,
        -textHeight / 2 - padding / 2,
        textWidth + padding * 2,
        textHeight + padding
      );
    }

    // Desenhar texto
    ctx.fillStyle = this.textColor;
    
    if (this.hasShadow) {
      ctx.shadowColor = this.shadowColor;
      ctx.shadowBlur = this.shadowBlur * canvasWidth;
      ctx.shadowOffsetX = this.shadowOffsetX * canvasWidth;
      ctx.shadowOffsetY = this.shadowOffsetY * canvasWidth;
    }
    
    ctx.fillText(this.content, 0, 0);
  }

  toJSON() {
    return {
      ...super.toJSON(),
      contentType: this.contentType,
      content: this.content,
      fontSize: this.fontSize,
      fontFamily: this.fontFamily,
      textColor: this.textColor,
      backgroundColor: this.backgroundColor
    };
  }
}

// ===== CLASSE: BACKGROUND LAYER (Faixas pretas) =====

/**
 * Camada de faixa preta (superior ou inferior)
 */
class BackgroundBarLayer extends Layer {
  constructor(id, position, heightNormalized) {
    super(id, 'background-bar');
    this.position = position; // 'top' ou 'bottom'
    this.heightNormalized = heightNormalized; // Altura normalizada (0-1)
    this.color = '#000000';
  }

  render(ctx, canvasWidth, canvasHeight) {
    if (!this.visible || this.alpha === 0) return;

    ctx.save();
    ctx.globalAlpha = this.alpha;
    ctx.fillStyle = this.color;

    const height = this.heightNormalized * canvasHeight;

    if (this.position === 'top') {
      ctx.fillRect(0, 0, canvasWidth, height);
    } else if (this.position === 'bottom') {
      ctx.fillRect(0, canvasHeight - height, canvasWidth, height);
    }

    ctx.restore();
  }

  toJSON() {
    return {
      ...super.toJSON(),
      position: this.position,
      heightNormalized: this.heightNormalized,
      color: this.color
    };
  }
}

// ===== CLASSE: EDITOR ENGINE =====

/**
 * Engine principal do editor - Gerencia todas as camadas e estado
 */
class EditorEngine {
  constructor() {
    this.layers = [];
    this.nextId = 1;
    this.selectedLayerId = null;
    
    // Configurações do canvas de preview (DOM)
    this.previewWidth = 360;
    this.previewHeight = 640;
    
    // Configurações do vídeo (área útil)
    this.videoAreaTopNormalized = 80 / 640; // 80px de 640px
    this.videoAreaBottomNormalized = 100 / 640; // 100px de 640px
  }

  /**
   * Adiciona uma nova camada
   */
  addLayer(layer) {
    this.layers.push(layer);
    this.sortLayers();
    console.log(`[EditorEngine] Camada adicionada: ${layer.type} (ID: ${layer.id})`);
    return layer.id;
  }

  /**
   * Remove camada por ID
   */
  removeLayer(id) {
    const index = this.layers.findIndex(l => l.id === id);
    if (index !== -1) {
      const removed = this.layers.splice(index, 1)[0];
      console.log(`[EditorEngine] Camada removida: ${removed.type} (ID: ${id})`);
      return true;
    }
    return false;
  }

  /**
   * Busca camada por ID
   */
  getLayer(id) {
    return this.layers.find(l => l.id === id);
  }

  /**
   * Ordena camadas por zIndex
   */
  sortLayers() {
    this.layers.sort((a, b) => a.zIndex - b.zIndex);
  }

  /**
   * Atualiza altura das barras superior e inferior
   */
  updateVideoAreaBars(topHeightPixels, bottomHeightPixels, referenceHeight = 640) {
    this.videoAreaTopNormalized = topHeightPixels / referenceHeight;
    this.videoAreaBottomNormalized = bottomHeightPixels / referenceHeight;
    
    console.log(`[EditorEngine] Barras atualizadas: Top=${topHeightPixels}px, Bottom=${bottomHeightPixels}px`);
  }

  /**
   * Gera próximo ID único
   */
  generateId() {
    return `layer-${this.nextId++}`;
  }

  /**
   * Exporta estado completo do editor
   */
  exportState() {
    return {
      layers: this.layers.map(l => l.toJSON()),
      videoAreaTopNormalized: this.videoAreaTopNormalized,
      videoAreaBottomNormalized: this.videoAreaBottomNormalized
    };
  }

  /**
   * Limpa todas as camadas
   */
  clear() {
    this.layers = [];
    this.selectedLayerId = null;
    this.nextId = 1;
  }
}

// ===== CLASSE: RENDER CANVAS ENGINE =====

/**
 * Engine de renderização - Renderiza todas as camadas no canvas
 * 
 * IMPORTANTE: Esta mesma engine é usada para:
 * - Preview em tempo real (360x640)
 * - Exportação final (1080x1920)
 * 
 * Coordenadas normalizadas (0-1) garantem que os elementos
 * aparecem na mesma posição relativa independente da resolução.
 * 
 * RESULTADO: WYSIWYG (What You See Is What You Get)
 * O preview mostra EXATAMENTE como será o vídeo exportado.
 */
class RenderCanvasEngine {
  constructor(editorEngine) {
    this.editorEngine = editorEngine;
  }

  /**
   * Renderiza um frame completo no canvas
   * Funciona para qualquer resolução (preview ou exportação)
   */
  renderFrame(ctx, canvasWidth, canvasHeight) {
    // Limpar canvas (fundo preto)
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Renderizar todas as camadas em ordem de zIndex
    for (const layer of this.editorEngine.layers) {
      if (layer.visible) {
        layer.render(ctx, canvasWidth, canvasHeight);
      }
    }
  }

  /**
   * Renderiza preview em tempo real
   */
  renderPreview(canvas) {
    const ctx = canvas.getContext('2d');
    this.renderFrame(ctx, canvas.width, canvas.height);
  }
}

// ===== CLASSE: EXPORT MANAGER =====

/**
 * Gerenciador de exportação - Coordena renderização e gravação
 */
class ExportManager {
  constructor(editorEngine, renderEngine) {
    this.editorEngine = editorEngine;
    this.renderEngine = renderEngine;
    this.isExporting = false;
    this.exportProgress = 0;
  }

  /**
   * Exporta vídeo final
   * SEMPRE em resolução 1080x1920 (Full HD Vertical 9:16)
   * Upscale automático aplicado se fonte for menor
   */
  async exportVideo(mainVideoElement, onProgress = null) {
    if (this.isExporting) {
      throw new Error('Exportação já em andamento');
    }

    this.isExporting = true;
    this.exportProgress = 0;

    console.log('[ExportManager] Iniciando exportação...');
    console.log(`[ExportManager] Resolução de exportação: ${EXPORT_CONFIG.width}x${EXPORT_CONFIG.height} (9:16 Full HD)`);
    console.log(`[ExportManager] Fonte: ${mainVideoElement.videoWidth}x${mainVideoElement.videoHeight}`);

    // Criar canvas de exportação - SEMPRE 1080x1920
    const canvas = document.createElement('canvas');
    canvas.width = EXPORT_CONFIG.width;
    canvas.height = EXPORT_CONFIG.height;
    const ctx = canvas.getContext('2d');

    // Validação: garantir que nunca exporte em resolução menor
    if (canvas.width !== 1080 || canvas.height !== 1920) {
      throw new Error(`ERRO CRÍTICO: Canvas de exportação com resolução incorreta (${canvas.width}x${canvas.height})`);
    }

    // Preparar vídeo principal
    mainVideoElement.currentTime = 0;
    mainVideoElement.muted = false;
    await new Promise(resolve => { mainVideoElement.onseeked = resolve; });

    // Preparar todos os vídeos de webcam
    const webcamLayers = this.editorEngine.layers.filter(l => l.type === 'webcam');
    for (const webcamLayer of webcamLayers) {
      webcamLayer.videoElement.currentTime = 0;
      webcamLayer.videoElement.muted = true;
      await new Promise(resolve => { webcamLayer.videoElement.onseeked = resolve; });
    }

    // Configurar MediaRecorder
    const canvasStream = canvas.captureStream(EXPORT_CONFIG.fps);

    // Adicionar áudio do vídeo principal
    try {
      const videoStream = mainVideoElement.captureStream ? mainVideoElement.captureStream() : mainVideoElement.mozCaptureStream();
      const audioTracks = videoStream.getAudioTracks();
      
      if (audioTracks.length > 0) {
        audioTracks.forEach(track => canvasStream.addTrack(track));
        console.log('[ExportManager] Áudio adicionado ao stream');
      }
    } catch (error) {
      console.warn('[ExportManager] Erro ao capturar áudio:', error);
    }

    const chunks = [];
    const recorder = new MediaRecorder(canvasStream, {
      mimeType: EXPORT_CONFIG.mimeType,
      videoBitsPerSecond: EXPORT_CONFIG.videoBitsPerSecond
    });

    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        chunks.push(e.data);
      }
    };

    // Função de renderização de frame
    let startTime = null;
    let lastProgressUpdate = 0;

    const renderFrame = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const elapsed = (timestamp - startTime) / 1000;

      // Verificar se chegou ao fim
      if (elapsed >= mainVideoElement.duration) {
        recorder.stop();
        return;
      }

      // Renderizar frame atual
      this.renderEngine.renderFrame(ctx, canvas.width, canvas.height);

      // Atualizar progresso
      this.exportProgress = Math.min(99, (elapsed / mainVideoElement.duration) * 100);
      
      if (onProgress && timestamp - lastProgressUpdate >= 1000) {
        onProgress(this.exportProgress, elapsed, mainVideoElement.duration);
        lastProgressUpdate = timestamp;
      }

      // Próximo frame
      requestAnimationFrame(renderFrame);
    };

    // Iniciar gravação
    recorder.start();
    mainVideoElement.play();

    // Iniciar todos os vídeos de webcam
    webcamLayers.forEach(layer => {
      layer.videoElement.play().catch(err => {
        console.warn('[ExportManager] Erro ao tocar webcam:', err);
      });
    });

    // Iniciar renderização
    requestAnimationFrame(renderFrame);

    // Aguardar finalização
    await new Promise(resolve => {
      recorder.onstop = resolve;
    });

    // Parar vídeos
    mainVideoElement.pause();
    mainVideoElement.muted = true;
    
    webcamLayers.forEach(layer => {
      layer.videoElement.pause();
    });

    // Criar blob final
    const blob = new Blob(chunks, { type: 'video/webm' });

    this.isExporting = false;
    this.exportProgress = 100;

    console.log('[ExportManager] Exportação concluída!', {
      size: `${(blob.size / 1024 / 1024).toFixed(2)} MB`,
      duration: `${mainVideoElement.duration.toFixed(2)}s`
    });

    return blob;
  }

  /**
   * Faz download do blob exportado
   */
  downloadBlob(blob, filename = null) {
    if (!filename) {
      filename = `video-vertical-${new Date().toISOString().slice(0, 10)}.webm`;
    }

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();

    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 1000);

    console.log('[ExportManager] Download iniciado:', filename);
  }
}

// ===== EXPORTS ES6 =====
export {
  Layer,
  VideoLayer,
  WebcamLayer,
  OverlayLayer,
  BackgroundBarLayer,
  EditorEngine,
  RenderCanvasEngine,
  ExportManager,
  EXPORT_CONFIG
};

console.log('[Video Editor Engine] Sistema carregado com sucesso! ✅');
