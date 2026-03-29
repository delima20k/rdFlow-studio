/**
 * ExportValidator - Validador de Vídeo Exportado
 * 
 * Valida vídeo exportado ANTES de liberar download, garantindo:
 * - Resolução exata: 1080x1920
 * - Aspect ratio correto: 9:16
 * - Codecs compatíveis com mobile
 * - Duração correta
 * - Arquivo reproduzível
 * 
 * Se qualquer validação falhar, BLOQUEIA o download e exibe erro claro.
 * 
 * @class ExportValidator
 * @author DELIMA
 * @version 1.0.0
 */
class ExportValidator {
  // ==========================================
  // CONSTANTES
  // ==========================================

  /** @type {number} Aspect ratio esperado (9:16 = 0.5625) */
  static EXPECTED_ASPECT_RATIO = 9 / 16;

  /** @type {number} Tolerância para comparação de aspect ratio */
  static ASPECT_RATIO_TOLERANCE = 0.01;

  /** @type {number} Tolerância para comparação de duração (segundos) */
  static DURATION_TOLERANCE = 0.5;

  /** @type {number} Tamanho mínimo de arquivo (bytes) */
  static MIN_FILE_SIZE = 1024; // 1 KB

  /** @type {string[]} Codecs de vídeo compatíveis com mobile */
  static MOBILE_COMPATIBLE_VIDEO_CODECS = ['avc1', 'h264', 'vp8', 'vp9'];

  /** @type {string[]} Codecs de áudio compatíveis com mobile */
  static MOBILE_COMPATIBLE_AUDIO_CODECS = ['mp4a', 'aac', 'opus'];

  // ==========================================
  // CAMPOS PRIVADOS
  // ==========================================

  /** @type {ExportConfig} Configuração de referência */
  #exportConfig;

  /** @type {Object} Último resultado de validação */
  #lastValidationResult;

  // ==========================================
  // CONSTRUTOR
  // ==========================================

  /**
   * Cria instância do ExportValidator
   * 
   * @param {ExportConfig} exportConfig - Configuração de referência
   * @throws {Error} Se exportConfig for inválido
   */
  constructor(exportConfig) {
    this.#validateConfig(exportConfig);
    this.#exportConfig = exportConfig;
    this.#lastValidationResult = null;
  }

  // ==========================================
  // MÉTODOS PÚBLICOS - VALIDAÇÃO COMPLETA
  // ==========================================

