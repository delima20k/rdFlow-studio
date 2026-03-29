/**
 * Exemplo de integração completa do Screen Recorder
 * Demonstra uso de todas as funcionalidades
 */

import { 
  ScreenRecorder,
  RecordingConfig,
  VideoFormatType,
  LayoutType,
  ExportQuality,
  WebcamPosition,
  BackgroundMode,
  PresetFactory,
  CaptureManager
} from './src/index.js';

// ====================================
// EXEMPLO 1: Uso Básico
// ====================================

async function exemploBasico() {
  console.log('=== Exemplo Básico ===');

  // Criar configuração
  const config = new RecordingConfig({
    formatType: VideoFormatType.YOUTUBE,
    layoutType: LayoutType.SCREEN_PLUS_WEBCAM_CORNER,
    quality: ExportQuality.HIGH,
    webcamEnabled: true,
    microphoneEnabled: true,
    fps: 30,
    projectName: 'video_exemplo'
  });

  // Validar configuração
  const validation = config.validate();
  if (!validation.isValid) {
    console.error('Configuração inválida:', validation.errors);
    return;
  }

  // Criar recorder
  const recorder = new ScreenRecorder();

  try {
    // Inicializar
    await recorder.initialize(config);
    console.log('✓ Recorder inicializado');

    // Listar dispositivos
    const devices = await recorder.listDevices();
    console.log('✓ Dispositivos:', devices);

    // Inicializar preview (opcional)
    const previewContainer = document.getElementById('preview');
    if (previewContainer) {
      recorder.initializePreview(previewContainer);
      console.log('✓ Preview inicializado');
    }

    // Iniciar sessão
    await recorder.startSession();
    console.log('✓ Sessão iniciada');

    // Iniciar gravação
    await recorder.startRecording();
    console.log('✓ Gravação iniciada');

    // Simula gravação de 5 segundos
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Parar gravação
    await recorder.stopRecording();
    console.log('✓ Gravação parada');

    // Exportar
    const result = await recorder.export();
    console.log('✓ Vídeo exportado:', result.fileName);

  } catch (error) {
    console.error('Erro:', error);
  } finally {
    // Limpar recursos
    recorder.dispose();
  }
}

// ====================================
// EXEMPLO 2: Gravação para TikTok
// ====================================

async function exemploTikTok() {
  console.log('=== Exemplo TikTok ===');

  const config = new RecordingConfig({
    formatType: VideoFormatType.TIKTOK,
    layoutType: LayoutType.SCREEN_PLUS_WEBCAM_TOP,
    quality: ExportQuality.HIGH,
    webcamEnabled: true,
    microphoneEnabled: true,
    systemAudioEnabled: false,
    fps: 30,
    projectName: 'tiktok_video'
  });

  const recorder = new ScreenRecorder();

  try {
    await recorder.initialize(config);
    await recorder.startSession();
    
    console.log('Gravando para TikTok formato vertical 9:16...');
    await recorder.startRecording();

    // Grava por 10 segundos
    await new Promise(resolve => setTimeout(resolve, 10000));

    await recorder.stopRecording();
    const result = await recorder.export();

    console.log('Vídeo TikTok exportado:', result.fileName);
  } catch (error) {
    console.error('Erro:', error);
  } finally {
    recorder.dispose();
  }
}

// ====================================
// EXEMPLO 3: Composição Avançada
// ====================================

