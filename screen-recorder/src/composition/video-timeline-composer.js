/**
 * Responsável por sincronizar e alinhar múltiplas fontes de mídia no tempo
 */
class VideoTimelineComposer {
  constructor() {
    this.mediaSources = [];
    this.timelineOffset = 0;
    this.startTimestamp = null;
  }

  /**
   * Adiciona uma fonte de mídia à timeline
   */
  addMediaSource(mediaSource, startOffset = 0) {
    this.mediaSources.push({
      source: mediaSource,
      startOffset,
      duration: mediaSource.getDurationInSeconds(),
      type: mediaSource.type
    });
  }

  /**
   * Remove uma fonte de mídia
   */
  removeMediaSource(mediaSourceId) {
    this.mediaSources = this.mediaSources.filter(
      ms => ms.source.id !== mediaSourceId
    );
  }

  /**
   * Define o timestamp de início da timeline
   */
  setStartTimestamp(timestamp) {
    this.startTimestamp = timestamp;
  }

  /**
   * Sincroniza todas as fontes de mídia
   * Alinha pelo timestamp mais antigo
   */
  synchronizeSources() {
    if (this.mediaSources.length === 0) {
      return {
        success: false,
        error: 'Nenhuma fonte de mídia para sincronizar'
      };
    }

    // Encontra o timestamp mais antigo
    let earliestTimestamp = Infinity;

    this.mediaSources.forEach(ms => {
      const sourceTimestamp = ms.source.createdAt.getTime();
      if (sourceTimestamp < earliestTimestamp) {
        earliestTimestamp = sourceTimestamp;
      }
    });

    // Calcula offset para cada fonte
    this.mediaSources.forEach(ms => {
      const sourceTimestamp = ms.source.createdAt.getTime();
      ms.startOffset = (sourceTimestamp - earliestTimestamp) / 1000; // Em segundos
    });

    return {
      success: true,
      earliestTimestamp,
      sources: this.mediaSources.map(ms => ({
        id: ms.source.id,
        type: ms.source.type,
        startOffset: ms.startOffset,
        duration: ms.duration
      }))
    };
  }

  /**
   * Alinha manualmente os offsets das fontes
   */
  alignSources(alignments) {
    alignments.forEach(({ sourceId, offset }) => {
      const mediaSource = this.mediaSources.find(ms => ms.source.id === sourceId);
      
      if (mediaSource) {
        mediaSource.startOffset = offset;
      }
    });
  }

  /**
   * Retorna a duração total da timeline
   */
  getTotalDuration() {
    if (this.mediaSources.length === 0) {
      return 0;
    }

    let maxDuration = 0;

    this.mediaSources.forEach(ms => {
      const endTime = ms.startOffset + ms.duration;
      if (endTime > maxDuration) {
        maxDuration = endTime;
      }
    });

    return maxDuration;
  }

  /**
   * Verifica se as fontes estão sincronizadas
   */
  areSourcesSynchronized() {
    return this.mediaSources.every(ms => ms.startOffset !== undefined);
  }

  /**
   * Retorna informações da timeline
   */
  getTimelineInfo() {
    return {
      totalDuration: this.getTotalDuration(),
      sourcesCount: this.mediaSources.length,
      synchronized: this.areSourcesSynchronized(),
      sources: this.mediaSources.map(ms => ({
        id: ms.source.id,
        type: ms.type,
        startOffset: ms.startOffset,
        duration: ms.duration,
        endTime: ms.startOffset + ms.duration
      }))
    };
  }

  /**
   * Exporta a configuração da timeline
   */
  exportTimeline() {
    return {
      timelineOffset: this.timelineOffset,
      startTimestamp: this.startTimestamp,
      sources: this.mediaSources.map(ms => ({
        sourceId: ms.source.id,
        type: ms.type,
        startOffset: ms.startOffset,
        duration: ms.duration
      }))
    };
  }

  /**
   * Importa uma configuração de timeline
   */
  importTimeline(timelineData) {
    this.timelineOffset = timelineData.timelineOffset;
    this.startTimestamp = timelineData.startTimestamp;
    
    // Nota: As fontes precisam ser adicionadas separadamente
    // Esta função apenas restaura os offsets
    return timelineData.sources;
  }

  /**
   * Limpa a timeline
   */
  clear() {
    this.mediaSources = [];
    this.timelineOffset = 0;
    this.startTimestamp = null;
  }

  /**
   * Valida a timeline
   */
  validate() {
    const errors = [];

    if (this.mediaSources.length === 0) {
      errors.push('Timeline vazia - nenhuma fonte de mídia');
    }

    this.mediaSources.forEach((ms, index) => {
      if (ms.startOffset < 0) {
        errors.push(`Fonte ${index} tem offset negativo: ${ms.startOffset}`);
      }

      if (ms.duration <= 0) {
        errors.push(`Fonte ${index} tem duração inválida: ${ms.duration}`);
      }

      if (!ms.source.isAvailable()) {
        errors.push(`Fonte ${index} não está disponível`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

module.exports = { VideoTimelineComposer };