  /**
   * Valida blob do vídeo exportado
   * 
   * @param {Blob} blob - Blob do MP4/WebM exportado
   * @param {number} expectedDuration - Duração esperada em segundos
   * @returns {Promise<ValidationResult>} Resultado completo da validação
   */
  async validate(blob, expectedDuration) {
    console.log('🔍 ExportValidator: iniciando validação...');

    const errors = [];
    const warnings = [];
    const metadata = {};

    try {
      // 1. Validar tamanho do arquivo
      const fileSizeResult = this.validateFileSize(blob);
      metadata.fileSize = fileSizeResult.size;
      metadata.bitrate = fileSizeResult.bitrate;

      if (!fileSizeResult.valid) {
        errors.push(`Arquivo muito pequeno (${fileSizeResult.size} bytes). Mínimo: ${ExportValidator.MIN_FILE_SIZE} bytes`);
      }

      // 2. Criar video element temporário para análise
      const videoElement = await this.#createVideoElement(blob);

      // 3. Validar resolução
      const resolutionResult = await this.validateResolution(videoElement);
      metadata.resolution = resolutionResult.actual;

      if (!resolutionResult.valid) {
        errors.push(`Resolução incorreta: ${resolutionResult.actual.width}x${resolutionResult.actual.height}. Esperado: ${this.#exportConfig.width}x${this.#exportConfig.height}`);
      }

      // 4. Validar aspect ratio
      const aspectRatioResult = await this.validateAspectRatio(videoElement);
      metadata.aspectRatio = aspectRatioResult.actual;

      if (!aspectRatioResult.valid) {
        errors.push(`Aspect ratio incorreto: ${aspectRatioResult.actual.toFixed(4)}. Esperado: ${aspectRatioResult.expected.toFixed(4)} (9:16)`);
      }

      // 5. Validar duração
      const durationResult = await this.validateDuration(videoElement, expectedDuration);
      metadata.duration = durationResult.actual;

      if (!durationResult.valid) {
        errors.push(`Duração incorreta: ${durationResult.actual.toFixed(2)}s. Esperado: ${durationResult.expected.toFixed(2)}s (±${ExportValidator.DURATION_TOLERANCE}s)`);
      }

      // 6. Validar codecs
      const codecsResult = await this.validateCodecs(blob);
      metadata.codecs = codecsResult;

      if (!codecsResult.supported) {
        warnings.push(`Codecs podem ter compatibilidade limitada em mobile: ${codecsResult.video}/${codecsResult.audio}`);
      }

      // 7. Testar reprodução
      const playabilityResult = await this.canPlayOnMobile(blob);
      metadata.canPlay = playabilityResult.canPlay;

      if (!playabilityResult.canPlay) {
        errors.push(`Vídeo não reproduzível: ${playabilityResult.error}`);
      }

      // 8. Limpar video element temporário
      this.#cleanupVideoElement(videoElement);

      // Compilar resultado final
      const result = {
        valid: errors.length === 0,
        errors,
        warnings,
        metadata
      };

      this.#lastValidationResult = result;

      // Log do resultado
      if (result.valid) {
        console.log('✅ ExportValidator: validação bem-sucedida', metadata);
      } else {
        console.error('❌ ExportValidator: validação falhou', errors);
      }

      return result;

    } catch (error) {
      const errorResult = {
        valid: false,
        errors: [`Erro durante validação: ${error.message}`],
        warnings,
        metadata
      };

      this.#lastValidationResult = errorResult;
      return errorResult;
    }
  }

  // ==========================================
  // MÉTODOS PÚBLICOS - VALIDAÇÕES INDIVIDUAIS
  // ==========================================

  /**
   * Valida resolução do vídeo
   * 
   * @param {HTMLVideoElement} videoElement - Elemento de vídeo carregado
   * @returns {Promise<Object>} {valid, actual: {width, height}}
   */
  async validateResolution(videoElement) {
    await this.#ensureVideoLoaded(videoElement);

    const actual = {
      width: videoElement.videoWidth,
      height: videoElement.videoHeight
    };

    const valid = (
      actual.width === this.#exportConfig.width &&
      actual.height === this.#exportConfig.height
    );

    return { valid, actual };
  }

  /**
   * Valida aspect ratio do vídeo
   * 
   * @param {HTMLVideoElement} videoElement - Elemento de vídeo carregado
   * @returns {Promise<Object>} {valid, actual, expected}
   */
  async validateAspectRatio(videoElement) {
    await this.#ensureVideoLoaded(videoElement);

    const actual = videoElement.videoWidth / videoElement.videoHeight;
    const expected = ExportValidator.EXPECTED_ASPECT_RATIO;
    const difference = Math.abs(actual - expected);
    const valid = difference <= ExportValidator.ASPECT_RATIO_TOLERANCE;

    return { valid, actual, expected };
  }

  /**
   * Valida duração do vídeo
   * 
   * @param {HTMLVideoElement} videoElement - Elemento de vídeo carregado
   * @param {number} expectedDuration - Duração esperada em segundos
   * @returns {Promise<Object>} {valid, actual, expected}
   */
  async validateDuration(videoElement, expectedDuration) {
    await this.#ensureVideoLoaded(videoElement);

    const actual = videoElement.duration;
    const expected = expectedDuration;
    const difference = Math.abs(actual - expected);
    const valid = difference <= ExportValidator.DURATION_TOLERANCE;

    return { valid, actual, expected };
  }

  /**
   * Valida codecs usados no vídeo
   * 
   * @param {Blob} blob - Blob do vídeo
   * @returns {Promise<Object>} {video, audio, supported, mimeType}
   */
  async validateCodecs(blob) {
    const mimeType = blob.type || 'unknown';
    
    // Extrair codecs do MIME type
    const codecMatch = mimeType.match(/codecs="([^"]+)"/);
    const codecs = codecMatch ? codecMatch[1].split(',').map(c => c.trim()) : [];

