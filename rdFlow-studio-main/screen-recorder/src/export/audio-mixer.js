/**
 * AudioMixer - Mixador de Áudio para Exportação
 * 
 * Extrai, mixa e sincroniza múltiplas fontes de áudio (vídeo principal,
 * webcam, música de fundo). Exporta áudio final em AAC com bitrate
 * configurável e sincronização precisa com vídeo.
 * 
 * @class
 * @author DELIMA
 * @version 1.0.0
 */
class AudioMixer {
  // Campos privados
  #exportConfig;
  #audioContext;
  #audioSources;
  #nextSourceId;
  #masterGain;
  #sampleRate;
  #bitrate;

  /**
   * Cria instância do AudioMixer
   * 
   * @param {ExportConfig} exportConfig - Configuração de exportação
   * @throws {Error} Se exportConfig for inválido
   */
  constructor(exportConfig) {
    this.#validateConfig(exportConfig);

    this.#exportConfig = exportConfig;
    this.#audioSources = new Map();
    this.#nextSourceId = 1;
    
    // Extrair configurações de áudio
    this.#sampleRate = exportConfig.audioSampleRate || 48000;
    this.#bitrate = exportConfig.audioBitrate || '128k';

    // Inicializar AudioContext
    this.#initializeAudioContext();
  }

  /**
   * Adiciona fonte de áudio para mixagem
   * 
   * @param {HTMLAudioElement|HTMLVideoElement} audioElement - Elemento com áudio
   * @param {string} label - Identificador: 'main', 'webcam', 'background', etc.
   * @returns {number} ID da fonte (para ajustar volume ou remover)
   * @throws {Error} Se elemento for inválido
   */
  addAudioSource(audioElement, label = 'main') {
    this.#validateAudioElement(audioElement);

    const sourceId = this.#nextSourceId++;

    // Criar nó de fonte de mídia
    const mediaSource = this.#audioContext.createMediaElementSource(audioElement);

    // Criar nó de ganho individual
    const gainNode = this.#audioContext.createGain();
    gainNode.gain.value = 1.0; // Volume padrão 100%

    // Conectar: fonte → ganho → master
    mediaSource.connect(gainNode);
    gainNode.connect(this.#masterGain);

    // Armazenar referência
    this.#audioSources.set(sourceId, {
      id: sourceId,
      label,
      element: audioElement,
      mediaSource,
      gainNode,
      volume: 1.0
    });

