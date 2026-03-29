/**
 * Exemplo de Integração - Sistema de Exportação de Vídeo
 * 
 * Demonstra como usar o sistema completo de exportação para gerar
 * vídeos 1080x1920 (9:16) compatíveis com Android, WhatsApp, TikTok.
 * 
 * @author DELIMA
 * @version 2.0.0
 */

// ==========================================
// EXEMPLO 1: EXPORTAÇÃO AUTOMÁTICA (RECOMENDADO)
// ==========================================

/**
 * Método mais simples: usa ExportOrchestrator para gerenciar tudo
 */
async function exportWithOrchestrator() {
  console.log('🎬 === EXPORTAÇÃO AUTOMÁTICA ===');

  // 1. Criar orquestrador
  const orchestrator = new ExportOrchestrator();

  // 2. Configurar callbacks de progresso
  orchestrator.on('progress', ({percentage, message}) => {
    console.log(`[${percentage.toFixed(1)}%] ${message}`);
    
    // Atualizar UI (exemplo)
    updateProgressBar(percentage);
    updateStatusText(message);
  });

  orchestrator.on('complete', (result) => {
    console.log('✅ Exportação concluída!', result.metadata);
    showSuccessMessage(`Vídeo exportado: ${result.metadata.filename}`);
  });

  orchestrator.on('error', (error) => {
    console.error('❌ Erro na exportação:', error);
    showErrorDialog(error.message);
  });

  // 3. Capturar estado do editor
  const editorState = orchestrator.captureEditorState();

  // 4. Executar exportação completa
  const result = await orchestrator.export(editorState);

  // 5. Verificar resultado
  if (result.success) {
    console.log('📦 Metadados:', result.metadata);
    console.log('✅ Validação:', result.validation);
    // Download já foi feito automaticamente
  } else {
    console.error('❌ Falha:', result.error);
  }

  return result;
}

// ==========================================
// EXEMPLO 2: EXPORTAÇÃO MANUAL (AVANÇADO)
// ==========================================

/**
 * Método avançado: controle total sobre cada etapa
 */
async function exportManualMode() {
  console.log('🔧 === EXPORTAÇÃO MANUAL ===');

  try {
    // 1. Criar configuração personalizada
    const config = new ExportConfig({
      width: 1080,
      height: 1920,
      fps: 30,
      videoCodec: ExportConfig.VIDEO_CODECS.H264,
      audioCodec: ExportConfig.AUDIO_CODECS.AAC,
      videoBitrate: '8M',
      audioBitrate: '128k',
      fitMode: ExportConfig.FIT_MODES.COVER,
      backgroundColor: '#000000'
    });

    // 2. Criar engines
    const fitEngine = new VideoFitEngine(config);
    const renderer = new TimelineRenderer(config, fitEngine);
    const mixer = new AudioMixer(config);
    const exporter = new Mp4Exporter(config);
    const validator = new ExportValidator(config);

    // 3. Definir estado da timeline
    const mainVideo = document.querySelector('#main-video');
    const webcam = document.querySelector('#webcam-video');

    renderer.setTimelineState({
      mainVideo: {
        element: mainVideo,
        position: 'center',
        scale: 1.0
      },
      webcam: webcam ? {
        element: webcam,
        x: 50,
        y: 1600,
        width: 200,
        height: 200,
        visible: true
      } : null,
      overlays: [
        {
          type: 'emoji',
          content: '🎥',
          x: 100,
          y: 100,
          fontSize: 64
        }
      ]
    });

    // 4. Preparar áudio
    mixer.addAudioSource(mainVideo, 'main');
    if (webcam) {
      mixer.addAudioSource(webcam, 'webcam');
    }
    mixer.synchronize(mainVideo);
    const audioTrack = mixer.getAudioTrack();

    // 5. Iniciar gravação
    const canvas = renderer.getCanvas();
    await exporter.start(canvas, audioTrack);

    // 6. Renderizar frames
    const duration = mainVideo.duration;
    const fps = config.fps;
    const frameTime = 1 / fps;
    const totalFrames = Math.ceil(duration * fps);

    for (let time = 0, frame = 0; time < duration; time += frameTime, frame++) {
      renderer.renderFrame(time);
      
      if (frame % 30 === 0) {
        console.log(`Frame ${frame}/${totalFrames}`);
      }
    }

    // 7. Finalizar exportação
    const blob = await exporter.stop();
    console.log(`✅ Exportado: ${(blob.size / 1024 / 1024).toFixed(2)} MB`);

    // 8. Validar
    const validationResult = await validator.validate(blob, duration);
    console.log(validator.getValidationReport());

    if (!validationResult.valid) {
      throw new Error('Validação falhou:\n' + validationResult.errors.join('\n'));
    }

    // 9. Download
    Mp4Exporter.downloadFile(blob, 'video_manual_export.mp4');

    // 10. Limpar
    mixer.dispose();
    exporter.dispose();

    console.log('✅ Exportação manual concluída!');

  } catch (error) {
    console.error('❌ Erro:', error);
  }
}

