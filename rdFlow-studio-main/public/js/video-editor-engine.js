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
function getBestMimeType() {
  const candidates = [
    'video/mp4;codecs=avc1.42E01E',
    'video/mp4;codecs=h264',
    'video/mp4',
    'video/webm;codecs=vp9',
    'video/webm'
  ];
  for (const mime of candidates) {
    if (MediaRecorder.isTypeSupported(mime)) return mime;
  }
  return 'video/webm';
}

const EXPORT_MIME = getBestMimeType();
const EXPORT_EXT  = EXPORT_MIME.startsWith('video/mp4') ? 'mp4' : 'webm';

const EXPORT_CONFIG = {
  width: 1080,
  height: 1920,
  fps: 30,
  videoBitsPerSecond: 8000000,
  mimeType: EXPORT_MIME
};

console.log('[ExportConfig] Formato selecionado:', EXPORT_MIME, '→ .'+EXPORT_EXT);

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

    // Centro do box no canvas — a escala sempre parte do centro, não do canto superior-esquerdo
    const boxCX = (this.x + this.width  / 2) * canvasWidth;
    const boxCY = (this.y + this.height / 2) * canvasHeight;

    // Dimensões do box após aplicar scale
    const boxW = this.width  * canvasWidth  * this.scale;
    const boxH = this.height * canvasHeight * this.scale;

    // Deslocamento vertical (panY normalizado; 0.5 = 50 % da altura do canvas)
    const panOffsetY = (this.panY || 0) * canvasHeight * 0.5;

    // Topo-esquerda do box escalado e pan-ado
    const bx = boxCX - boxW / 2;
    const by = boxCY - boxH / 2 + panOffsetY;

    // Rotação a partir do centro do box pós-pan
    if (this.rotation !== 0) {
      ctx.translate(boxCX, boxCY + panOffsetY);
      ctx.rotate((this.rotation * Math.PI) / 180);
      ctx.translate(-boxCX, -(boxCY + panOffsetY));
    }

    try {
      let dx, dy, dw, dh;

      if (this.maintainAspectRatio) {
        const dimensions = this.calculateAspectRatioDimensions(boxW, boxH);
        const offsetX = (boxW - dimensions.width)  / 2;
        const offsetY = (boxH - dimensions.height) / 2;
        dx = bx + offsetX;
        dy = by + offsetY;
        dw = dimensions.width;
        dh = dimensions.height;

        if (this.fitMode === 'cover') {
          ctx.beginPath();
          ctx.rect(bx, by, boxW, boxH);
          ctx.clip();
        }
      } else {
        dx = bx; dy = by; dw = boxW; dh = boxH;
      }

      ctx.drawImage(this.videoElement, dx, dy, dw, dh);
    } catch (error) {
      console.warn('[VideoLayer] Erro ao renderizar:', error);
    }

    ctx.restore();
  }

  setBoxSize(widthNormalized, heightNormalized) {
    this.width = widthNormalized;
    this.height = heightNormalized;
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
    this.frameStyle = 'square'; // 'square' (padrão), 'circular', 'rounded-square', 'hexagon'
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

// ===== CLASSE: CAMERA FRAME STYLE =====

/**
 * CameraFrameStyle — value object com todas as propriedades visuais do overlay.
 *
 * Separar estilo de geometria e renderização garante que:
 *  - O painel de personalização só manipula dados (não canvas)
 *  - CameraShapeRenderer só renderiza (não armazena estado)
 *  - CameraOverlayLayer apenas orquestra: lê o style, delega ao renderer
 *
 * Presets disponíveis (via CameraShapeRenderer.applyPreset):
 *  none | simple | clean | neon | gamer | glass | colorful | shadow | gradient
 */
class CameraFrameStyle {
  constructor() {
    // ── Forma geométrica ──────────────────────────────────────────
    // 'square' | 'rect-h' | 'rect-v' | 'circle' | 'oval' |
    // 'diamond' | 'hexagon' | 'rounded'
    this.shape = 'square';

    // ── Borda ─────────────────────────────────────────────────────
    this.borderColor   = '#3b82f6';   // cor hex ou 'gradient' / 'gradient-cool'
    this.borderWidth   = 0.003;       // fração de canvasWidth (ex: 0.003 ≈ 3px em 1080)
    this.borderStyle   = 'solid';     // 'solid' | 'dashed' | 'double' | 'none'
    this.borderOpacity = 1.0;         // 0..1

    // ── Arredondamento ───────────────────────────────────────────
    // Fração de min(w,h); 0 = canto reto; 0.5 = totalmente arredondado
    this.borderRadius  = 0.0;

    // ── Sombra ────────────────────────────────────────────────────
    this.shadowEnabled = true;
    this.shadowColor   = 'rgba(0,0,0,0.65)';
    this.shadowBlur    = 0.015;       // fração de canvasWidth
    this.shadowOffsetY = 0.006;       // fração de canvasWidth

    // ── Glow (aureola de luz) ─────────────────────────────────────
    this.glowEnabled   = false;
    this.glowColor     = '#3b82f6';
    this.glowBlur      = 0.03;        // fração de canvasWidth

    // ── Preset aplicado (nome informativo, não afeta render direto) ─
    this.framePreset   = 'none';

    // ── Opacidade geral ───────────────────────────────────────────
    this.alpha = 1.0;
  }

  /** Retorna snapshot serializável */
  toJSON() {
    return { ...this };
  }

  /** Sobrescreve campos a partir de um objeto plain (ex: JSON.parse) */
  fromObject(obj) {
    if (!obj || typeof obj !== 'object') return this;
    Object.assign(this, obj);
    return this;
  }

  /** Clona para um novo CameraFrameStyle */
  clone() {
    return new CameraFrameStyle().fromObject(this.toJSON());
  }
}

// ===== CLASSE: CAMERA SHAPE RENDERER =====

/**
 * CameraShapeRenderer — renderizador stateless do overlay de câmera.
 *
 * Responsabilidades:
 *  - Construir clip paths para todos os formatos suportados
 *  - Aplicar sombra e glow via ctx.shadow*
 *  - Renderizar borda (sólida, tracejada, dupla, gradiente)
 *  - Aplicar presets de moldura (muta o CameraFrameStyle passado)
 *
 * Nota: cada método realiza ctx.save()/restore() internamente.
 * O chamador não precisa gerenciar estado de canvas.
 */
class CameraShapeRenderer {
  /** @param {CameraFrameStyle} style */
  constructor(style) {
    this._style = style;
  }

  get style()    { return this._style; }
  set style(s)   { this._style = s; }

  // ── Path ────────────────────────────────────────────────────────

  /**
   * Constrói o path correspondente ao shape do style.
   * NÃO chama clip() ou stroke() — o chamador decide.
   */
  buildPath(ctx, x, y, w, h) {
    const s = this._style;
    const r = s.borderRadius * Math.min(w, h);

    ctx.beginPath();
    switch (s.shape) {
      case 'circle':
        ctx.arc(x + w / 2, y + h / 2, Math.min(w, h) / 2, 0, Math.PI * 2);
        break;

      case 'oval':
        ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
        break;

      case 'diamond':
        ctx.moveTo(x + w / 2, y);
        ctx.lineTo(x + w,     y + h / 2);
        ctx.lineTo(x + w / 2, y + h);
        ctx.lineTo(x,         y + h / 2);
        ctx.closePath();
        break;

      case 'hexagon':
        for (let i = 0; i < 6; i++) {
          const angle = (Math.PI / 3) * i - Math.PI / 6;
          const px = (x + w / 2) + (Math.min(w, h) / 2) * Math.cos(angle);
          const py = (y + h / 2) + (Math.min(w, h) / 2) * Math.sin(angle);
          i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        }
        ctx.closePath();
        break;

      case 'rounded':
        this._roundRectPath(ctx, x, y, w, h, Math.max(r, Math.min(w, h) * 0.18));
        break;

      // rect-h, rect-v e square usam o mesmo path (shape define proporção no layer)
      case 'rect-h':
      case 'rect-v':
      case 'square':
      default:
        if (r > 0) this._roundRectPath(ctx, x, y, w, h, r);
        else       ctx.rect(x, y, w, h);
    }
  }

  // ── Sombra ──────────────────────────────────────────────────────

  /**
   * Aplica shadow no ctx atual. Requer que o ctx.save() tenha sido feito pelo chamador.
   */
  applyShadow(ctx, canvasWidth) {
    const s = this._style;
    if (!s.shadowEnabled) return;
    ctx.shadowBlur    = s.shadowBlur    * canvasWidth;
    ctx.shadowColor   = s.shadowColor;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = s.shadowOffsetY * canvasWidth;
  }

  // ── Glow ────────────────────────────────────────────────────────

  /** Renderiza uma aureola de luz ao redor do shape */
  renderGlow(ctx, x, y, w, h, canvasWidth) {
    const s = this._style;
    if (!s.glowEnabled) return;

    ctx.save();
    ctx.shadowBlur  = s.glowBlur * canvasWidth;
    ctx.shadowColor = s.glowColor;
    ctx.strokeStyle = s.glowColor;
    ctx.lineWidth   = 2;
    ctx.globalAlpha = 0.75;
    this.buildPath(ctx, x, y, w, h);
    ctx.stroke();
    ctx.restore();
  }

  // ── Borda ───────────────────────────────────────────────────────

  /** Renderiza a borda após o clip + vídeo terem sido desenhados */
  renderBorder(ctx, x, y, w, h, canvasWidth) {
    const s = this._style;
    if (s.borderStyle === 'none' || s.borderWidth <= 0) return;

    const lineW = s.borderWidth * canvasWidth;

    ctx.save();
    ctx.globalAlpha = s.borderOpacity;
    ctx.lineWidth   = lineW;
    ctx.strokeStyle = this._resolveBorderColor(ctx, s, x, y, w, h);

    if (s.borderStyle === 'dashed') {
      ctx.setLineDash([lineW * 3, lineW * 2]);
      this.buildPath(ctx, x, y, w, h);
      ctx.stroke();

    } else if (s.borderStyle === 'double') {
      // Anel externo
      ctx.lineWidth = lineW * 0.4;
      this.buildPath(ctx, x - lineW * 0.7, y - lineW * 0.7, w + lineW * 1.4, h + lineW * 1.4);
      ctx.stroke();
      // Anel interno
      this.buildPath(ctx, x + lineW * 0.7, y + lineW * 0.7, w - lineW * 1.4, h - lineW * 1.4);
      ctx.stroke();

    } else {
      // solid (padrão)
      this.buildPath(ctx, x, y, w, h);
      ctx.stroke();
    }

    ctx.restore();
  }

  // ── Presets ─────────────────────────────────────────────────────

  /**
   * Aplica um preset nomeado ao objeto CameraFrameStyle passado.
   * Muta o style — clone antes se quiser preservar o original.
   *
   * @param {CameraFrameStyle} style
   * @param {string} preset
   */
  static applyPreset(style, preset) {
    switch (preset) {
      case 'simple':
        Object.assign(style, {
          borderStyle: 'solid',  borderColor: '#ffffff',
          borderWidth: 0.004,    borderOpacity: 1.0,
          shadowEnabled: true,   shadowColor: 'rgba(0,0,0,0.5)',
          glowEnabled: false
        });
        break;

      case 'clean':
        Object.assign(style, {
          borderStyle: 'solid',  borderColor: '#e8edf5',
          borderWidth: 0.002,    borderOpacity: 0.55,
          shadowEnabled: false,  glowEnabled: false
        });
        break;

      case 'neon':
        Object.assign(style, {
          borderStyle: 'solid',  borderColor: '#00f7ff',
          borderWidth: 0.004,    borderOpacity: 1.0,
          shadowEnabled: false,
          glowEnabled: true,     glowColor: '#00f7ff',   glowBlur: 0.05
        });
        break;

      case 'gamer':
        Object.assign(style, {
          borderStyle: 'solid',  borderColor: '#ff00ff',
          borderWidth: 0.005,    borderOpacity: 1.0,
          shadowEnabled: true,   shadowColor: 'rgba(255,0,255,0.45)',
          glowEnabled: true,     glowColor: '#ff00ff',   glowBlur: 0.04
        });
        break;

      case 'glass':
        Object.assign(style, {
          borderStyle: 'solid',  borderColor: 'rgba(255,255,255,0.35)',
          borderWidth: 0.003,    borderOpacity: 0.65,
          shadowEnabled: true,   shadowColor: 'rgba(0,0,0,0.35)',
          glowEnabled: false
        });
        break;

      case 'colorful':
        Object.assign(style, {
          borderStyle: 'solid',  borderColor: 'gradient',
          borderWidth: 0.005,    borderOpacity: 1.0,
          shadowEnabled: true,   glowEnabled: false
        });
        break;

      case 'shadow':
        Object.assign(style, {
          borderStyle: 'none',   borderWidth: 0,
          shadowEnabled: true,   shadowColor: 'rgba(0,0,0,0.9)',
          shadowBlur: 0.04,      glowEnabled: false
        });
        break;

      case 'gradient':
        Object.assign(style, {
          borderStyle: 'solid',  borderColor: 'gradient-cool',
          borderWidth: 0.005,    borderOpacity: 1.0,
          shadowEnabled: true,
          glowEnabled: true,     glowColor: '#3b82f6',   glowBlur: 0.025
        });
        break;

      case 'none':
      default:
        Object.assign(style, {
          borderStyle: 'solid',  borderColor: '#3b82f6',
          borderWidth: 0.003,    borderOpacity: 1.0,
          shadowEnabled: true,   shadowColor: 'rgba(0,0,0,0.65)',
          glowEnabled: false
        });
    }
    style.framePreset = preset;
    return style;
  }

  // ── Helpers privados ─────────────────────────────────────────────

  _resolveBorderColor(ctx, s, x, y, w, h) {
    if (s.borderColor === 'gradient') {
      const g = ctx.createLinearGradient(x, y, x + w, y + h);
      g.addColorStop(0,   '#ff0080');
      g.addColorStop(0.5, '#ffff00');
      g.addColorStop(1,   '#00f7ff');
      return g;
    }
    if (s.borderColor === 'gradient-cool') {
      const g = ctx.createLinearGradient(x, y, x + w, y + h);
      g.addColorStop(0, '#3b82f6');
      g.addColorStop(1, '#10b981');
      return g;
    }
    return s.borderColor;
  }

  _roundRectPath(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y,     x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h,     x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y,         x + r, y);
    ctx.closePath();
  }
}

