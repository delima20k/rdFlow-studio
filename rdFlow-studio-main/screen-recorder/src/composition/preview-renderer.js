const { CompositionEngine } = require('./composition-engine');
const { PREVIEW_UPDATE_INTERVAL_MS } = require('../models/constants');

/**
 * Responsável por renderizar preview da composição em tempo real
 */
class PreviewRenderer {
  constructor(preset) {
    this.compositionEngine = new CompositionEngine(preset);
    this.previewElement = null;
    this.isRendering = false;
    this.renderInterval = null;
    this.frameRate = 30;
  }

  /**
   * Inicializa o preview
   */
  initialize(containerElement) {
    this.compositionEngine.initialize();
    
    const canvas = this.compositionEngine.getCanvas();
    
    if (containerElement) {
      this.attachToContainer(containerElement);
    }

    return canvas;
  }

  /**
   * Anexa o canvas a um elemento do DOM
   */
  attachToContainer(containerElement) {
    const canvas = this.compositionEngine.getCanvas();
    
    // Limpa o container
    containerElement.innerHTML = '';
    
    // Ajusta o canvas para caber no container
    canvas.style.width = '100%';
    canvas.style.height = 'auto';
    canvas.style.display = 'block';
    canvas.style.backgroundColor = '#000';
    
    containerElement.appendChild(canvas);
    this.previewElement = containerElement;
  }

  /**
   * Define as fontes de vídeo
   */
  setVideoSources(screenBlob, webcamBlob) {
    // Cria elementos de vídeo a partir dos blobs
    if (screenBlob) {
      const screenVideo = this._createVideoElement(screenBlob);
      this.compositionEngine.setScreenVideo(screenVideo);
    }

    if (webcamBlob) {
      const webcamVideo = this._createVideoElement(webcamBlob);
      this.compositionEngine.setWebcamVideo(webcamVideo);
    }
  }

  /**
   * Define streams ao vivo para preview durante a gravação
   */
  setLiveStreams(screenStream, webcamStream) {
    if (screenStream) {
      const screenVideo = document.createElement('video');
      screenVideo.srcObject = screenStream;
      screenVideo.muted = true;
      screenVideo.play();
      this.compositionEngine.setScreenVideo(screenVideo);
    }

    if (webcamStream) {
      const webcamVideo = document.createElement('video');
      webcamVideo.srcObject = webcamStream;
      webcamVideo.muted = true;
      webcamVideo.play();
      this.compositionEngine.setWebcamVideo(webcamVideo);
    }
  }

  /**
   * Cria elemento de vídeo a partir de um blob
   */
  _createVideoElement(blob) {
    const video = document.createElement('video');
    video.src = URL.createObjectURL(blob);
    video.muted = true;
    video.loop = true;
    
    // Carrega o vídeo
    video.load();
    
    return video;
  }

  /**
   * Inicia a renderização do preview
   */
  startRendering(fps = 30) {
    if (this.isRendering) {
      return;
    }

    this.frameRate = fps;
    this.isRendering = true;

    const intervalMs = 1000 / fps;

    this.renderInterval = setInterval(() => {
      this._renderFrame();
    }, intervalMs);
  }

  /**
   * Para a renderização do preview
   */
  stopRendering() {
    if (!this.isRendering) {
      return;
    }

    this.isRendering = false;

    if (this.renderInterval) {
      clearInterval(this.renderInterval);
      this.renderInterval = null;
    }
  }

  /**
   * Renderiza um único frame
   */
  _renderFrame() {
    try {
      this.compositionEngine.renderFrame();
    } catch (error) {
      console.error('Erro ao renderizar frame:', error);
    }
  }

  /**
   * Renderiza um frame manualmente
   */
  renderSingleFrame() {
    this._renderFrame();
  }

  /**
   * Atualiza o preset de layout
   */
  updatePreset(preset) {
    this.compositionEngine.setPreset(preset);
    
    if (this.previewElement) {
      this.attachToContainer(this.previewElement);
    }
  }

  /**
   * Captura uma screenshot do preview atual
   */
  captureScreenshot(format = 'image/png', quality = 0.92) {
    const canvas = this.compositionEngine.getCanvas();
    return canvas.toDataURL(format, quality);
  }

  /**
   * Retorna o canvas
   */
  getCanvas() {
    return this.compositionEngine.getCanvas();
  }

  /**
   * Retorna o stream do canvas
   */
  getCaptureStream(frameRate) {
    return this.compositionEngine.getCaptureStream(frameRate || this.frameRate);
  }

  /**
   * Verifica se está renderizando
   */
  getIsRendering() {
    return this.isRendering;
  }

  /**
   * Libera recursos
   */
  dispose() {
    this.stopRendering();
    this.compositionEngine.dispose();
    
    if (this.previewElement) {
      this.previewElement.innerHTML = '';
      this.previewElement = null;
    }
  }
}

module.exports = { PreviewRenderer };
