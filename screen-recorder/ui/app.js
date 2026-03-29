import { 
  ScreenRecorder as ScreenRecorderModule,
  RecordingConfig,
  VideoFormatType,
  LayoutType,
  ExportQuality,
  WebcamPosition
} from '../src/index.js';

/**
 * Aplicação principal - Integra UI com o módulo Screen Recorder
 */
class ScreenRecorderApp {
  constructor() {
    this.recorder = null;
    this.isRecording = false;
    this.recordingStartTime = null;
    this.durationInterval = null;

    this.initializeElements();
    this.attachEventListeners();
    this.loadSavedSettings();
  }

  /**
   * Inicializa referências aos elementos do DOM
   */
  initializeElements() {
    // Selects
    this.formatSelect = document.getElementById('format-select');
    this.layoutSelect = document.getElementById('layout-select');
    this.qualitySelect = document.getElementById('quality-select');
    this.fpsSelect = document.getElementById('fps-select');

    // Checkboxes
    this.webcamEnabledCheck = document.getElementById('webcam-enabled');
    this.microphoneEnabledCheck = document.getElementById('microphone-enabled');
    this.systemAudioEnabledCheck = document.getElementById('system-audio-enabled');

    // Input
    this.projectNameInput = document.getElementById('project-name');

    // Containers
    this.previewContainer = document.getElementById('preview-container');
    this.devicesInfo = document.getElementById('devices-info');

    // Botões
    this.btnInit = document.getElementById('btn-init');
    this.btnStart = document.getElementById('btn-start');
    this.btnStop = document.getElementById('btn-stop');
    this.btnExport = document.getElementById('btn-export');

    // Status
    this.statusText = document.getElementById('status-text');
    this.durationText = document.getElementById('duration-text');

    // Progress
    this.exportProgressContainer = document.getElementById('export-progress-container');
    this.exportProgressBar = document.getElementById('export-progress-bar');
    this.exportProgressText = document.getElementById('export-progress-text');
  }

  /**
   * Anexa event listeners
   */
  attachEventListeners() {
    this.btnInit.addEventListener('click', () => this.handleInitialize());
    this.btnStart.addEventListener('click', () => this.handleStartRecording());
    this.btnStop.addEventListener('click', () => this.handleStopRecording());
    this.btnExport.addEventListener('click', () => this.handleExport());

    // Atualiza layout options quando formato muda
    this.formatSelect.addEventListener('change', () => this.updateLayoutOptions());
  }

  /**
   * Carrega configurações salvas
   */
  loadSavedSettings() {
    const settings = this.recorder?.projectSettings || 
                     new (require('../src/utils/project-settings').ProjectSettings)();
    
    const lastConfig = settings.loadLastConfig();

    if (lastConfig.formatType) {
      this.formatSelect.value = lastConfig.formatType;
    }

    if (lastConfig.layoutType) {
      this.layoutSelect.value = lastConfig.layoutType;
    }

    if (lastConfig.quality) {
      this.qualitySelect.value = lastConfig.quality;
    }

    if (lastConfig.fps) {
      this.fpsSelect.value = lastConfig.fps;
    }

    this.webcamEnabledCheck.checked = lastConfig.webcamEnabled !== false;
    this.microphoneEnabledCheck.checked = lastConfig.microphoneEnabled !== false;
    this.systemAudioEnabledCheck.checked = lastConfig.systemAudioEnabled === true;
  }

  /**
   * Atualiza opções de layout baseado no formato
   */
  updateLayoutOptions() {
    const format = this.formatSelect.value;
    
    // Remove opções antigas
    this.layoutSelect.innerHTML = '';

    if (format === 'YOUTUBE') {
      this.layoutSelect.innerHTML = `
        <option value="SCREEN_PLUS_WEBCAM_CORNER">Tela + Webcam (Canto)</option>
        <option value="SCREEN_ONLY">Apenas Tela</option>
      `;
    } else if (format === 'TIKTOK' || format === 'SHORTS') {
      this.layoutSelect.innerHTML = `
        <option value="SCREEN_PLUS_WEBCAM_TOP">Tela + Webcam (Topo)</option>
        <option value="SCREEN_ONLY">Apenas Tela</option>
        <option value="WEBCAM_ONLY">Apenas Webcam</option>
      `;
    }
  }

  /**
   * Cria configuração a partir dos inputs
   */
  createConfig() {
    return new RecordingConfig({
      formatType: VideoFormatType[this.formatSelect.value],
      layoutType: LayoutType[this.layoutSelect.value],
      quality: ExportQuality[this.qualitySelect.value],
      webcamEnabled: this.webcamEnabledCheck.checked,
      webcamPosition: WebcamPosition.TOP_RIGHT,
      microphoneEnabled: this.microphoneEnabledCheck.checked,
      systemAudioEnabled: this.systemAudioEnabledCheck.checked,
      fps: parseInt(this.fpsSelect.value, 10),
      outputDirectory: './recordings',
      projectName: this.projectNameInput.value.trim() || 'untitled'
    });
  }

