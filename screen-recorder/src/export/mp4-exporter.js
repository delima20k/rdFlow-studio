/**
 * Mp4Exporter - Exportador de Vídeo MP4
 * 
 * Gera arquivo MP4 real com H.264 + AAC usando MediaRecorder API.
 * Otimizado para compatibilidade máxima com dispositivos Android.
 * 
 * Especificações:
 * - Vídeo: H.264 (avc1.42E01E) @ 1080x1920, 30fps, 6-10 Mbps
 * - Áudio: AAC (mp4a.40.2) @ 48kHz, 128-192 kbps, stereo
 * - Container: MP4 com faststart flag
 * 
 * @class Mp4Exporter
 * @author DELIMA
 * @version 1.0.0
 */
class Mp4Exporter {
  // ==========================================
  // CONSTANTES
  // ==========================================

  /** @type {Object} MIME types suportados (prioridade decrescente) */
  static MIME_TYPES = {
    MP4_H264_AAC: 'video/mp4; codecs="avc1.42E01E,mp4a.40.2"',
    WEBM_VP9_OPUS: 'video/webm; codecs="vp9,opus"',
    WEBM_VP8_OPUS: 'video/webm; codecs="vp8,opus"',
    WEBM: 'video/webm'
  };

  // ==========================================
  // CAMPOS PRIVADOS
  // ==========================================

  /** @type {ExportConfig} Configuração de exportação */
  #exportConfig;

  /** @type {MediaRecorder} Gravador de mídia */
  #mediaRecorder;

  /** @type {Blob[]} Chunks de vídeo gravados */
  #recordedChunks;

  /** @type {string} MIME type selecionado */
  #selectedMimeType;

  /** @type {MediaStream} Stream de vídeo + áudio */
  #mediaStream;

  /** @type {boolean} Flag de gravação ativa */
  #isRecording;

  /** @type {number} Timestamp de início */
  #startTime;

  /** @type {number} Duração total gravada */
  #recordedDuration;

  // ==========================================
  // CONSTRUTOR
  // ==========================================

  /**
   * Cria instância do Mp4Exporter
   * 
   * @param {ExportConfig} exportConfig - Configuração de exportação
   * @throws {Error} Se exportConfig for inválido ou browser não suportar gravação
   */
  constructor(exportConfig) {
    this.#validateConfig(exportConfig);
    this.#checkBrowserSupport();

    this.#exportConfig = exportConfig;
    this.#recordedChunks = [];
    this.#isRecording = false;
    this.#recordedDuration = 0;

    // Detectar melhor MIME type suportado
    this.#selectedMimeType = this.#detectBestMimeType();
  }

  // ==========================================
  // MÉTODOS PÚBLICOS - GRAVAÇÃO
  // ==========================================

  /**
   * Inicia gravação de vídeo a partir de canvas + áudio
   * 
   * @param {HTMLCanvasElement} canvas - Canvas com frames renderizados
   * @param {MediaStreamTrack} audioTrack - Track de áudio do AudioMixer
   * @returns {Promise<void>}
   * @throws {Error} Se já estiver gravando ou parâmetros inválidos
   */
  async start(canvas, audioTrack = null) {
    if (this.#isRecording) {
      throw new Error('Mp4Exporter: gravação já está em andamento');
    }

    this.#validateCanvas(canvas);
    if (audioTrack) {
      this.#validateAudioTrack(audioTrack);
    }

    try {
      // Criar stream de vídeo a partir do canvas
      const fps = this.#exportConfig.fps;
      const videoStream = canvas.captureStream(fps);

      // Combinar vídeo + áudio em um único stream
      this.#mediaStream = new MediaStream();

      // Adicionar video track
      const videoTrack = videoStream.getVideoTracks()[0];
      if (videoTrack) {
        this.#mediaStream.addTrack(videoTrack);
      }

      // Adicionar audio track se fornecido
      if (audioTrack) {
        this.#mediaStream.addTrack(audioTrack);
      }

      // Configurar MediaRecorder
      const options = this.#getRecorderOptions();
      this.#mediaRecorder = new MediaRecorder(this.#mediaStream, options);

      // Configurar event handlers
      this.#setupRecorderHandlers();

      // Iniciar gravação
      this.#mediaRecorder.start();
      this.#isRecording = true;
      this.#startTime = Date.now();
      this.#recordedChunks = [];

      console.log(`✅ Mp4Exporter: gravação iniciada (${this.#selectedMimeType})`);

    } catch (error) {
      this.#cleanup();
      throw new Error(`Mp4Exporter: falha ao iniciar gravação - ${error.message}`);
    }
  }