// ==========================================
// EXEMPLO 3: TESTAR CODECS SUPORTADOS
// ==========================================

/**
 * Verifica quais codecs o browser suporta
 */
function checkCodecSupport() {
  console.log('🔍 === VERIFICAÇÃO DE CODECS ===\n');

  const codecs = {
    'MP4 (H.264 + AAC)': 'video/mp4; codecs="avc1.42E01E,mp4a.40.2"',
    'WebM (VP9 + Opus)': 'video/webm; codecs="vp9,opus"',
    'WebM (VP8 + Opus)': 'video/webm; codecs="vp8,opus"',
    'WebM (genérico)': 'video/webm'
  };

  console.log('Codecs suportados por MediaRecorder:\n');

  for (const [nome, mimeType] of Object.entries(codecs)) {
    const supported = MediaRecorder.isTypeSupported(mimeType);
    const icon = supported ? '✅' : '❌';
    console.log(`${icon} ${nome}`);
    if (supported) {
      console.log(`   ${mimeType}`);
    }
  }

  console.log('\nMelhor codec disponível:');
  const bestCodec = Mp4Exporter.detectBestMimeType();
  console.log(`✨ ${bestCodec}`);
}

// ==========================================
// EXEMPLO 4: DEMONSTRAÇÃO DE CÁLCULOS DO VideoFitEngine
// ==========================================

/**
 * Demonstra como VideoFitEngine calcula transformações
 */
function demonstrateCropCalculation() {
  console.log('📐 === CÁLCULOS DO VIDEO FIT ENGINE ===\n');

  const config = ExportConfig.createDefault(); // 1080x1920
  const engine = new VideoFitEngine(config);

  // Cenário 1: Vídeo horizontal (16:9)
  console.log('Cenário 1: Vídeo 1920x1080 (horizontal) → 1080x1920 (vertical)');
  const fit1 = engine.calculateFit(1920, 1080, 'center');
  console.log('  Scale:', fit1.scale);
  console.log('  Scaled:', `${fit1.scaledWidth}x${fit1.scaledHeight}`);
  console.log('  Offset:', `X=${fit1.offsetX}, Y=${fit1.offsetY}`);
  console.log('  Crop:', `${fit1.cropWidth}x${fit1.cropHeight} @ ${fit1.cropX},${fit1.cropY}\n`);

  // Cenário 2: Vídeo já vertical (9:16)
  console.log('Cenário 2: Vídeo 1080x1920 (vertical) → 1080x1920 (vertical)');
  const fit2 = engine.calculateFit(1080, 1920, 'center');
  console.log('  Scale:', fit2.scale);
  console.log('  Scaled:', `${fit2.scaledWidth}x${fit2.scaledHeight}`);
  console.log('  Offset:', `X=${fit2.offsetX}, Y=${fit2.offsetY}`);
  console.log('  Crop:', `${fit2.cropWidth}x${fit2.cropHeight} @ ${fit2.cropX},${fit2.cropY}\n`);

  // Cenário 3: Vídeo quadrado
  console.log('Cenário 3: Vídeo 1080x1080 (quadrado) → 1080x1920 (vertical)');
  const fit3 = engine.calculateFit(1080, 1080, 'center');
  console.log('  Scale:', fit3.scale);
  console.log('  Scaled:', `${fit3.scaledWidth}x${fit3.scaledHeight}`);
  console.log('  Offset:', `X=${fit3.offsetX}, Y=${fit3.offsetY}`);
  console.log('  Crop:', `${fit3.cropWidth}x${fit3.cropHeight} @ ${fit3.cropX},${fit3.cropY}\n`);
}

