/**
 * Enums e constantes do sistema de gravação
 */

/**
 * Tipos de formato de vídeo disponíveis
 */
const VideoFormatType = Object.freeze({
  YOUTUBE: 'YOUTUBE',
  TIKTOK: 'TIKTOK',
  SHORTS: 'SHORTS'
});

/**
 * Modos de background para composição
 */
const BackgroundMode = Object.freeze({
  BLACK: 'BLACK',
  GRADIENT: 'GRADIENT',
  BLUR: 'BLUR',
  IMAGE: 'IMAGE'
});

/**
 * Qualidades de exportação
 */
const ExportQuality = Object.freeze({
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  ULTRA: 'ULTRA'
});

/**
 * Tipos de layout disponíveis
 */
const LayoutType = Object.freeze({
  SCREEN_ONLY: 'SCREEN_ONLY',
  SCREEN_PLUS_WEBCAM_TOP: 'SCREEN_PLUS_WEBCAM_TOP',
  SCREEN_PLUS_WEBCAM_CORNER: 'SCREEN_PLUS_WEBCAM_CORNER',
  WEBCAM_ONLY: 'WEBCAM_ONLY'
});

/**
 * Status de gravação
 */
const RecordingStatus = Object.freeze({
  IDLE: 'IDLE',
  PREPARING: 'PREPARING',
  RECORDING: 'RECORDING',
  PAUSED: 'PAUSED',
  STOPPED: 'STOPPED',
  ERROR: 'ERROR'
});

/**
 * Status de exportação
 */
const ExportStatus = Object.freeze({
  PENDING: 'PENDING',
  PREPARING: 'PREPARING',
  PROCESSING: 'PROCESSING',
  FINALIZING: 'FINALIZING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED'
});

/**
 * Tipos de fonte de áudio
 */
const AudioSourceType = Object.freeze({
  MICROPHONE: 'MICROPHONE',
  SYSTEM: 'SYSTEM',
  MIXED: 'MIXED'
});

/**
 * Posições da webcam no overlay
 */
const WebcamPosition = Object.freeze({
  TOP_LEFT: 'TOP_LEFT',
  TOP_RIGHT: 'TOP_RIGHT',
  BOTTOM_LEFT: 'BOTTOM_LEFT',
  BOTTOM_RIGHT: 'BOTTOM_RIGHT',
  TOP_CENTER: 'TOP_CENTER'
});

module.exports = {
  VideoFormatType,
  BackgroundMode,
  ExportQuality,
  LayoutType,
  RecordingStatus,
  ExportStatus,
  AudioSourceType,
  WebcamPosition
};