async function exemploAvancado() {
  console.log('=== Exemplo Avançado ===');

  // Criar preset personalizado
  const preset = PresetFactory.createPreset(
    VideoFormatType.YOUTUBE,
    LayoutType.SCREEN_PLUS_WEBCAM_CORNER,
    {
      webcamPosition: WebcamPosition.BOTTOM_RIGHT,
      backgroundMode: BackgroundMode.GRADIENT
    }
  );

  console.log('Preset criado:', preset.getInfo());

  // Usar CaptureManager diretamente
  const captureManager = new CaptureManager();

  const config = new RecordingConfig({
    formatType: VideoFormatType.YOUTUBE,
    layoutType: LayoutType.SCREEN_PLUS_WEBCAM_CORNER,
    quality: ExportQuality.ULTRA,
    webcamEnabled: true,
    microphoneEnabled: true,
    systemAudioEnabled: true,
    fps: 60,
    projectName: 'video_premium'
  });

  try {
    // Listar dispositivos primeiro
    const devices = await captureManager.listDevices();
    console.log('Webcams disponíveis:', devices.webcams.length);
    console.log('Microfones disponíveis:', devices.microphones.length);

    // Iniciar sessão
    await captureManager.startSession(config);
    await captureManager.startRecording();

    // Monitorar status
    setInterval(() => {
      const status = captureManager.getStatus();
      console.log('Status:', status);
    }, 1000);

    // Grava por 15 segundos
    await new Promise(resolve => setTimeout(resolve, 15000));

    const result = await captureManager.stopRecording();
    console.log('Sessão completa:', result.session.toJSON());

  } catch (error) {
    console.error('Erro:', error);
  } finally {
    captureManager.dispose();
  }
}

// ====================================
// EXEMPLO 4: Monitoramento de Progresso
// ====================================

async function exemploComProgresso() {
  console.log('=== Exemplo com Progresso ===');

  const config = new RecordingConfig({
    formatType: VideoFormatType.YOUTUBE,
    layoutType: LayoutType.SCREEN_ONLY,
    quality: ExportQuality.HIGH,
    webcamEnabled: false,
    microphoneEnabled: true,
    fps: 30,
    projectName: 'screencast'
  });

  const recorder = new ScreenRecorder();

  try {
    await recorder.initialize(config);
    await recorder.startSession();
    await recorder.startRecording();

    // Monitorar duração
    const durationTimer = setInterval(() => {
      const status = recorder.getStatus();
      const duration = status.capture.durationInSeconds || 0;
      
      console.log(`Gravando: ${duration}s`);

      if (duration >= 10) {
        clearInterval(durationTimer);
      }
    }, 1000);

    // Espera terminar
    await new Promise(resolve => setTimeout(resolve, 10000));
    clearInterval(durationTimer);

    await recorder.stopRecording();

    // Exportar com monitoramento
    console.log('Iniciando exportação...');
    const exportResult = await recorder.export();

    if (exportResult.success) {
      console.log('Exportação concluída!');
      console.log('Arquivo:', exportResult.fileName);
      console.log('URL:', exportResult.url);
    }

  } catch (error) {
    console.error('Erro:', error);
  } finally {
    recorder.dispose();
  }
}

// ====================================
// EXEMPLO 5: Configurações Persistentes
// ====================================

function exemploConfiguracoes() {
  console.log('=== Exemplo Configurações ===');

  const { ProjectSettings } = require('./src/utils/project-settings.js');
  const settings = new ProjectSettings();

  // Salvar preferências
  settings.set('lastFormatType', 'YOUTUBE');
  settings.set('lastQuality', 'HIGH');
  settings.setDevicePreferences('webcam-id-123', 'mic-id-456');

  // Adicionar projeto recente
  settings.addRecentProject({
    id: 'proj-001',
    name: 'Meu Tutorial',
    formatType: 'YOUTUBE',
    createdAt: new Date().toISOString(),
    thumbnail: 'thumbnail.jpg'
  });

  // Carregar última configuração
  const lastConfig = settings.loadLastConfig();
  console.log('Última configuração:', lastConfig);

  // Projetos recentes
  const recentes = settings.getRecentProjects();
  console.log('Projetos recentes:', recentes);

  // Exportar configurações
  const exportedSettings = settings.export();
  console.log('Configurações exportadas:', exportedSettings);

  // Resetar
  // settings.reset();
}

// ====================================
// Executar exemplos
// ====================================

// Descomentar para executar:
// exemploBasico();
// exemploTikTok();
// exemploAvancado();
// exemploComProgresso();
// exemploConfiguracoes();

export {
  exemploBasico,
  exemploTikTok,
  exemploAvancado,
  exemploComProgresso,
  exemploConfiguracoes
};
