const { TikTokLayoutPreset } = require('./tiktok-layout-preset');
const { VideoFormatType } = require('../models/enums');

/**
 * Preset para formato Shorts/Reels (9:16 - 1080x1920)
 * Herda do TikTokLayoutPreset pois o formato é idêntico
 * Pode ser customizado futuramente com elementos específicos do YouTube Shorts ou Instagram Reels
 */
class ShortsLayoutPreset extends TikTokLayoutPreset {
  constructor(layoutType) {
    super(layoutType);
    this.formatType = VideoFormatType.SHORTS;
  }

  /**
   * Retorna informações do preset
   */
  getInfo() {
    const baseInfo = super.getInfo();
    
    return {
      ...baseInfo,
      description: 'Shorts/Reels 9:16 - Formato vertical otimizado para YouTube Shorts e Instagram Reels'
    };
  }

  /**
   * Área específica para elementos do YouTube Shorts
   */
  getShortsSpecificAreas() {
    const { canvasWidth, canvasHeight } = this.layoutConfig;

    return {
      // Área para contador de views
      viewCountArea: {
        x: 20,
        y: canvasHeight - 180,
        width: 150,
        height: 40,
        zIndex: 11
      },
      // Área para botão de inscrição
      subscribeButtonArea: {
        x: canvasWidth - 170,
        y: canvasHeight - 180,
        width: 150,
        height: 40,
        zIndex: 11
      },
      // Área para hashtags
      hashtagArea: {
        x: 20,
        y: canvasHeight - 140,
        width: canvasWidth - 40,
        height: 60,
        zIndex: 11
      }
    };
  }
}

module.exports = { ShortsLayoutPreset };