  /**
   * Handler: Inicializar
   */
  async handleInitialize() {
    try {
      this.setStatus('Inicializando...', 'info');
      this.btnInit.disabled = true;

      // Cria nova instância do recorder
      this.recorder = new ScreenRecorderModule();

      // Cria configuração
      const config = this.createConfig();

      // Inicializa
      await this.recorder.initialize(config);

      // Lista dispositivos
      const devices = await this.recorder.listDevices();
      this.displayDevices(devices);

      // Inicializa preview
      this.recorder.initializePreview(this.previewContainer);

      // Inicia sessão
      await this.recorder.startSession();

      this.setStatus('Pronto para gravar', 'success');
      this.btnStart.disabled = false;
      this.btnInit.disabled = false;

    } catch (error) {
      console.error('Erro ao inicializar:', error);
      this.setStatus(`Erro: ${error.message}`, 'error');
      this.btnInit.disabled = false;
      alert(`Erro ao inicializar: ${error.message}`);
    }
  }

  /**
   * Handler: Iniciar Gravação
   */
  async handleStartRecording() {
    try {
      this.setStatus('Iniciando gravação...', 'info');
      this.btnStart.disabled = true;

      await this.recorder.startRecording();

      this.isRecording = true;
      this.recordingStartTime = Date.now();
      this.startDurationCounter();

      this.setStatus('Gravando...', 'recording');
      this.btnStop.disabled = false;
      this.btnInit.disabled = true;

    } catch (error) {
      console.error('Erro ao iniciar gravação:', error);
      this.setStatus(`Erro: ${error.message}`, 'error');
      this.btnStart.disabled = false;
      alert(`Erro ao iniciar gravação: ${error.message}`);
    }
  }

  /**
   * Handler: Parar Gravação
   */
  async handleStopRecording() {
    try {
      this.setStatus('Parando gravação...', 'info');
      this.btnStop.disabled = true;

      await this.recorder.stopRecording();

      this.isRecording = false;
      this.stopDurationCounter();

      this.setStatus('Gravação concluída. Pronto para exportar.', 'success');
      this.btnExport.disabled = false;
      this.btnInit.disabled = false;

    } catch (error) {
      console.error('Erro ao parar gravação:', error);
      this.setStatus(`Erro: ${error.message}`, 'error');
      this.btnStop.disabled = false;
      alert(`Erro ao parar gravação: ${error.message}`);
    }
  }

  /**
   * Handler: Exportar
   */
  async handleExport() {
    try {
      this.setStatus('Exportando vídeo...', 'info');
      this.btnExport.disabled = true;
      this.showExportProgress();

      // Inicia exportação
      const result = await this.recorder.export({
        autoDownload: true
      });

      if (result.success) {
        this.setStatus('Vídeo exportado com sucesso!', 'success');
        this.hideExportProgress();
        
        alert(`Vídeo exportado: ${result.fileName}`);
      } else {
        throw new Error(result.error);
      }

    } catch (error) {
      console.error('Erro ao exportar:', error);
      this.setStatus(`Erro: ${error.message}`, 'error');
      this.hideExportProgress();
      alert(`Erro ao exportar: ${error.message}`);
    } finally {
      this.btnExport.disabled = false;
    }
  }

  /**
   * Exibe dispositivos disponíveis
   */
  displayDevices(devices) {
    const webcamCount = devices.webcams?.length || 0;
    const micCount = devices.microphones?.length || 0;

    this.devicesInfo.innerHTML = `
      <p><strong>Webcams encontradas:</strong> ${webcamCount}</p>
      <p><strong>Microfones encontrados:</strong> ${micCount}</p>
      ${webcamCount > 0 ? `<p style="font-size: 0.85rem; color: #94a3b8;">Primeira webcam será usada automaticamente</p>` : ''}
    `;
  }

  /**
   * Define status
   */
  setStatus(message, type = 'info') {
    this.statusText.textContent = `Status: ${message}`;

    const colors = {
      info: '#3b82f6',
      success: '#10b981',
      error: '#ef4444',
      recording: '#f59e0b'
    };

    this.statusText.style.color = colors[type] || colors.info;
  }

  /**
   * Inicia contador de duração
   */
  startDurationCounter() {
    this.durationInterval = setInterval(() => {
      const elapsed = Date.now() - this.recordingStartTime;
      const seconds = Math.floor(elapsed / 1000);
      const minutes = Math.floor(seconds / 60);
      const secs = seconds % 60;

      this.durationText.textContent = `Duração: ${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }, 1000);
  }

  /**
   * Para contador de duração
   */
  stopDurationCounter() {
    if (this.durationInterval) {
      clearInterval(this.durationInterval);
      this.durationInterval = null;
    }
  }

  /**
   * Mostra progresso de exportação
   */
  showExportProgress() {
    this.exportProgressContainer.style.display = 'block';
    this.updateExportProgress(0);

    // Simula progresso (em produção, viria do ExportManager)
    let progress = 0;
    const progressInterval = setInterval(() => {
      progress += 10;
      this.updateExportProgress(progress);

      if (progress >= 100) {
        clearInterval(progressInterval);
      }
    }, 200);
  }

  /**
   * Atualiza progresso de exportação
   */
  updateExportProgress(percentage) {
    this.exportProgressBar.style.width = `${percentage}%`;
    this.exportProgressText.textContent = `${percentage}%`;
  }

  /**
   * Esconde progresso de exportação
   */
  hideExportProgress() {
    this.exportProgressContainer.style.display = 'none';
  }
}

// Inicializa aplicação quando DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
  new ScreenRecorderApp();
});
