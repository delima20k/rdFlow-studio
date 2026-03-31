/**
 * ExportConfig - Modelo de Configuração de Exportação de Vídeo
 * 
 * Responsável por armazenar e validar todos os parâmetros necessários
 * para exportação de vídeo em formato 9:16 (1080x1920) compatível com mobile.
 * 
 * Princípios OOP aplicados:
 * - Encapsulamento: campos privados (#) protegem dados internos
 * - Validação: construtor valida todos os parâmetros
 * - Imutabilidade: apenas getters, sem setters públicos
 * - Single Responsibility: apenas gerencia configuração de exportação
 * 
 * @class ExportConfig
 * @author DELIMA
 * @version 1.0.0
 */
class ExportConfig {
  // ==========================================
  // CONSTANTES DE VALIDAÇÃO
  // ==========================================

  /** @type {Object} Codecs de vídeo suportados */
  static VIDEO_CODECS = {
    H264: 'H.264',
    H265: 'H.265',
    VP8: 'VP8',
    VP9: 'VP9'
  };

  /** @type {Object} Codecs de áudio suportados */
  static AUDIO_CODECS = {
    AAC: 'AAC',
    MP3: 'MP3',
    OPUS: 'OPUS',
    VORBIS: 'VORBIS'
  };

  /** @type {Object} Modos de ajuste de vídeo */
  static FIT_MODES = {
    COVER: 'cover',      // Preenche toda área (sem faixas pretas)
    CONTAIN: 'contain',  // Mantém aspecto original (pode ter faixas)
    STRETCH: 'stretch',  // Estica para preencher (distorce)
    EXACT: 'exact'       // Dimensões exatas (pode cortar)
  };

  /** @type {Object} Resoluções pré-definidas */
  static RESOLUTIONS = {
    MOBILE_VERTICAL: { width: 1080, height: 1920 },  // 9:16
    MOBILE_HORIZONTAL: { width: 1920, height: 1080 }, // 16:9
    HD: { width: 1280, height: 720 },                 // 16:9
    FULL_HD: { width: 1920, height: 1080 },           // 16:9
    UHD_4K: { width: 3840, height: 2160 }             // 16:9
  };

  // ==========================================
  // CAMPOS PRIVADOS
  // ==========================================

  /** @type {number} Largura do vídeo final (em pixels) */
  #width;

  /** @type {number} Altura do vídeo final (em pixels) */
  #height;

  /** @type {number} Frames por segundo */
  #fps;

  /** @type {string} Codec de vídeo (H.264, H.265, VP8, VP9) */
  #videoCodec;

  /** @type {string} Codec de áudio (AAC, MP3, OPUS, VORBIS) */
  #audioCodec;

  /** @type {string} Bitrate de vídeo (ex: '8M', '6M', '10M') */
  #videoBitrate;

  /** @type {string} Bitrate de áudio (ex: '128k', '192k') */
  #audioBitrate;

  /** @type {string} Modo de ajuste do vídeo (cover, contain, stretch, exact) */
  #fitMode;

  /** @type {string} Cor de fundo em formato hexadecimal */
  #backgroundColor;

  // ==========================================
  // CONSTRUTOR
  // ==========================================

  /**
   * Cria nova instância de ExportConfig
   * 
   * @param {Object} params - Parâmetros de configuração
   * @param {number} [params.width=1080] - Largura do vídeo
   * @param {number} [params.height=1920] - Altura do vídeo
   * @param {number} [params.fps=30] - Frames por segundo
   * @param {string} [params.videoCodec='H.264'] - Codec de vídeo
   * @param {string} [params.audioCodec='AAC'] - Codec de áudio
   * @param {string} [params.videoBitrate='8M'] - Bitrate de vídeo
   * @param {string} [params.audioBitrate='128k'] - Bitrate de áudio
   * @param {string} [params.fitMode='cover'] - Modo de ajuste
   * @param {string} [params.backgroundColor='#000000'] - Cor de fundo
   * @throws {Error} Se algum parâmetro for inválido
   */
  constructor(params = {}) {
    // Aplicar valores padrão
    const config = {
      width: 1080,
      height: 1920,
      fps: 30,
      videoCodec: ExportConfig.VIDEO_CODECS.H264,
      audioCodec: ExportConfig.AUDIO_CODECS.AAC,
      videoBitrate: '8M',
      audioBitrate: '128k',
      fitMode: ExportConfig.FIT_MODES.COVER,
      backgroundColor: '#000000',
      ...params
    };

    // Validar e atribuir
    this.#validateAndSet(config);
  }