// ==========================================
// FUNÇÕES AUXILIARES DE UI
// ==========================================

/**
 * Atualiza barra de progresso
 * @param {number} percentage - Percentual (0-100)
 */
function updateProgressBar(percentage) {
  const progressBar = document.querySelector('#export-progress');
  if (progressBar) {
    progressBar.value = percentage;
    progressBar.textContent = `${percentage.toFixed(1)}%`;
  }
}

/**
 * Atualiza texto de status
 * @param {string} message - Mensagem de status
 */
function updateStatusText(message) {
  const statusText = document.querySelector('#export-status');
  if (statusText) {
    statusText.textContent = message;
  }
}

/**
 * Exibe mensagem de sucesso
 * @param {string} message - Mensagem
 */
function showSuccessMessage(message) {
  console.log(`✅ ${message}`);
  alert(`✅ ${message}`);
}

/**
 * Exibe diálogo de erro
 * @param {string} error - Mensagem de erro
 */
function showErrorDialog(error) {
  console.error(`❌ ${error}`);
  alert(`❌ Erro: ${error}`);
}

// ==========================================
// EXPORTAR FUNÇÕES PARA USO GLOBAL
// ==========================================

// Tornar funções acessíveis globalmente (para testes no console)
if (typeof window !== 'undefined') {
  window.ExportExamples = {
    exportWithOrchestrator,
    exportManualMode,
    checkCodecSupport,
    demonstrateCropCalculation
  };
}

// Log de inicialização
console.log('📚 Exemplos de exportação carregados. Use:');
console.log('  - ExportExamples.exportWithOrchestrator()');
console.log('  - ExportExamples.exportManualMode()');
console.log('  - ExportExamples.checkCodecSupport()');
console.log('  - ExportExamples.demonstrateCropCalculation()');

/**
 * Exemplo 2: Exportação Completa (Vídeo + Webcam + Overlays)
 */
