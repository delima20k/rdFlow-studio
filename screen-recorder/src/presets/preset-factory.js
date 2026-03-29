const { VideoFormatType } = require('../models/enums');
const { YouTubeLayoutPreset } = require('./youtube-layout-preset');
const { TikTokLayoutPreset } = require('./tiktok-layout-preset');
const { ShortsLayoutPreset } = require('./shorts-layout-preset');

/**
 * Factory para criar presets de layout
 */
class PresetFactory {
  /**
   * Cria um preset baseado no tipo de formato
   */
  static createPreset(formatType, layoutType, options = {}) {
    switch (formatType) {
      case VideoFormatType.YOUTUBE:
        const youtubePreset = new YouTubeLayoutPreset(layoutType, options.webcamPosition);
        if (options.backgroundMode) {
          youtubePreset.setBackgroundMode(options.backgroundMode);
        }
        return youtubePreset;

      case VideoFormatType.TIKTOK:
        const tiktokPreset = new TikTokLayoutPreset(layoutType);
        if (options.backgroundMode) {
          tiktokPreset.setBackgroundMode(options.backgroundMode);
        }
        return tiktokPreset;

      case VideoFormatType.SHORTS:
        const shortsPreset = new ShortsLayoutPreset(layoutType);
        if (options.backgroundMode) {
          shortsPreset.setBackgroundMode(options.backgroundMode);
        }
        return shortsPreset;

      default:
        throw new Error(`Tipo de formato não suportado: ${formatType}`);
    }
  }

  /**
   * Lista todos os presets disponíveis
   */
  static listAvailablePresets() {
    return [
      {
        formatType: VideoFormatType.YOUTUBE,
        label: 'YouTube (16:9)',
        resolution: '1920x1080',
        description: 'Formato horizontal para YouTube'
      },
      {
        formatType: VideoFormatType.TIKTOK,
        label: 'TikTok (9:16)',
        resolution: '1080x1920',
        description: 'Formato vertical para TikTok'
      },
      {
        formatType: VideoFormatType.SHORTS,
        label: 'Shorts/Reels (9:16)',
        resolution: '1080x1920',
        description: 'Formato vertical para YouTube Shorts e Instagram Reels'
      }
    ];
  }
}

module.exports = { PresetFactory };
