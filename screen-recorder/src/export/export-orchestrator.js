/**
 * ExportOrchestrator - Orquestrador de Exportação de Vídeo
 * 
 * Coordena todo o pipeline de exportação:
 * 1. Captura estado do editor
 * 2. Inicializa componentes (config, engines, renderer, mixer, exporter, validator)
 * 3. Renderiza frames (1080x1920)
 * 4. Mixa áudio
 * 5. Gera MP4
 * 6. Valida arquivo
 * 7. Libera download
 * 
 * Reporta progresso em tempo real e gerencia erros de forma robusta.
 * 
 * @class ExportOrchestrator
 * @author DELIMA
 * @version 1.0.0
 */
class ExportOrchestrator {
  // ==========================================
  // CONSTANTES
  // ==========================================

  /** @type {Object} Etapas do processo de exportação */
  static STAGES = {
    INITIALIZE: 'initialize',
    CAPTURE_STATE: 'capture_state',
    SETUP_COMPONENTS: 'setup_components',
    RENDER_FRAMES: 'render_frames',
    MIX_AUDIO: 'mix_audio',
    EXPORT_VIDEO: 'export_video',
    VALIDATE: 'validate',
    DOWNLOAD: 'download',
    COMPLETE: 'complete'
  };

  /** @type {Object} Pesos de progresso por etapa (soma = 100%) */
  static STAGE_WEIGHTS = {
    [ExportOrchestrator.STAGES.INITIALIZE]: 5,
    [ExportOrchestrator.STAGES.CAPTURE_STATE]: 5,
    [ExportOrchestrator.STAGES.SETUP_COMPONENTS]: 5,
    [ExportOrchestrator.STAGES.RENDER_FRAMES]: 60,
    [ExportOrchestrator.STAGES.MIX_AUDIO]: 10,
    [ExportOrchestrator.STAGES.EXPORT_VIDEO]: 5,
    [ExportOrchestrator.STAGES.VALIDATE]: 5,
    [ExportOrchestrator.STAGES.DOWNLOAD]: 5
  };

  // ==========================================
  // CAMPOS PRIVADOS
  // ==========================================

  /** @type {Object} Componentes do sistema */
  #components;

  /** @type {Object} Event handlers */
  #eventHandlers;

  /** @type {number} Timestamp de início */
  #startTime;

  /** @type {boolean} Flag de exportação em andamento */
  #isExporting;

  /** @type {Object} Estado atual do processo */
  #currentState;

  // ==========================================
  // CONSTRUTOR
  // ==========================================