async function exportCompleteVideo() {
  console.log('=== Exportação Completa ===');

  // 1. Configuração
  const config = ExportConfig.createPreset('vertical-hd');
  const fitEngine = new VideoFitEngine(config);
  const renderer = new TimelineRenderer(config, fitEngine);
  const mixer = new AudioMixer(config);

  // 2. Elementos de mídia
  const mainVideoElement = document.querySelector('#main-video');
  const webcamElement = document.querySelector('#webcam-video');

  // 3. Estado completo da timeline
  renderer.setTimelineState({
    mainVideo: {
      element: mainVideoElement,
      position: 'center',
      scale: 1.0
    },
    webcam: {
      element: webcamElement,
      x: 50,                    // Posição X no canvas
      y: 50,                    // Posição Y no canvas
      width: 300,               // Largura da webcam
      height: 300,              // Altura da webcam
      visible: true,
      borderWidth: 4,           // Borda opcional
      borderColor: '#00ff00'
    },
    overlays: [
      {
        type: 'text',
        content: 'Tutorial de Edição',
        x: 540,                 // Centro horizontal (1080/2)
        y: 100,
        fontSize: 64,
        fontWeight: 'bold',
        color: '#ffffff',
        align: 'center',
        shadow: true,
        shadowColor: 'rgba(0, 0, 0, 0.8)',
        shadowBlur: 6
      },
      {
        type: 'emoji',
        content: '🎬',
        x: 100,
        y: 1700,
        fontSize: 72,
        shadow: true
      }
    ]
  });

  // 4. Adicionar múltiplas fontes de áudio
  const mainAudioId = mixer.addAudioSource(mainVideoElement, 'main');
  const webcamAudioId = mixer.addAudioSource(webcamElement, 'webcam');

  // Ajustar volumes
  mixer.setVolume(mainAudioId, 0.8);   // 80% volume do vídeo principal
  mixer.setVolume(webcamAudioId, 0.6); // 60% volume da webcam

  // 5. Renderização frame por frame
  const duration = Math.max(mainVideoElement.duration, webcamElement.duration);
  const fps = config.fps;
  const frameTime = 1 / fps;
  const totalFrames = Math.ceil(duration * fps);

  console.log(`Total de frames: ${totalFrames}`);
  console.log(`FPS: ${fps}`);
  console.log(`Duração: ${duration.toFixed(2)}s`);

  for (let time = 0; time < duration; time += frameTime) {
    const frameData = renderer.renderFrame(time);
    
    // Enviar para Mp4Exporter
    // await mp4Exporter.addFrame(frameData);

    // Atualizar progresso a cada 1 segundo
    if (Math.floor(time * fps) % fps === 0) {
      const progress = ((time / duration) * 100).toFixed(1);
      const currentFrame = Math.floor(time * fps);
      console.log(`Frame ${currentFrame}/${totalFrames} (${progress}%)`);
    }
  }

  // 6. Mixar e exportar áudio
  mixer.synchronize(mainVideoElement);
  const mixedAudio = await mixer.mix();
  const aacBlob = await mixer.exportAAC();

  console.log(`Áudio mixado: ${aacBlob.size} bytes`);

  // 7. Listar fontes ativas
  const activeSources = mixer.getActiveSources();
  console.log('Fontes de áudio:', activeSources);

  // 8. Limpar
  mixer.dispose();

  console.log('Exportação completa finalizada!');
}

/**
 * Exemplo 3: Teste de VideoFitEngine Isolado
 */
function testVideoFitEngine() {
  console.log('=== Teste VideoFitEngine ===');

  const config = ExportConfig.createDefault();
  const fitEngine = new VideoFitEngine(config);

  // Testar vídeo horizontal (16:9) em canvas vertical (9:16)
  const videoWidth = 1920;
  const videoHeight = 1080;

  console.log('\nVídeo horizontal 1920x1080 → Canvas 1080x1920');

  // Posição: center
  const fitCenter = fitEngine.calculateFit(videoWidth, videoHeight, 'center');
  console.log('Center:', fitCenter);
  console.log(`  Scale: ${fitCenter.scale.toFixed(3)}`);
  console.log(`  Scaled: ${fitCenter.scaledWidth}x${fitCenter.scaledHeight}`);
  console.log(`  Offset: (${fitCenter.offsetX}, ${fitCenter.offsetY})`);

  // Posição: top
  const fitTop = fitEngine.calculateFit(videoWidth, videoHeight, 'top');
  console.log('\nTop:', {
    offsetY: fitTop.offsetY,
    scale: fitTop.scale
  });

  // Posição: bottom
  const fitBottom = fitEngine.calculateFit(videoWidth, videoHeight, 'bottom');
  console.log('\nBottom:', {
    offsetY: fitBottom.offsetY,
    scale: fitBottom.scale
  });

  // CSS Transform
  const cssTransform = fitEngine.getTransformCSS(videoWidth, videoHeight, 'center');
  console.log('\nCSS Transform:', cssTransform);
}

/**
 * Exemplo 4: Teste de AudioMixer Isolado
 */