// ===== CLASSE: CAMERA OVERLAY LAYER =====

/**
 * Camada de câmera como overlay independente na composição vertical.
 *
 * Diferente de WebcamLayer (que herda proporções circulares legadas),
 * CameraOverlayLayer nasce quadrada, com width e height separados e
 * totalmente configuráveis, sem forçar qualquer formato circular.
 *
 * Responsabilidades:
 *  - Controlar posição (x, y) em coordenadas normalizadas [0..1]
 *  - Controlar largura e altura independentes
 *  - Controlar escala, visibilidade e opacidade
 *  - Renderizar no preview e na exportação
 *  - Suportar proporção fixa ou livre
 */
class CameraOverlayLayer extends VideoLayer {
  constructor(id, videoElement) {
    super(id, videoElement);
    this.type = 'camera-overlay';

    // Geometria: coordenadas normalizadas [0..1] em relação ao canvas
    this.x      = 0.72;  // canto inferior direito por padrão
    this.y      = 0.72;
    this.width  = 0.22;  // 22% da largura do canvas
    this.height = 0.22;  // 22% da altura — quadrado por padrão

    this.maintainAspectRatio = false;

    // Composição: estilo + renderer (baixo acoplamento)
    this.frameStyle = new CameraFrameStyle();
    this._renderer  = new CameraShapeRenderer(this.frameStyle);
  }