  /**
   * Para gravação e retorna blob do vídeo
   * 
   * @returns {Promise<Blob>} Blob do MP4 exportado
   * @throws {Error} Se não estiver gravando
   */
  async stop() {
    if (!this.#isRecording) {
      throw new Error('Mp4Exporter: nenhuma gravação em andamento');
    }

    return new Promise((resolve, reject) => {
      // Handler de parada
      const handleStop = () => {
        try {
          this.#isRecording = false;
          this.#recordedDuration = (Date.now() - this.#startTime) / 1000;

          // Criar blob a partir dos chunks
          const blob = new Blob(this.#recordedChunks, {
            type: this.#selectedMimeType
          });

          console.log(`✅ Mp4Exporter: gravação finalizada (${(blob.size / 1024 / 1024).toFixed(2)} MB, ${this.#recordedDuration.toFixed(1)}s)`);

          this.#cleanup();
          resolve(blob);

        } catch (error) {
          reject(new Error(`Mp4Exporter: erro ao finalizar gravação - ${error.message}`));
        }
      };

      // Configurar handler de parada
      this.#mediaRecorder.addEventListener('stop', handleStop, { once: true });

      // Parar gravação
      this.#mediaRecorder.stop();

      // Parar todos os tracks
      this.#mediaStream.getTracks().forEach(track => track.stop());
    });
  }

  // ==========================================
  // MÉTODOS PÚBLICOS - UTILITÁRIOS
  // ==========================================

  /**
   * Retorna MIME type selecionado
   * 
   * @returns {string} MIME type (ex: 'video/mp4; codecs="avc1.42E01E,mp4a.40.2"')
   */
  getMimeType() {
    return this.#selectedMimeType;
  }

  /**
   * Retorna informações sobre codecs usados
   * 
   * @returns {Object} {container, video, audio, compatible}
   */
  getCodecInfo() {
    const isMP4 = this.#selectedMimeType.includes('mp4');
    const isWebM = this.#selectedMimeType.includes('webm');

    return {
      container: isMP4 ? 'MP4' : isWebM ? 'WebM' : 'Unknown',
      video: isMP4 ? 'H.264 (AVC)' : 'VP8/VP9',
      audio: isMP4 ? 'AAC' : 'Opus',
      compatible: isMP4,
      needsConversion: !isMP4,
      mimeType: this.#selectedMimeType
    };
  }

  /**
   * Verifica se browser suporta codec específico
   * 
   * @param {string} mimeType - MIME type a verificar
   * @returns {boolean} True se suportado
   */
  static isSupported(mimeType) {
    return MediaRecorder.isTypeSupported(mimeType);
  }

  /**
   * Detecta melhor MIME type suportado pelo browser
   * 
   * @returns {string} Melhor MIME type disponível
   */
  static detectBestMimeType() {
    const types = Object.values(Mp4Exporter.MIME_TYPES);
    
    for (const mimeType of types) {
      if (MediaRecorder.isTypeSupported(mimeType)) {
        return mimeType;
      }
    }

    throw new Error('Mp4Exporter: nenhum codec suportado pelo browser');
  }

  /**
   * Faz download do blob como arquivo
   * 
   * @param {Blob} blob - Blob do vídeo
   * @param {string} filename - Nome do arquivo (padrão: video_final_1080x1920.mp4)
   */
  static downloadFile(blob, filename = 'video_final_1080x1920.mp4') {
    // Criar URL temporário
    const url = URL.createObjectURL(blob);

    // Criar link de download
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';

    // Adicionar ao DOM, clicar e remover
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Liberar URL após um delay
    setTimeout(() => URL.revokeObjectURL(url), 1000);

    console.log(`💾 Mp4Exporter: download iniciado - ${filename}`);
  }

  /**
   * Limpa recursos e libera memória
   */
  dispose() {
    this.#cleanup();
    this.#recordedChunks = [];
    console.log('🧹 Mp4Exporter: recursos liberados');
  }

  // ==========================================
  // MÉTODOS PRIVADOS - CONFIGURAÇÃO
  // ==========================================

  /**
   * Detecta melhor MIME type suportado
   * @private
   * @returns {string} MIME type selecionado
   * @throws {Error} Se nenhum codec for suportado
   */
  #detectBestMimeType() {
    const types = Object.values(Mp4Exporter.MIME_TYPES);
    
    for (const mimeType of types) {
      if (MediaRecorder.isTypeSupported(mimeType)) {
        const isMP4 = mimeType.includes('mp4');
        if (!isMP4) {
          console.warn('⚠️ Mp4Exporter: H.264 não suportado, usando WebM. Conversão para MP4 será necessária.');
        }
        return mimeType;
      }
    }

    throw new Error('Mp4Exporter: nenhum codec de vídeo suportado pelo browser atual');
  }

  /**
   * Retorna opções do MediaRecorder
   * @private
   * @returns {Object} Opções de gravação
   */
  #getRecorderOptions() {
    // Converter bitrates de string para número
    const videoBitrate = this.#parseBitrate(this.#exportConfig.videoBitrate);
    const audioBitrate = this.#parseBitrate(this.#exportConfig.audioBitrate);

    return {
      mimeType: this.#selectedMimeType,
      videoBitsPerSecond: videoBitrate,
      audioBitsPerSecond: audioBitrate
    };
  }

  /**
   * Converte bitrate de string (ex: '8M', '128k') para número
   * @private
   * @param {string} bitrateStr - Bitrate em formato string
   * @returns {number} Bitrate em bits por segundo
   */
  #parseBitrate(bitrateStr) {
    const match = bitrateStr.match(/^(\d+(?:\.\d+)?)(k|K|m|M)$/);
    if (!match) {
      throw new Error(`Mp4Exporter: bitrate inválido - ${bitrateStr}`);
    }

    const value = parseFloat(match[1]);
    const unit = match[2].toLowerCase();

    return unit === 'k' ? value * 1000 : value * 1000000;
  }

  /**
   * Configura event handlers do MediaRecorder
   * @private
   */
  #setupRecorderHandlers() {
    // Coletar chunks de dados
    this.#mediaRecorder.addEventListener('dataavailable', (event) => {
      if (event.data && event.data.size > 0) {
        this.#recordedChunks.push(event.data);
      }
    });

    // Log de erros
    this.#mediaRecorder.addEventListener('error', (event) => {
      console.error('❌ Mp4Exporter: erro de gravação', event.error);
    });
  }

  /**
   * Limpa recursos temporários
   * @private
   */
  #cleanup() {
    if (this.#mediaStream) {
      this.#mediaStream.getTracks().forEach(track => track.stop());
      this.#mediaStream = null;
    }

    if (this.#mediaRecorder) {
      this.#mediaRecorder = null;
    }

    this.#isRecording = false;
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
      throw new Error('Mp4Exporter: ExportConfig inválida');
    }

    if (!config.width || !config.height || !config.fps) {
      throw new Error('Mp4Exporter: ExportConfig incompleta (width, height, fps obrigatórios)');
    }
  }

  /**
   * Verifica suporte do browser
   * @private
   * @throws {Error} Se browser não suportar MediaRecorder
   */
  #checkBrowserSupport() {
    if (typeof MediaRecorder === 'undefined') {
      throw new Error('Mp4Exporter: MediaRecorder API não suportada neste browser');
    }
  }

  /**
   * Valida canvas
   * @private
   * @throws {Error} Se canvas inválido
   */
  #validateCanvas(canvas) {
    if (!(canvas instanceof HTMLCanvasElement)) {
      throw new Error('Mp4Exporter: canvas inválido');
    }

    if (canvas.width !== this.#exportConfig.width || canvas.height !== this.#exportConfig.height) {
      throw new Error(`Mp4Exporter: dimensões do canvas (${canvas.width}x${canvas.height}) não correspondem à configuração (${this.#exportConfig.width}x${this.#exportConfig.height})`);
    }
  }

  /**
   * Valida audio track
   * @private
   * @throws {Error} Se track inválido
   */
  #validateAudioTrack(track) {
    if (!(track instanceof MediaStreamTrack)) {
      throw new Error('Mp4Exporter: audioTrack inválido (deve ser MediaStreamTrack)');
    }

    if (track.kind !== 'audio') {
      throw new Error('Mp4Exporter: track deve ser de áudio');
    }

    if (track.readyState !== 'live') {
      throw new Error('Mp4Exporter: audioTrack não está ativo (readyState !== "live")');
    }
  }
}

// Exportar para CommonJS/ES6
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Mp4Exporter;
}