  /**
   * Cria instância do ExportOrchestrator
   */
  constructor() {
    this.#components = {};
    this.#eventHandlers = {
      progress: [],
      complete: [],
      error: []
    };
    this.#isExporting = false;
    this.#currentState = {
      stage: null,
      percentage: 0,
      message: ''
    };
  }

  // ==========================================
  // MÉTODOS PÚBLICOS - EXPORTAÇÃO
  // ==========================================

  /**
   * Executa exportação completa
   * 
   * @param {Object} editorState - Estado capturado do editor
   * @param {Function} progressCallback - Callback de progresso (percentage, message)
   * @returns {Promise<ExportResult>} Resultado da exportação
   */
  async export(editorState, progressCallback = null) {
    if (this.#isExporting) {
      throw new Error('ExportOrchestrator: exportação já em andamento');
    }

    this.#isExporting = true;
    this.#startTime = Date.now();

    try {
      // Registrar callback de progresso temporário
      if (progressCallback) {
        this.on('progress', progressCallback);
      }

      // Executar pipeline completo
      this.#reportProgress(0, 'Iniciando exportação...');

      // 1. Validar editor state
      this.#validateEditorState(editorState);
      this.#reportProgress(5, 'Estado do editor validado');

      // 2. Inicializar componentes
      await this.#initializeComponents(editorState);
      this.#reportProgress(15, 'Componentes inicializados');

      // 3. Extrair duração e FPS
      const duration = editorState.mainVideo.element.duration;
      const fps = this.#components.config.fps;

      // 4. Iniciar gravação
      const canvas = this.#components.renderer.getCanvas();
      const audioTrack = await this.#mixAudio(editorState);
      
      await this.#components.exporter.start(canvas, audioTrack);
      this.#reportProgress(25, 'Gravação iniciada');

      // 5. Renderizar todos os frames
      await this.#renderAllFrames(duration, fps);
      this.#reportProgress(85, 'Renderização concluída');

      // 6. Finalizar exportação
      const blob = await this.#components.exporter.stop();
      this.#reportProgress(90, 'Vídeo exportado');

      // 7. Validar arquivo
      const validationResult = await this.#validateExport(blob, duration);
      this.#reportProgress(95, 'Validação concluída');

      // 8. Verificar se validação passou
      if (!validationResult.valid) {
        throw new Error(`Validação falhou:\n${validationResult.errors.join('\n')}`);
      }

      // 9. Fazer download
      const filename = this.#generateFilename();
      Mp4Exporter.downloadFile(blob, filename);
      this.#reportProgress(100, 'Download iniciado');

      // 10. Calcular estatísticas
      const renderTime = (Date.now() - this.#startTime) / 1000;

      const result = {
        success: true,
        blob,
        validation: validationResult,
        metadata: {
          filename,
          fileSize: blob.size,
          duration,
          resolution: {
            width: this.#components.config.width,
            height: this.#components.config.height
          },
          renderTime
        },
        error: null
      };

      // Emitir evento de conclusão
      this.#emit('complete', result);

      return result;

    } catch (error) {
      console.error('❌ ExportOrchestrator: erro durante exportação', error);

      const errorResult = {
        success: false,
        blob: null,
        validation: null,
        metadata: null,
        error: error.message
      };

      this.#emit('error', error);
      return errorResult;

    } finally {
      // Limpar recursos
      this.#cleanup();
      this.#isExporting = false;

      // Remover callback temporário
      if (progressCallback) {
        this.off('progress', progressCallback);
      }
    }
  }

  /**
   * Captura estado atual do editor
   * 
   * @returns {Object} Estado da timeline
   */
  captureEditorState() {
    // Obter elementos do DOM
    const mainVideoElement = document.querySelector('#main-video') || 
                            document.querySelector('video[data-role="main"]');
    
    const webcamElement = document.querySelector('#webcam-video') || 
                         document.querySelector('video[data-role="webcam"]');

    if (!mainVideoElement) {
      throw new Error('ExportOrchestrator: vídeo principal não encontrado no DOM');
    }

    // Capturar posição do vídeo
    const videoPosition = this.#getVideoPosition();

    // Capturar configuração da webcam
    const webcamConfig = webcamElement ? this.#getWebcamConfig(webcamElement) : null;

    // Capturar overlays (textos/emojis)
    const overlays = this.#getOverlays();

    return {
      mainVideo: {
        element: mainVideoElement,
        position: videoPosition,
        scale: 1.0
      },
      webcam: webcamConfig,
      overlays
    };
  }

  // ==========================================
  // MÉTODOS PÚBLICOS - EVENTOS
  // ==========================================

  /**
   * Registra handler de evento
   * 
   * @param {string} event - Nome do evento ('progress', 'complete', 'error')
   * @param {Function} handler - Função callback
   */
  on(event, handler) {
    if (!this.#eventHandlers[event]) {
      throw new Error(`ExportOrchestrator: evento desconhecido - ${event}`);
    }

    this.#eventHandlers[event].push(handler);
  }

  /**
   * Remove handler de evento
   * 
   * @param {string} event - Nome do evento
   * @param {Function} handler - Função callback a remover
   */
  off(event, handler) {
    if (!this.#eventHandlers[event]) {
      return;
    }

    const index = this.#eventHandlers[event].indexOf(handler);
    if (index > -1) {
      this.#eventHandlers[event].splice(index, 1);
    }
  }

  /**
   * Retorna estado atual do processo
   * 
   * @returns {Object} {stage, percentage, message}
   */
  getCurrentState() {
    return { ...this.#currentState };
  }

  /**
   * Verifica se exportação está em andamento
   * 
   * @returns {boolean} True se exportando
   */
  isExporting() {
    return this.#isExporting;
  }

  // ==========================================
  // MÉTODOS PRIVADOS - PIPELINE
  // ==========================================

  /**
   * Inicializa todos os componentes
   * @private
   * @param {Object} editorState - Estado do editor
   * @returns {Promise<void>}
   */
  async #initializeComponents(editorState) {
    // 1. Criar configuração
    this.#components.config = ExportConfig.createDefault();

    // 2. Criar VideoFitEngine
    this.#components.fitEngine = new VideoFitEngine(this.#components.config);

    // 3. Criar TimelineRenderer
    this.#components.renderer = new TimelineRenderer(
      this.#components.config,
      this.#components.fitEngine
    );

    // Definir estado da timeline
    this.#components.renderer.setTimelineState(editorState);

    // 4. Criar AudioMixer
    this.#components.mixer = new AudioMixer(this.#components.config);

    // 5. Criar Mp4Exporter
    this.#components.exporter = new Mp4Exporter(this.#components.config);

    // 6. Criar ExportValidator
    this.#components.validator = new ExportValidator(this.#components.config);

    console.log('✅ ExportOrchestrator: componentes inicializados');
  }

  /**
   * Renderiza todos os frames do vídeo
   * @private
   * @param {number} duration - Duração total em segundos
   * @param {number} fps - Frames por segundo
   * @returns {Promise<void>}
   */
  async #renderAllFrames(duration, fps) {
    const frameTime = 1 / fps;
    const totalFrames = Math.ceil(duration * fps);
    let frameCount = 0;

    console.log(`🎬 ExportOrchestrator: renderizando ${totalFrames} frames...`);

    for (let time = 0; time < duration; time += frameTime) {
      // Renderizar frame atual
      this.#components.renderer.renderFrame(time);

      frameCount++;

      // Reportar progresso a cada 10 frames
      if (frameCount % 10 === 0 || frameCount === totalFrames) {
        const frameProgress = (frameCount / totalFrames) * 100;
        const overallProgress = 25 + (frameProgress * 0.6); // 25% a 85%
        
        this.#reportProgress(
          overallProgress,
          `Renderizando frame ${frameCount}/${totalFrames}`
        );
      }

      // Yield para não bloquear UI (a cada 30 frames)
      if (frameCount % 30 === 0) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }

    console.log(`✅ ExportOrchestrator: ${frameCount} frames renderizados`);
  }

  /**
   * Mixa áudio de todas as fontes
   * @private
   * @param {Object} editorState - Estado do editor
   * @returns {Promise<MediaStreamTrack>} Track de áudio mixado
   */
  async #mixAudio(editorState) {
    // Adicionar áudio do vídeo principal
    const mainAudioId = this.#components.mixer.addAudioSource(
      editorState.mainVideo.element,
      'main'
    );

    // Adicionar áudio da webcam se houver
    if (editorState.webcam && editorState.webcam.element) {
      this.#components.mixer.addAudioSource(
        editorState.webcam.element,
        'webcam'
      );
    }

    // Sincronizar com duração do vídeo
    this.#components.mixer.synchronize(editorState.mainVideo.element);

    // Obter track de áudio mixado
    const audioTrack = this.#components.mixer.getAudioTrack();

    console.log('✅ ExportOrchestrator: áudio mixado');

    return audioTrack;
  }

  /**
   * Valida vídeo exportado
   * @private
   * @param {Blob} blob - Blob do vídeo
   * @param {number} expectedDuration - Duração esperada
   * @returns {Promise<ValidationResult>} Resultado da validação
   */
  async #validateExport(blob, expectedDuration) {
    const validationResult = await this.#components.validator.validate(
      blob,
      expectedDuration
    );

    // Exibir relatório
    console.log(this.#components.validator.getValidationReport());

    return validationResult;
  }

  // ==========================================
  // MÉTODOS PRIVADOS - CAPTURA DE ESTADO
  // ==========================================

  /**
   * Obtém posição do vídeo principal
   * @private
   * @returns {string} 'top', 'center' ou 'bottom'
   */
  #getVideoPosition() {
    // Tentar obter de atributo data ou classe
    const mainVideo = document.querySelector('#main-video');
    if (!mainVideo) return 'center';

    const position = mainVideo.dataset.position || 
                    mainVideo.getAttribute('data-position');

    if (position) {
      return position;
    }

    // Verificar classes CSS
    if (mainVideo.classList.contains('position-top')) return 'top';
    if (mainVideo.classList.contains('position-bottom')) return 'bottom';

    return 'center';
  }

  /**
   * Obtém configuração da webcam
   * @private
   * @param {HTMLVideoElement} webcamElement - Elemento da webcam
   * @returns {Object} Configuração da webcam
   */
  #getWebcamConfig(webcamElement) {
    // Obter posição e dimensões do elemento
    const rect = webcamElement.getBoundingClientRect();
    const container = document.querySelector('.preview-container') || document.body;
    const containerRect = container.getBoundingClientRect();

    return {
      element: webcamElement,
      x: rect.left - containerRect.left,
      y: rect.top - containerRect.top,
      width: rect.width,
      height: rect.height,
      visible: !webcamElement.classList.contains('hidden') && 
               window.getComputedStyle(webcamElement).display !== 'none'
    };
  }

  /**
   * Obtém overlays (textos/emojis)
   * @private
   * @returns {Array} Array de overlays
   */
  #getOverlays() {
    const overlays = [];
    const overlayElements = document.querySelectorAll('[data-overlay="true"]');

    overlayElements.forEach(element => {
      const type = element.dataset.overlayType || 'text';
      const content = element.textContent || element.dataset.content || '';
      const rect = element.getBoundingClientRect();
      const container = document.querySelector('.preview-container') || document.body;
      const containerRect = container.getBoundingClientRect();

      overlays.push({
        type,
        content,
        x: rect.left - containerRect.left,
        y: rect.top - containerRect.top,
        fontSize: parseInt(window.getComputedStyle(element).fontSize) || 48,
        color: window.getComputedStyle(element).color || '#ffffff'
      });
    });

    return overlays;
  }

  // ==========================================
  // MÉTODOS PRIVADOS - HELPERS
  // ==========================================

  /**
   * Gera nome de arquivo para exportação
   * @private
   * @returns {string} Nome do arquivo
   */
  #generateFilename() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const codecInfo = this.#components.exporter.getCodecInfo();
    const extension = codecInfo.container === 'MP4' ? 'mp4' : 'webm';
    
    return `video_final_1080x1920_${timestamp}.${extension}`;
  }

  /**
   * Reporta progresso
   * @private
   * @param {number} percentage - Percentual de conclusão (0-100)
   * @param {string} message - Mensagem descritiva
   */
  #reportProgress(percentage, message) {
    this.#currentState = {
      percentage,
      message,
      stage: this.#getCurrentStage(percentage)
    };

    this.#emit('progress', this.#currentState);
  }

  /**
   * Determina estágio atual baseado no percentual
   * @private
   * @param {number} percentage - Percentual de conclusão
   * @returns {string} Nome do estágio
   */
  #getCurrentStage(percentage) {
    if (percentage < 5) return ExportOrchestrator.STAGES.INITIALIZE;
    if (percentage < 10) return ExportOrchestrator.STAGES.CAPTURE_STATE;
    if (percentage < 15) return ExportOrchestrator.STAGES.SETUP_COMPONENTS;
    if (percentage < 25) return ExportOrchestrator.STAGES.MIX_AUDIO;
    if (percentage < 85) return ExportOrchestrator.STAGES.RENDER_FRAMES;
    if (percentage < 90) return ExportOrchestrator.STAGES.EXPORT_VIDEO;
    if (percentage < 95) return ExportOrchestrator.STAGES.VALIDATE;
    if (percentage < 100) return ExportOrchestrator.STAGES.DOWNLOAD;
    return ExportOrchestrator.STAGES.COMPLETE;
  }

  /**
   * Emite evento
   * @private
   * @param {string} event - Nome do evento
   * @param {*} data - Dados do evento
   */
  #emit(event, data) {
    if (this.#eventHandlers[event]) {
      this.#eventHandlers[event].forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`ExportOrchestrator: erro em handler de ${event}`, error);
        }
      });
    }
  }

  /**
   * Limpa recursos
   * @private
   */
  #cleanup() {
    if (this.#components.mixer) {
      this.#components.mixer.dispose();
    }

    if (this.#components.exporter) {
      this.#components.exporter.dispose();
    }

    this.#components = {};
  }

  // ==========================================
  // MÉTODOS DE VALIDAÇÃO
  // ==========================================

  /**
   * Valida editor state
   * @private
   * @throws {Error} Se state inválido
   */
  #validateEditorState(state) {
    if (!state || !state.mainVideo || !state.mainVideo.element) {
      throw new Error('ExportOrchestrator: editor state inválido (mainVideo obrigatório)');
    }

    const videoElement = state.mainVideo.element;

    if (!(videoElement instanceof HTMLVideoElement)) {
      throw new Error('ExportOrchestrator: mainVideo.element deve ser HTMLVideoElement');
    }

    if (!videoElement.duration || videoElement.duration <= 0) {
      throw new Error('ExportOrchestrator: vídeo principal não está carregado ou tem duração inválida');
    }
  }
}

/**
 * @typedef {Object} ExportResult
 * @property {boolean} success - Se exportação foi bem-sucedida
 * @property {Blob} blob - Blob do vídeo exportado
 * @property {ValidationResult} validation - Resultado da validação
 * @property {Object} metadata - Metadados da exportação
 * @property {string} metadata.filename - Nome do arquivo
 * @property {number} metadata.fileSize - Tamanho em bytes
 * @property {number} metadata.duration - Duração em segundos
 * @property {Object} metadata.resolution - {width, height}
 * @property {number} metadata.renderTime - Tempo total de exportação
 * @property {string|null} error - Mensagem de erro (se houver)
 */

// Exportar para CommonJS/ES6
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ExportOrchestrator;
}