  render(ctx, canvasWidth, canvasHeight) {
    if (!this.visible || this.alpha === 0) return;

    const x = this.x * canvasWidth;
    const y = this.y * canvasHeight;
    const w = this.width  * canvasWidth;
    const h = this.height * canvasHeight;

    // 1. Glow (desenhado atrás de tudo)
    this._renderer.renderGlow(ctx, x, y, w, h, canvasWidth);

    // 2. Clip + vídeo
    ctx.save();
    ctx.globalAlpha = this.alpha * this.frameStyle.alpha;

    this._renderer.applyShadow(ctx, canvasWidth);

    this._renderer.buildPath(ctx, x, y, w, h);
    ctx.clip();

    try {
      ctx.drawImage(this.videoElement, x, y, w, h);
    } catch (_) {
      ctx.fillStyle = this.frameStyle.borderColor;
      ctx.fill();
    }

    ctx.restore();

    // 3. Borda (fora do clip, não é cortada)
    this._renderer.renderBorder(ctx, x, y, w, h, canvasWidth);
  }

  toJSON() {
    return {
      ...super.toJSON(),
      frameStyle:          this.frameStyle.toJSON(),
      maintainAspectRatio: this.maintainAspectRatio
    };
  }
}

// ===== CLASSE: WEBCAM TOP LAYER (camada superior TikTok 9:16) =====