  // ==========================================
  // MÉTODOS PRIVADOS DE VALIDAÇÃO
  // ==========================================

  /**
   * Valida e atribui todos os parâmetros
   * @private
   * @param {Object} config - Configuração a validar
   * @throws {Error} Se algum valor for inválido
   */
  #validateAndSet(config) {
    this.#validateWidth(config.width);
    this.#validateHeight(config.height);
    this.#validateFps(config.fps);
    this.#validateVideoCodec(config.videoCodec);
    this.#validateAudioCodec(config.audioCodec);
    this.#validateVideoBitrate(config.videoBitrate);
    this.#validateAudioBitrate(config.audioBitrate);
    this.#validateFitMode(config.fitMode);
    this.#validateBackgroundColor(config.backgroundColor);

    // Atribuir após validação bem-sucedida
    this.#width = config.width;
    this.#height = config.height;
    this.#fps = config.fps;
    this.#videoCodec = config.videoCodec;
    this.#audioCodec = config.audioCodec;
    this.#videoBitrate = config.videoBitrate;
    this.#audioBitrate = config.audioBitrate;
    this.#fitMode = config.fitMode;
    this.#backgroundColor = config.backgroundColor;
  }

  /**
   * Valida largura do vídeo
   * @private
   * @param {number} width - Largura a validar
   * @throws {Error} Se largura for inválida
   */
  #validateWidth(width) {
    if (!Number.isInteger(width) || width <= 0) {
      throw new Error(`Largura inválida: ${width}. Deve ser um número inteiro positivo.`);
    }
    if (width < 320 || width > 7680) {
      throw new Error(`Largura fora do intervalo permitido: ${width}. Aceito: 320-7680px.`);
    }
  }

  /**
   * Valida altura do vídeo
   * @private
   * @param {number} height - Altura a validar
   * @throws {Error} Se altura for inválida
   */
  #validateHeight(height) {
    if (!Number.isInteger(height) || height <= 0) {
      throw new Error(`Altura inválida: ${height}. Deve ser um número inteiro positivo.`);
    }
    if (height < 240 || height > 4320) {
      throw new Error(`Altura fora do intervalo permitido: ${height}. Aceito: 240-4320px.`);
    }
  }

  /**
   * Valida frames por segundo
   * @private
   * @param {number} fps - FPS a validar
   * @throws {Error} Se FPS for inválido
   */
  #validateFps(fps) {
    if (!Number.isInteger(fps) || fps <= 0) {
      throw new Error(`FPS inválido: ${fps}. Deve ser um número inteiro positivo.`);
    }
    const validFps = [24, 25, 30, 50, 60, 120];
    if (!validFps.includes(fps)) {
      throw new Error(`FPS não suportado: ${fps}. Valores aceitos: ${validFps.join(', ')}.`);
    }
  }

  /**
   * Valida codec de vídeo
   * @private
   * @param {string} codec - Codec a validar
   * @throws {Error} Se codec for inválido
   */
  #validateVideoCodec(codec) {
    const validCodecs = Object.values(ExportConfig.VIDEO_CODECS);
    if (!validCodecs.includes(codec)) {
      throw new Error(`Codec de vídeo inválido: ${codec}. Aceitos: ${validCodecs.join(', ')}.`);
    }
  }

  /**
   * Valida codec de áudio
   * @private
   * @param {string} codec - Codec a validar
   * @throws {Error} Se codec for inválido
   */
  #validateAudioCodec(codec) {
    const validCodecs = Object.values(ExportConfig.AUDIO_CODECS);
    if (!validCodecs.includes(codec)) {
      throw new Error(`Codec de áudio inválido: ${codec}. Aceitos: ${validCodecs.join(', ')}.`);
    }
  }

  /**
   * Valida bitrate de vídeo
   * @private
   * @param {string} bitrate - Bitrate a validar (ex: '8M', '6000k')
   * @throws {Error} Se bitrate for inválido
   */
  #validateVideoBitrate(bitrate) {
    const pattern = /^(\d+(?:\.\d+)?)(k|K|m|M)$/;
    if (!pattern.test(bitrate)) {
      throw new Error(`Bitrate de vídeo inválido: ${bitrate}. Formato: número seguido de 'k', 'K', 'm' ou 'M'. Ex: '8M', '6000k'.`);
    }
  }

  /**
   * Valida bitrate de áudio
   * @private
   * @param {string} bitrate - Bitrate a validar (ex: '128k', '192k')
   * @throws {Error} Se bitrate for inválido
   */
  #validateAudioBitrate(bitrate) {
    const pattern = /^(\d+(?:\.\d+)?)(k|K)$/;
    if (!pattern.test(bitrate)) {
      throw new Error(`Bitrate de áudio inválido: ${bitrate}. Formato: número seguido de 'k' ou 'K'. Ex: '128k', '192k'.`);
    }
  }

  /**
   * Valida modo de ajuste
   * @private
   * @param {string} fitMode - Modo a validar
   * @throws {Error} Se modo for inválido
   */
  #validateFitMode(fitMode) {
    const validModes = Object.values(ExportConfig.FIT_MODES);
    if (!validModes.includes(fitMode)) {
      throw new Error(`Modo de ajuste inválido: ${fitMode}. Aceitos: ${validModes.join(', ')}.`);
    }
  }

  /**
   * Valida cor de fundo
   * @private
   * @param {string} color - Cor a validar (formato hexadecimal)
   * @throws {Error} Se cor for inválida
   */
  #validateBackgroundColor(color) {
    const pattern = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;
    if (!pattern.test(color)) {
      throw new Error(`Cor de fundo inválida: ${color}. Formato esperado: #RGB ou #RRGGBB.`);
    }
  }

  // ==========================================
  // GETTERS (ACESSO CONTROLADO)
  // ==========================================

  /** @returns {number} Largura do vídeo */
  get width() {
    return this.#width;
  }

  /** @returns {number} Altura do vídeo */
  get height() {
    return this.#height;
  }

  /** @returns {number} Frames por segundo */
  get fps() {
    return this.#fps;
  }

  /** @returns {string} Codec de vídeo */
  get videoCodec() {
    return this.#videoCodec;
  }

  /** @returns {string} Codec de áudio */
  get audioCodec() {
    return this.#audioCodec;
  }

  /** @returns {string} Bitrate de vídeo */
  get videoBitrate() {
    return this.#videoBitrate;
  }

  /** @returns {string} Bitrate de áudio */
  get audioBitrate() {
    return this.#audioBitrate;
  }

  /** @returns {string} Modo de ajuste */
  get fitMode() {
    return this.#fitMode;
  }

  /** @returns {string} Cor de fundo */
  get backgroundColor() {
    return this.#backgroundColor;
  }

  /** 
   * Calcula aspect ratio (proporção de tela)
   * @returns {number} Aspect ratio (largura/altura)
   */
  get aspectRatio() {
    return this.#width / this.#height;
  }

  /**
   * Retorna se é formato vertical (9:16)
   * @returns {boolean} True se for vertical
   */
  get isVertical() {
    return this.#height > this.#width;
  }

  /**
   * Retorna se é formato horizontal (16:9)
   * @returns {boolean} True se for horizontal
   */
  get isHorizontal() {
    return this.#width > this.#height;
  }

  // ==========================================
  // MÉTODOS PÚBLICOS
  // ==========================================

  /**
   * Retorna configuração como objeto plain
   * @returns {Object} Objeto com todas as propriedades
   */
  toObject() {
    return {
      width: this.#width,
      height: this.#height,
      fps: this.#fps,
      videoCodec: this.#videoCodec,
      audioCodec: this.#audioCodec,
      videoBitrate: this.#videoBitrate,
      audioBitrate: this.#audioBitrate,
      fitMode: this.#fitMode,
      backgroundColor: this.#backgroundColor,
      aspectRatio: this.aspectRatio,
      isVertical: this.isVertical,
      isHorizontal: this.isHorizontal
    };
  }

  /**
   * Cria uma cópia profunda da configuração
   * @returns {ExportConfig} Nova instância com mesmos valores
   */
  clone() {
    return new ExportConfig({
      width: this.#width,
      height: this.#height,
      fps: this.#fps,
      videoCodec: this.#videoCodec,
      audioCodec: this.#audioCodec,
      videoBitrate: this.#videoBitrate,
      audioBitrate: this.#audioBitrate,
      fitMode: this.#fitMode,
      backgroundColor: this.#backgroundColor
    });
  }

  /**
   * Mescla configuração atual com nova configuração
   * @param {Object} newConfig - Novos valores a mesclar
   * @returns {ExportConfig} Nova instância com valores mesclados
   */
  merge(newConfig) {
    return new ExportConfig({
      ...this.toObject(),
      ...newConfig
    });
  }

  /**
   * Valida configuração completa
   * @returns {Object} Resultado da validação
   * @property {boolean} valid - Se configuração é válida
   * @property {string[]} errors - Lista de erros encontrados
   * @property {string[]} warnings - Lista de avisos
   */
  validate() {
    const errors = [];
    const warnings = [];

    try {
      // Validação básica já feita no construtor
      // Aqui fazemos validações contextuais

      // Avisar sobre combinações não otimizadas
      if (this.#videoCodec === 'H.265' && this.#width < 1920) {
        warnings.push('H.265 é mais eficiente em resoluções 1080p ou superiores.');
      }

      if (this.#fps > 30 && this.#videoBitrate === '8M') {
        warnings.push('FPS acima de 30 pode precisar de bitrate maior que 8M para qualidade ideal.');
      }

      if (this.#fitMode === ExportConfig.FIT_MODES.STRETCH) {
        warnings.push('FitMode "stretch" pode distorcer o vídeo.');
      }

      // Validar compatibilidade mobile
      if (this.#videoCodec === 'VP9' || this.#videoCodec === 'H.265') {
        warnings.push(`Codec ${this.#videoCodec} pode ter compatibilidade limitada em dispositivos Android antigos.`);
      }

    } catch (error) {
      errors.push(error.message);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Retorna representação em string da configuração
   * @returns {string} Descrição da configuração
   */
  toString() {
    return `ExportConfig[${this.#width}x${this.#height}@${this.#fps}fps, ${this.#videoCodec}/${this.#audioCodec}, ${this.#fitMode}]`;
  }

  /**
   * Retorna representação JSON da configuração
   * @returns {string} JSON string
   */
  toJSON() {
    return JSON.stringify(this.toObject(), null, 2);
  }

  // ==========================================
  // MÉTODOS ESTÁTICOS
  // ==========================================

  /**
   * Cria configuração padrão para mobile vertical (9:16)
   * @returns {ExportConfig} Configuração otimizada para mobile vertical
   */
  static createDefault() {
    return new ExportConfig();
  }

  /**
   * Cria configuração para mobile horizontal (16:9)
   * @returns {ExportConfig} Configuração otimizada para mobile horizontal
   */
  static createHorizontal() {
    return new ExportConfig({
      width: 1920,
      height: 1080,
      fps: 30,
      videoCodec: ExportConfig.VIDEO_CODECS.H264,
      audioCodec: ExportConfig.AUDIO_CODECS.AAC,
      videoBitrate: '8M',
      audioBitrate: '128k',
      fitMode: ExportConfig.FIT_MODES.COVER,
      backgroundColor: '#000000'
    });
  }

  /**
   * Cria configuração de alta qualidade
   * @returns {ExportConfig} Configuração com bitrates aumentados
   */
  static createHighQuality() {
    return new ExportConfig({
      width: 1080,
      height: 1920,
      fps: 60,
      videoCodec: ExportConfig.VIDEO_CODECS.H264,
      audioCodec: ExportConfig.AUDIO_CODECS.AAC,
      videoBitrate: '10M',
      audioBitrate: '192k',
      fitMode: ExportConfig.FIT_MODES.COVER,
      backgroundColor: '#000000'
    });
  }

  /**
   * Cria configuração otimizada para WhatsApp
   * @returns {ExportConfig} Configuração compatível com WhatsApp
   */
  static createWhatsAppOptimized() {
    return new ExportConfig({
      width: 1080,
      height: 1920,
      fps: 30,
      videoCodec: ExportConfig.VIDEO_CODECS.H264,
      audioCodec: ExportConfig.AUDIO_CODECS.AAC,
      videoBitrate: '6M',  // WhatsApp comprime acima de 6M
      audioBitrate: '128k',
      fitMode: ExportConfig.FIT_MODES.COVER,
      backgroundColor: '#000000'
    });
  }

  /**
   * Cria configuração a partir de objeto
   * @param {Object} obj - Objeto com propriedades
   * @returns {ExportConfig} Nova instância
   */
  static fromObject(obj) {
    return new ExportConfig(obj);
  }
}

// Exportar para uso em módulos ES6
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ExportConfig;
}
