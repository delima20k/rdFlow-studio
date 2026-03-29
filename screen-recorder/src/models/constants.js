/**
 * Constantes de configuração do sistema
 */

const VIDEO_FORMATS = Object.freeze({
  YOUTUBE: {
    width: 1920,
    height: 1080,
    aspectRatio: 16 / 9,
    fps: 30,
    label: 'YouTube (16:9)'
  },
  TIKTOK: {
    width: 1080,
    height: 1920,
    aspectRatio: 9 / 16,
    fps: 30,
    label: 'TikTok (9:16)'
  },
  SHORTS: {
    width: 1080,
    height: 1920,
    aspectRatio: 9 / 16,
    fps: 30,
    label: 'Shorts/Reels (9:16)'
  }
});

const QUALITY_PRESETS = Object.freeze({
  LOW: {
    videoBitrate: 1000000,    // 1 Mbps
    audioBitrate: 64000,      // 64 kbps
    fps: 24
  },
  MEDIUM: {
    videoBitrate: 2500000,    // 2.5 Mbps
    audioBitrate: 128000,     // 128 kbps
    fps: 30
  },
  HIGH: {
    videoBitrate: 5000000,    // 5 Mbps
    audioBitrate: 192000,     // 192 kbps
    fps: 30
  },
  ULTRA: {
    videoBitrate: 10000000,   // 10 Mbps
    audioBitrate: 320000,     // 320 kbps
    fps: 60
  }
});

const WEBCAM_OVERLAY_CONFIG = Object.freeze({
  YOUTUBE: {
    TOP_RIGHT: {
      width: 320,
      height: 180,
      x: 1920 - 320 - 20,
      y: 20,
      padding: 20
    },
    TOP_LEFT: {
      width: 320,
      height: 180,
      x: 20,
      y: 20,
      padding: 20
    },
    BOTTOM_RIGHT: {
      width: 320,
      height: 180,
      x: 1920 - 320 - 20,
      y: 1080 - 180 - 20,
      padding: 20
    },
    BOTTOM_LEFT: {
      width: 320,
      height: 180,
      x: 20,
      y: 1080 - 180 - 20,
      padding: 20
    }
  },
  TIKTOK: {
    TOP_CENTER: {
      width: 1080,
      height: 607,
      x: 0,
      y: 0,
      padding: 0
    }
  }
});

const TIKTOK_LAYOUT_CONFIG = Object.freeze({
  canvasWidth: 1080,
  canvasHeight: 1920,
  webcamAreaHeight: 607,    // Aproximadamente 1/3 superior
  screenAreaHeight: 1313,   // 2/3 inferior
  padding: 0,
  borderRadius: 0
});

const DEFAULT_EXPORT_CONFIG = Object.freeze({
  format: 'mp4',
  videoCodec: 'h264',
  audioCodec: 'aac',
  container: 'mp4'
});

const MAX_RECORDING_DURATION_MS = 3600000; // 1 hora
const PREVIEW_UPDATE_INTERVAL_MS = 100;
const AUTO_SAVE_INTERVAL_MS = 30000;       // 30 segundos

module.exports = {
  VIDEO_FORMATS,
  QUALITY_PRESETS,
  WEBCAM_OVERLAY_CONFIG,
  TIKTOK_LAYOUT_CONFIG,
  DEFAULT_EXPORT_CONFIG,
  MAX_RECORDING_DURATION_MS,
  PREVIEW_UPDATE_INTERVAL_MS,
  AUTO_SAVE_INTERVAL_MS
};