/**
 * Camada de webcam posicionada no topo do canvas (modo TikTok).
 * Ocupa largura total, altura configurável, fill=cover.
 */
class WebcamTopLayer extends Layer {
  constructor(id, videoElement) {
    super(id, 'webcam-top');
    this.videoElement      = videoElement;
    this.heightNormalized  = 0.30;
    this.widthNormalized   = 1.0;
    this.borderRadius      = '0px';
    this.borderColor       = '#ffffff';
    this.borderWidth       = 0;
    this.glowEnabled       = false;
    this.shadowEnabled     = false;
    this.glowColor         = '#3b82f6';
    this.zIndex            = 100;
  }

  render(ctx, canvasWidth, canvasHeight) {
    if (!this.visible || !this.videoElement) return;
    if (!this.videoElement.videoWidth) return;

    const h  = this.heightNormalized * canvasHeight;
    const w  = this.widthNormalized  * canvasWidth;
    const x  = (canvasWidth - w) / 2;
    const bw = this.borderWidth || 0;

    // Parse borderRadius para canvas (suporta px e %)
    let r = 0;
    if (this.borderRadius) {
      const raw = String(this.borderRadius);
      if (raw.endsWith('%')) {
        r = Math.min(w, h) * 0.5; // círculo = 50%
      } else {
        r = parseFloat(raw) || 0;
      }
    }
    r = Math.min(r, w / 2, h / 2);

    ctx.save();

    // Sombra
    if (this.shadowEnabled) {
      ctx.shadowColor   = 'rgba(0,0,0,0.65)';
      ctx.shadowBlur    = 20;
      ctx.shadowOffsetY = 6;
    }

    // Glow
    if (this.glowEnabled) {
      ctx.shadowColor = this.glowColor;
      ctx.shadowBlur  = 22;
    }

    // Clip com borderRadius
    ctx.beginPath();
    if (r > 0) {
      ctx.moveTo(x + r, 0);
      ctx.lineTo(x + w - r, 0);
      ctx.quadraticCurveTo(x + w, 0, x + w, r);
      ctx.lineTo(x + w, h - r);
      ctx.quadraticCurveTo(x + w, h, x + w - r, h);
      ctx.lineTo(x + r, h);
      ctx.quadraticCurveTo(x, h, x, h - r);
      ctx.lineTo(x, r);
      ctx.quadraticCurveTo(x, 0, x + r, 0);
    } else {
      ctx.rect(x, 0, w, h);
    }
    ctx.closePath();
    ctx.clip();

    // Cover-fill
    const vw    = this.videoElement.videoWidth;
    const vh    = this.videoElement.videoHeight;
    const scale = Math.max(w / vw, h / vh);
    const dw    = vw * scale;
    const dh    = vh * scale;
    const dx    = x + (w - dw) / 2;
    const dy    = (h - dh) / 2;
    ctx.globalAlpha = this.alpha;
    ctx.drawImage(this.videoElement, dx, dy, dw, dh);

    ctx.restore();

    // Borda visível por cima
    if (bw > 0) {
      ctx.save();
      ctx.strokeStyle = this.borderColor;
      ctx.lineWidth   = bw;
      if (this.glowEnabled) {
        ctx.shadowColor = this.glowColor;
        ctx.shadowBlur  = 16;
      }
      const inset = bw / 2;
      ctx.beginPath();
      if (r > 0) {
        const ri = Math.max(0, r - inset);
        ctx.moveTo(x + inset + ri, inset);
        ctx.lineTo(x + w - inset - ri, inset);
        ctx.quadraticCurveTo(x + w - inset, inset, x + w - inset, inset + ri);
        ctx.lineTo(x + w - inset, h - inset - ri);
        ctx.quadraticCurveTo(x + w - inset, h - inset, x + w - inset - ri, h - inset);
        ctx.lineTo(x + inset + ri, h - inset);
        ctx.quadraticCurveTo(x + inset, h - inset, x + inset, h - inset - ri);
        ctx.lineTo(x + inset, inset + ri);
        ctx.quadraticCurveTo(x + inset, inset, x + inset + ri, inset);
      } else {
        ctx.rect(x + inset, inset, w - bw, h - bw);
      }
      ctx.closePath();
      ctx.stroke();
      ctx.restore();
    }
  }

