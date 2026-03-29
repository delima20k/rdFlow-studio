// Entry point do módulo Screen Recorder

// Models
const { RecordingConfig } = require('./models/recording-config');
const { MediaSource } = require('./models/media-source');
const { RecordingSession } = require('./models/recording-session');
const { 
  VideoFormatType, 
  BackgroundMode, 
  ExportQuality, 
  LayoutType,
  RecordingStatus,
  ExportStatus,
  AudioSourceType,
  WebcamPosition
} = require('./models/enums');
const { 
  VIDEO_FORMATS, 
  QUALITY_PRESETS,
  WEBCAM_OVERLAY_CONFIG,
  TIKTOK_LAYOUT_CONFIG,
  DEFAULT_EXPORT_CONFIG
} = require('./models/constants');

// Capture
const { ScreenRecorder } = require('./capture/screen-recorder');
const { WebcamRecorder } = require('./capture/webcam-recorder');
const { AudioRecorder } = require('./capture/audio-recorder');

// Core
const { CaptureManager } = require('./core/capture-manager');

// Presets
const { LayoutPreset } = require('./presets/layout-preset');
const { YouTubeLayoutPreset } = require('./presets/youtube-layout-preset');
const { TikTokLayoutPreset } = require('./presets/tiktok-layout-preset');
const { ShortsLayoutPreset } = require('./presets/shorts-layout-preset');
const { PresetFactory } = require('./presets/preset-factory');

// Composition
const { CompositionEngine } = require('./composition/composition-engine');
const { VideoTimelineComposer } = require('./composition/video-timeline-composer');
const { PreviewRenderer } = require('./composition/preview-renderer');

// Export
const { ExportManager, ExportJob } = require('./export/export-manager');

// Utils
const { ProjectSettings } = require('./utils/project-settings');

/**
 * Facade principal do Screen Recorder
 * Orquestra todos os módulos e fornece interface simplificada
 */
class ScreenRecorder {
  constructor() {
    this.captureManager = new CaptureManager();
    this.exportManager = new ExportManager();
    this.previewRenderer = null;
    this.projectSettings = new ProjectSettings();
    this.currentPreset = null;
    this.currentConfig = null;
  }

  /**
   * Inicializa uma nova gravação
   */
  async initialize(config) {
    // Valida configuração
    const validation = config.validate();
    if (!validation.isValid) {
      throw new Error(`Configuração inválida: ${validation.errors.join(', ')}`);
    }

    this.currentConfig = config;

    // Cria preset baseado na configuração
    this.currentPreset = PresetFactory.createPreset(
      config.formatType,
      config.layoutType,
      {
        webcamPosition: config.webcamPosition,
        backgroundMode: BackgroundMode.BLACK
      }
    );

    // Salva configuração
    this.projectSettings.saveLastConfig(config);

    return {
      success: true,
      config,
      preset: this.currentPreset
    };
  }

  /**
   * Inicia preview
   */
  initializePreview(containerElement) {
    if (!this.currentPreset) {
      throw new Error('Preset não definido. Chame initialize() primeiro.');
    }

    this.previewRenderer = new PreviewRenderer(this.currentPreset);
    return this.previewRenderer.initialize(containerElement);
  }

  /**
   * Lista dispositivos disponíveis
   */
  async listDevices() {
    return this.captureManager.listDevices();
  }

  /**
   * Inicia sessão de gravação
   */
  async startSession() {
    if (!this.currentConfig) {
      throw new Error('Configuração não definida. Chame initialize() primeiro.');
    }

    return this.captureManager.startSession(this.currentConfig);
  }

  /**
   * Inicia gravação
   */
  async startRecording() {
    const result = await this.captureManager.startRecording();

    // Inicia preview se existir
    if (this.previewRenderer) {
      const screenStream = this.captureManager.screenRecorder.getMediaStream();
      const webcamStream = this.captureManager.webcamRecorder.getMediaStream();
      
      this.previewRenderer.setLiveStreams(screenStream, webcamStream);
      this.previewRenderer.startRendering(this.currentConfig.fps);
    }

    return result;
  }

  /**
   * Para gravação
   */
  async stopRecording() {
    const result = await this.captureManager.stopRecording();

    // Para preview
    if (this.previewRenderer) {
      this.previewRenderer.stopRendering();
    }

    return result;
  }

  /**
   * Exporta vídeo gravado
   */
  async export(options = {}) {
    const session = this.captureManager.getCurrentSession();
    
    if (!session || !session.isComplete()) {
      throw new Error('Nenhuma gravação completa disponível para exportar');
    }

    // Obtém as fontes de mídia
    const screenSource = session.getMediaSource(MediaSource.Type.SCREEN);
    const webcamSource = session.getMediaSource(MediaSource.Type.WEBCAM);

    if (!screenSource) {
      throw new Error('Fonte de tela não encontrada');
    }

    // Se tiver preview renderer, usa seu canvas
    if (this.previewRenderer) {
      const canvasStream = this.previewRenderer.getCaptureStream();
      const audioBlob = session.getMediaSource(MediaSource.Type.MICROPHONE_AUDIO)?.blob ||
                        session.getMediaSource(MediaSource.Type.MIXED_AUDIO)?.blob;

      let audioStream = null;
      if (audioBlob) {
        const audioElement = document.createElement('audio');
        audioElement.src = URL.createObjectURL(audioBlob);
        await audioElement.play();
        audioStream = audioElement.captureStream();
      }

      return this.exportManager.exportWithMediaRecorder(canvasStream, audioStream, {
        ...options,
        formatType: this.currentConfig.formatType,
        projectName: this.currentConfig.projectName
      });
    }

    // Fallback: exporta vídeo da tela diretamente
    return this.exportManager.exportExistingVideo(screenSource.blob, {
      ...options,
      formatType: this.currentConfig.formatType,
      projectName: this.currentConfig.projectName
    });
  }

  /**
   * Retorna status atual
   */
  getStatus() {
    return {
      capture: this.captureManager.getStatus(),
      export: {
        status: this.exportManager.getStatus(),
        progress: this.exportManager.getProgress()
      },
      preview: {
        isRendering: this.previewRenderer?.getIsRendering() || false
      }
    };
  }

  /**
   * Libera recursos
   */
  dispose() {
    this.captureManager?.dispose();
    this.exportManager?.dispose();
    this.previewRenderer?.dispose();
    
    this.currentPreset = null;
    this.currentConfig = null;
  }
}

// Exporta tudo
module.exports = {
  // Main
  ScreenRecorder,
  
  // Models
  RecordingConfig,
  MediaSource,
  RecordingSession,
  
  // Enums
  VideoFormatType,
  BackgroundMode,
  ExportQuality,
  LayoutType,
  RecordingStatus,
  ExportStatus,
  AudioSourceType,
  WebcamPosition,
  
  // Constants
  VIDEO_FORMATS,
  QUALITY_PRESETS,
  
  // Factories
  PresetFactory,
  
  // Utils
  ProjectSettings,
  
  // Individual components (for advanced usage)
  CaptureManager,
  ExportManager,
  PreviewRenderer,
  ScreenRecorder: ScreenRecorder,
  WebcamRecorder,
  AudioRecorder,
  YouTubeLayoutPreset,
  TikTokLayoutPreset,
  ShortsLayoutPreset
};