    return sourceId;
  }

  /**
   * Remove fonte de áudio
   * 
   * @param {number} id - ID da fonte retornado por addAudioSource()
   * @returns {boolean} True se removido, false se não encontrado
   */
  removeAudioSource(id) {
    const source = this.#audioSources.get(id);
    
    if (!source) {
      return false;
    }

    // Desconectar nós
    source.mediaSource.disconnect();
    source.gainNode.disconnect();

    // Remover da lista
    this.#audioSources.delete(id);

    return true;
  }

  /**
   * Ajusta volume de uma fonte específica
   * 
   * @param {number} sourceId - ID da fonte
   * @param {number} volume - Volume de 0.0 a 1.0 (0% a 100%)
   * @throws {Error} Se volume for inválido ou fonte não existir
   */
  setVolume(sourceId, volume) {
    this.#validateVolume(volume);

    const source = this.#audioSources.get(sourceId);
    
    if (!source) {
      throw new Error(`AudioMixer: fonte ${sourceId} não encontrada`);
    }

    // Atualizar ganho com rampa suave (evita cliques)
    const currentTime = this.#audioContext.currentTime;
    source.gainNode.gain.setTargetAtTime(volume, currentTime, 0.01);
    source.volume = volume;
  }

  /**
   * Ajusta volume master (todas as fontes)
   * 
   * @param {number} volume - Volume de 0.0 a 1.0
   */
  setMasterVolume(volume) {
    this.#validateVolume(volume);

    const currentTime = this.#audioContext.currentTime;
    this.#masterGain.gain.setTargetAtTime(volume, currentTime, 0.01);
  }

  /**
   * Mixa todas as fontes de áudio
   * 
   * Aplica normalização automática para evitar clipping (>1.0)
   * 
   * @returns {AudioBuffer} Buffer com áudio mixado
   */
  async mix() {
    if (this.#audioSources.size === 0) {
      throw new Error('AudioMixer: nenhuma fonte de áudio adicionada');
    }

    // Determinar duração máxima entre todas as fontes
    const maxDuration = this.#getMaxDuration();

    // Criar buffer de destino
    const buffer = this.#audioContext.createBuffer(
      2, // estéreo
      Math.ceil(maxDuration * this.#sampleRate),
      this.#sampleRate
    );

    // Processar cada canal (left, right)
    for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
      const outputData = buffer.getChannelData(channel);

      // Mixar todas as fontes neste canal
      for (const source of this.#audioSources.values()) {
        const sourceBuffer = await this.#extractAudioBuffer(source.element);
        const sourceData = sourceBuffer.getChannelData(Math.min(channel, sourceBuffer.numberOfChannels - 1));

        // Adicionar amostras com volume aplicado
        for (let i = 0; i < Math.min(outputData.length, sourceData.length); i++) {
          outputData[i] += sourceData[i] * source.volume;
        }
      }

      // Normalizar para evitar clipping
      this.#normalize(outputData);
    }

    return buffer;
  }

  /**
   * Exporta áudio mixado em formato AAC
   * 
   * @returns {Promise<Blob>} Blob com áudio AAC
   */
  async exportAAC() {
    const mixedBuffer = await this.mix();

    // Converter AudioBuffer para formato AAC
    // Nota: Web Audio API não suporta encoding AAC nativamente
    // Precisamos usar MediaRecorder ou lib externa
    return this.#encodeToAAC(mixedBuffer);
  }

  /**
   * Sincroniza áudio com duração do vídeo
   * Ajusta timing para garantir sincronização exata
   * 
   * @param {HTMLVideoElement} videoElement - Elemento de vídeo de referência
   */
  synchronize(videoElement) {
    this.#validateVideoElement(videoElement);

    const videoDuration = videoElement.duration;

    // Sincronizar cada fonte de áudio
    for (const source of this.#audioSources.values()) {
      const audioElement = source.element;

      // Ajustar currentTime para coincidir com vídeo
      if (Math.abs(audioElement.currentTime - videoElement.currentTime) > 0.01) {
        audioElement.currentTime = videoElement.currentTime;
      }

      // Garantir que áudio não exceda duração do vídeo
      if (audioElement.duration > videoDuration) {
        console.warn(`AudioMixer: áudio "${source.label}" é mais longo que vídeo. Será cortado.`);
      }
    }
  }

  /**
   * Retorna MediaStreamTrack do áudio mixado
   * Usado pelo Mp4Exporter
   * 
   * @returns {MediaStreamAudioTrack}
   */
  getAudioTrack() {
    // Criar destination stream
    const destination = this.#audioContext.createMediaStreamDestination();
    
    // Conectar master gain ao destination
    this.#masterGain.connect(destination);

    // Retornar primeira track de áudio
    return destination.stream.getAudioTracks()[0];
  }

  /**
   * Retorna lista de fontes ativas
   * 
   * @returns {Array} Array com informações das fontes
   */
  getActiveSources() {
    const sources = [];

    for (const source of this.#audioSources.values()) {
      sources.push({
        id: source.id,
        label: source.label,
        volume: source.volume,
        duration: source.element.duration
      });
    }

    return sources;
  }

  /**
   * Limpa todas as fontes e recursos
   */
  dispose() {
    // Remover todas as fontes
    for (const sourceId of this.#audioSources.keys()) {
      this.removeAudioSource(sourceId);
    }

    // Fechar AudioContext
    if (this.#audioContext && this.#audioContext.state !== 'closed') {
      this.#audioContext.close();
    }
  }

  // ===================================
  // MÉTODOS PRIVADOS
  // ===================================

  /**
   * Inicializa AudioContext e nós básicos
   * 
   * @private
   */
  #initializeAudioContext() {
    // Criar AudioContext (browser ou offline)
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    
    if (!AudioContextClass) {
      throw new Error('AudioMixer: AudioContext não suportado neste ambiente');
    }

    this.#audioContext = new AudioContextClass({
      sampleRate: this.#sampleRate
    });

    // Criar nó de ganho master
    this.#masterGain = this.#audioContext.createGain();
    this.#masterGain.gain.value = 1.0;

    // Conectar master ao destino final
    this.#masterGain.connect(this.#audioContext.destination);
  }

  /**
   * Extrai AudioBuffer de elemento de áudio/vídeo
   * 
   * @private
   * @param {HTMLAudioElement|HTMLVideoElement} element - Elemento de mídia
   * @returns {Promise<AudioBuffer>}
   */
  async #extractAudioBuffer(element) {
    // Criar requisição para buscar áudio
    const response = await fetch(element.src);
    const arrayBuffer = await response.arrayBuffer();

    // Decodificar áudio
    return this.#audioContext.decodeAudioData(arrayBuffer);
  }

  /**
   * Normaliza array de amostras para evitar clipping
   * 
   * @private
   * @param {Float32Array} samples - Array de amostras
   */
  #normalize(samples) {
    // Encontrar pico máximo
    let max = 0;
    for (let i = 0; i < samples.length; i++) {
      const abs = Math.abs(samples[i]);
      if (abs > max) {
        max = abs;
      }
    }

    // Se pico excede 1.0, normalizar
    if (max > 1.0) {
      const gain = 0.95 / max; // 0.95 para deixar margem
      for (let i = 0; i < samples.length; i++) {
        samples[i] *= gain;
      }
    }
  }

  /**
   * Determina duração máxima entre todas as fontes
   * 
   * @private
   * @returns {number} Duração em segundos
   */
  #getMaxDuration() {
    let maxDuration = 0;

    for (const source of this.#audioSources.values()) {
      if (source.element.duration > maxDuration) {
        maxDuration = source.element.duration;
      }
    }

    return maxDuration;
  }

  /**
   * Codifica AudioBuffer para AAC
   * 
   * @private
   * @param {AudioBuffer} buffer - Buffer de áudio
   * @returns {Promise<Blob>}
   */
  async #encodeToAAC(buffer) {
    // Converter AudioBuffer para WAV primeiro (formato intermediário)
    const wavBlob = this.#audioBufferToWav(buffer);

    // Criar MediaRecorder para encoding AAC
    // Nota: requer suporte do navegador para 'audio/mp4'
    const stream = await this.#createStreamFromBlob(wavBlob);
    
    const options = {
      mimeType: 'audio/mp4', // AAC em container MP4
      audioBitsPerSecond: this.#parseBitrate(this.#bitrate)
    };

    return new Promise((resolve, reject) => {
      const recorder = new MediaRecorder(stream, options);
      const chunks = [];

      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => resolve(new Blob(chunks, { type: 'audio/mp4' }));
      recorder.onerror = reject;

      recorder.start();
      
      // Parar após processar todo o buffer
      setTimeout(() => recorder.stop(), buffer.duration * 1000);
    });
  }

  /**
   * Converte AudioBuffer para WAV
   * 
   * @private
   * @param {AudioBuffer} buffer - Buffer de áudio
   * @returns {Blob}
   */
  #audioBufferToWav(buffer) {
    const numberOfChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const format = 1; // PCM
    const bitDepth = 16;

    const bytesPerSample = bitDepth / 8;
    const blockAlign = numberOfChannels * bytesPerSample;

    const data = new Float32Array(buffer.length * numberOfChannels);
    
    // Interleave channels
    for (let i = 0; i < buffer.length; i++) {
      for (let channel = 0; channel < numberOfChannels; channel++) {
        data[i * numberOfChannels + channel] = buffer.getChannelData(channel)[i];
      }
    }

    // Convert to 16-bit PCM
    const dataLength = data.length * bytesPerSample;
    const arrayBuffer = new ArrayBuffer(44 + dataLength);
    const view = new DataView(arrayBuffer);

    // WAV header
    this.#writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + dataLength, true);
    this.#writeString(view, 8, 'WAVE');
    this.#writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, format, true);
    view.setUint16(22, numberOfChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitDepth, true);
    this.#writeString(view, 36, 'data');
    view.setUint32(40, dataLength, true);

    // Write PCM samples
    let offset = 44;
    for (let i = 0; i < data.length; i++) {
      const sample = Math.max(-1, Math.min(1, data[i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
      offset += 2;
    }

    return new Blob([arrayBuffer], { type: 'audio/wav' });
  }

  /**
   * Escreve string em DataView
   * 
   * @private
   */
  #writeString(view, offset, string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }

  /**
   * Cria MediaStream de Blob
   * 
   * @private
   */
  async #createStreamFromBlob(blob) {
    const audioElement = new Audio();
    audioElement.src = URL.createObjectURL(blob);
    await audioElement.play();

    const audioContext = new AudioContext();
    const source = audioContext.createMediaElementSource(audioElement);
    const destination = audioContext.createMediaStreamDestination();
    source.connect(destination);

    return destination.stream;
  }

  /**
   * Converte string de bitrate para número
   * 
   * @private
   * @param {string} bitrate - Ex: '128k', '192k'
   * @returns {number} Bitrate em bits por segundo
   */
  #parseBitrate(bitrate) {
    const match = bitrate.match(/^(\d+)k$/i);
    if (match) {
      return parseInt(match[1]) * 1000;
    }
    return 128000; // padrão
  }

  // ===================================
  // VALIDAÇÕES
  // ===================================

  /**
   * @private
   */
  #validateConfig(config) {
    if (!config) {
      throw new Error('AudioMixer: exportConfig é obrigatório');
    }
  }

  /**
   * @private
   */
  #validateAudioElement(element) {
    if (!element || 
        !(element instanceof HTMLAudioElement || element instanceof HTMLVideoElement)) {
      throw new Error('AudioMixer: elemento deve ser HTMLAudioElement ou HTMLVideoElement');
    }
  }

  /**
   * @private
   */
  #validateVideoElement(element) {
    if (!element || !(element instanceof HTMLVideoElement)) {
      throw new Error('AudioMixer: elemento deve ser HTMLVideoElement');
    }
  }

  /**
   * @private
   */
  #validateVolume(volume) {
    if (typeof volume !== 'number' || volume < 0 || volume > 1) {
      throw new Error(`AudioMixer: volume deve estar entre 0.0 e 1.0, recebido: ${volume}`);
    }
  }
}

// Exportar para uso em módulos
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AudioMixer;
}