    // Identificar codec de vídeo
    let videoCodec = 'unknown';
    for (const codec of codecs) {
      if (codec.includes('avc1') || codec.includes('h264')) {
        videoCodec = 'H.264 (AVC)';
        break;
      } else if (codec.includes('vp8')) {
        videoCodec = 'VP8';
        break;
      } else if (codec.includes('vp9')) {
        videoCodec = 'VP9';
        break;
      }
    }

    // Identificar codec de áudio
    let audioCodec = 'unknown';
    for (const codec of codecs) {
      if (codec.includes('mp4a') || codec.includes('aac')) {
        audioCodec = 'AAC';
        break;
      } else if (codec.includes('opus')) {
        audioCodec = 'Opus';
        break;
      }
    }

    // Verificar compatibilidade mobile
    const videoSupported = ExportValidator.MOBILE_COMPATIBLE_VIDEO_CODECS.some(c => 
      mimeType.toLowerCase().includes(c.toLowerCase())
    );

    const audioSupported = ExportValidator.MOBILE_COMPATIBLE_AUDIO_CODECS.some(c => 
      mimeType.toLowerCase().includes(c.toLowerCase())
    );

    const supported = videoSupported && audioSupported;

    return {
      video: videoCodec,
      audio: audioCodec,
      supported,
      mimeType
    };
  }

  /**
   * Valida tamanho do arquivo
   * 
   * @param {Blob} blob - Blob do vídeo
   * @returns {Object} {valid, size, bitrate}
   */
  validateFileSize(blob) {
    const size = blob.size;
    const valid = size >= ExportValidator.MIN_FILE_SIZE;

    // Calcular bitrate médio (estimativa)
    // Nota: bitrate real só pode ser calculado após conhecer a duração
    const bitrate = 0; // Será calculado após validação de duração

    return { valid, size, bitrate };
  }

  /**
   * Testa se vídeo pode ser reproduzido
   * 
   * @param {Blob} blob - Blob do vídeo
   * @returns {Promise<Object>} {canPlay, error}
   */
  async canPlayOnMobile(blob) {
    try {
      const videoElement = await this.#createVideoElement(blob);
      await this.#ensureVideoLoaded(videoElement);

      // Testar se consegue avançar no vídeo
      videoElement.currentTime = Math.min(1, videoElement.duration / 2);
      await new Promise(resolve => setTimeout(resolve, 100));

      const canPlay = !videoElement.error && videoElement.readyState >= 2;
      const error = videoElement.error ? videoElement.error.message : null;

      this.#cleanupVideoElement(videoElement);

      return { canPlay, error };

    } catch (error) {
      return { canPlay: false, error: error.message };
    }
  }

  // ==========================================
  // MÉTODOS PÚBLICOS - RELATÓRIOS
  // ==========================================

  /**
   * Retorna relatório de validação formatado
   * 
   * @returns {string} Relatório em texto formatado
   */
  getValidationReport() {
    if (!this.#lastValidationResult) {
      return 'Nenhuma validação executada ainda.';
    }

    const { valid, errors, warnings, metadata } = this.#lastValidationResult;

    let report = '='.repeat(50) + '\n';
    report += '📊 RELATÓRIO DE VALIDAÇÃO DE EXPORTAÇÃO\n';
    report += '='.repeat(50) + '\n\n';

    // Status geral
    report += `Status: ${valid ? '✅ VÁLIDO' : '❌ INVÁLIDO'}\n\n`;

    // Metadata
    if (metadata.resolution) {
      report += `📐 Resolução: ${metadata.resolution.width}x${metadata.resolution.height}\n`;
    }
    if (metadata.aspectRatio) {
      report += `📏 Aspect Ratio: ${metadata.aspectRatio.toFixed(4)} (esperado: 0.5625)\n`;
    }
    if (metadata.duration) {
      report += `⏱️  Duração: ${metadata.duration.toFixed(2)}s\n`;
    }
    if (metadata.fileSize) {
      report += `💾 Tamanho: ${(metadata.fileSize / 1024 / 1024).toFixed(2)} MB\n`;
    }
    if (metadata.codecs) {
      report += `🎬 Codec Vídeo: ${metadata.codecs.video}\n`;
      report += `🔊 Codec Áudio: ${metadata.codecs.audio}\n`;
    }

    // Erros
    if (errors.length > 0) {
      report += '\n❌ ERROS:\n';
      errors.forEach((error, index) => {
        report += `  ${index + 1}. ${error}\n`;
      });
    }

    // Warnings
    if (warnings.length > 0) {
      report += '\n⚠️  AVISOS:\n';
      warnings.forEach((warning, index) => {
        report += `  ${index + 1}. ${warning}\n`;
      });
    }

    report += '\n' + '='.repeat(50) + '\n';

    return report;
  }

  /**
   * Retorna último resultado de validação
   * 
   * @returns {ValidationResult|null} Resultado ou null se ainda não validou
   */
  getLastResult() {
    return this.#lastValidationResult;
  }

  // ==========================================
  // MÉTODOS PRIVADOS - HELPERS
  // ==========================================

  /**
   * Cria video element a partir de blob
   * @private
   * @param {Blob} blob - Blob do vídeo
   * @returns {Promise<HTMLVideoElement>} Video element carregado
   */
  async #createVideoElement(blob) {
    const videoElement = document.createElement('video');
    videoElement.preload = 'metadata';
    videoElement.muted = true;
    videoElement.style.display = 'none';

    const url = URL.createObjectURL(blob);
    videoElement.src = url;

    // Adicionar ao DOM temporariamente (necessário em alguns browsers)
    document.body.appendChild(videoElement);

    // Aguardar carregamento dos metadados
    await new Promise((resolve, reject) => {
      videoElement.addEventListener('loadedmetadata', resolve, { once: true });
      videoElement.addEventListener('error', () => reject(videoElement.error), { once: true });
    });

    return videoElement;
  }

  /**
   * Garante que vídeo está completamente carregado
   * @private
   * @param {HTMLVideoElement} videoElement - Elemento de vídeo
   * @returns {Promise<void>}
   */
  async #ensureVideoLoaded(videoElement) {
    if (videoElement.readyState >= 1) {
      return; // Já carregou metadados
    }

    return new Promise((resolve, reject) => {
      videoElement.addEventListener('loadedmetadata', resolve, { once: true });
      videoElement.addEventListener('error', () => reject(videoElement.error), { once: true });
    });
  }

  /**
   * Limpa video element temporário
   * @private
   * @param {HTMLVideoElement} videoElement - Elemento a limpar
   */
  #cleanupVideoElement(videoElement) {
    if (videoElement) {
      if (videoElement.src) {
        URL.revokeObjectURL(videoElement.src);
      }
      if (videoElement.parentNode) {
        videoElement.parentNode.removeChild(videoElement);
      }
    }
  }

  // ==========================================
  // MÉTODOS DE VALIDAÇÃO
  // ==========================================

  /**
   * Valida ExportConfig
   * @private
   * @throws {Error} Se config inválida
   */
  #validateConfig(config) {
    if (!config || typeof config !== 'object') {
      throw new Error('ExportValidator: ExportConfig inválida');
    }

    if (!config.width || !config.height) {
      throw new Error('ExportValidator: ExportConfig incompleta (width, height obrigatórios)');
    }
  }
}

/**
 * @typedef {Object} ValidationResult
 * @property {boolean} valid - Se validação passou
 * @property {string[]} errors - Lista de erros encontrados
 * @property {string[]} warnings - Lista de avisos
 * @property {Object} metadata - Metada dos do vídeo
 * @property {Object} metadata.resolution - {width, height}
 * @property {number} metadata.aspectRatio - Proporção de tela
 * @property {number} metadata.duration - Duração em segundos
 * @property {number} metadata.fileSize - Tamanho em bytes
 * @property {Object} metadata.codecs - {video, audio, supported}
 */

// Exportar para CommonJS/ES6
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ExportValidator;
}