async function testAudioMixer() {
  console.log('=== Teste AudioMixer ===');

  const config = ExportConfig.createDefault();
  const mixer = new AudioMixer(config);

  // Adicionar fonte de áudio
  const audioElement = document.querySelector('#main-video');
  const sourceId = mixer.addAudioSource(audioElement, 'main');

  console.log(`Fonte adicionada: ${sourceId}`);

  // Ajustar volume
  mixer.setVolume(sourceId, 0.7);
  console.log('Volume ajustado para 70%');

  // Listar fontes ativas
  const sources = mixer.getActiveSources();
  console.log('Fontes ativas:', sources);

  // Obter track de áudio
  const track = mixer.getAudioTrack();
  console.log('Audio track:', track);

  // Limpar
  mixer.dispose();
  console.log('AudioMixer descartado');
}

/**
 * Exemplo 5: Renderização Manual de um Frame
 */
function renderSingleFrame() {
  console.log('=== Renderização de Frame Único ===');

  const config = ExportConfig.createDefault();
  const fitEngine = new VideoFitEngine(config);
  const renderer = new TimelineRenderer(config, fitEngine);

  // Configurar timeline
  const videoElement = document.querySelector('#main-video');
  renderer.setTimelineState({
    mainVideo: {
      element: videoElement,
      position: 'center',
      scale: 1.0
    }
  });

  // Renderizar frame em t=5.0s
  const frameData = renderer.renderFrame(5.0);
  
  console.log('Frame renderizado:');
  console.log(`  Width: ${frameData.width}`);
  console.log(`  Height: ${frameData.height}`);
  console.log(`  Data length: ${frameData.data.length}`);

  // Obter canvas para visualização
  const canvas = renderer.getCanvas();
  document.body.appendChild(canvas);

  console.log('Canvas adicionado ao DOM para visualização');
}

/**
 * Exemplo 6: Cálculo de Dimensões e Crop
 */
function demonstrateCropCalculation() {
  console.log('=== Demonstração de Cálculo de Crop ===');

  const config = ExportConfig.createDefault();
  const fitEngine = new VideoFitEngine(config);

  // Cenário 1: Vídeo vertical (9:16) em canvas vertical (9:16)
  console.log('\nCenário 1: Vídeo 1080x1920 → Canvas 1080x1920');
  const fit1 = fitEngine.calculateFit(1080, 1920, 'center');
  console.log(`  Scale: ${fit1.scale} (sem escala)`);
  console.log(`  Crop: ${fit1.cropWidth}x${fit1.cropHeight}`);
  console.log(`  Sem crop necessário: ${fit1.cropWidth === 1080 && fit1.cropHeight === 1920}`);

  // Cenário 2: Vídeo horizontal (16:9) em canvas vertical (9:16)
  console.log('\nCenário 2: Vídeo 1920x1080 → Canvas 1080x1920');
  const fit2 = fitEngine.calculateFit(1920, 1080, 'center');
  console.log(`  Scale: ${fit2.scale.toFixed(3)} (aumenta)`);
  console.log(`  Scaled: ${Math.round(fit2.scaledWidth)}x${Math.round(fit2.scaledHeight)}`);
  console.log(`  Crop necessário nas laterais`);

  // Cenário 3: Vídeo quadrado (1:1) em canvas vertical (9:16)
  console.log('\nCenário 3: Vídeo 1080x1080 → Canvas 1080x1920');
  const fit3 = fitEngine.calculateFit(1080, 1080, 'center');
  console.log(`  Scale: ${fit3.scale.toFixed(3)}`);
  console.log(`  Scaled: ${Math.round(fit3.scaledWidth)}x${Math.round(fit3.scaledHeight)}`);
  console.log(`  Preenche altura, sem crop`);
}

// ===================================
// EXECUTAR EXEMPLOS
// ===================================

// Descomentar para executar:
// testVideoFitEngine();
// testAudioMixer();
// demonstrateCropCalculation();
// renderSingleFrame();
// exportSimpleVideo();
// exportCompleteVideo();

console.log('Exemplos de integração carregados. Execute as funções manualmente.');