  toJSON() {
    return {
      ...super.toJSON(),
      heightNormalized: this.heightNormalized,
      widthNormalized:  this.widthNormalized,
      borderRadius:     this.borderRadius,
      borderColor:      this.borderColor,
      borderWidth:      this.borderWidth,
      glowEnabled:      this.glowEnabled,
      shadowEnabled:    this.shadowEnabled,
      glowColor:        this.glowColor,
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

    // ── Helper: seek seguro com timeout fallback ──────────────────
    // Evita travar se `seeked` não dispara (currentTime já é 0 ou
    // mediaElement não suporta seek — ex.: live stream).
    const _safeSeek = (el, time = 0, timeoutMs = 2000) =>
      new Promise(resolve => {
        const done = () => { clearTimeout(timer); resolve(); };
        const timer = setTimeout(done, timeoutMs);
        el.addEventListener('seeked', done, { once: true });
        el.currentTime = time;
      });

    // Preparar vídeo principal (sempre arquivo gravado — seek seguro)
    mainVideoElement.muted = false;
    await _safeSeek(mainVideoElement, 0);

    // Preparar todos os vídeos de webcam (inclui webcam-top do modo TikTok e camera-overlay)
    const webcamLayers = this.editorEngine.layers.filter(
      l => l.type === 'webcam' || l.type === 'webcam-top' || l.type === 'camera-overlay'
    );
    for (const webcamLayer of webcamLayers) {
      const isLiveStream = webcamLayer.videoElement.srcObject instanceof MediaStream;
      webcamLayer.videoElement.muted = true;
      if (!isLiveStream) {
        // Vídeo gravado: rebobinar normalmente
        await _safeSeek(webcamLayer.videoElement, 0);
      }
      // Live stream: não tem currentTime — pular rebobinagem
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

    // Iniciar gravação — coleta chunks a cada 100 ms para evitar perda de dados
    recorder.start(100);
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
    const blob = new Blob(chunks, { type: EXPORT_CONFIG.mimeType });

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
    const blobExt = String(blob?.type || '').toLowerCase().includes('mp4') ? 'mp4' : 'webm';

    if (!filename) {
      filename = `video-vertical-${new Date().toISOString().slice(0, 10)}.${blobExt}`;
    }
    // Garantir extensão correta de acordo com o blob final baixado
    filename = filename.replace(/\.(webm|mp4)$/i, `.${blobExt}`);

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
  CameraFrameStyle,
  CameraShapeRenderer,
  CameraOverlayLayer,
  WebcamTopLayer,
  OverlayLayer,
  BackgroundBarLayer,
  EditorEngine,
  RenderCanvasEngine,
  ExportManager,
  EXPORT_CONFIG,
  EXPORT_EXT
};

console.log('[Video Editor Engine] Sistema carregado com sucesso! ✅');
