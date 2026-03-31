/**
 * VideoConverterService
 * Responsável por converter vídeos WebM para MP4 usando FFmpeg.wasm
 */

class VideoConverterService {
  constructor() {
    this.ffmpeg = null;
    this.isLoading = false;
    this.isLoaded = false;
    this.ffmpegScriptLoaded = false;
    this.isConverting = false; // Lock para evitar conversões simultâneas
  }

  getInputExtension(blob) {
    const mimeType = String(blob?.type || '').toLowerCase();
    if (mimeType.includes('mp4')) return 'mp4';
    if (mimeType.includes('webm')) return 'webm';
    return 'bin';
  }

  /**
   * Carrega o script FFmpeg.wasm dinamicamente
   */
  async loadFFmpegScript() {
    if (this.ffmpegScriptLoaded || window.FFmpeg) {
      this.ffmpegScriptLoaded = true;
      return;
    }

    console.log('[VideoConverter] Carregando script FFmpeg.wasm...');
    
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/@ffmpeg/ffmpeg@0.11.6/dist/ffmpeg.min.js';
      script.onload = () => {
        console.log('[VideoConverter] Script FFmpeg.wasm carregado');
        this.ffmpegScriptLoaded = true;
        resolve();
      };
      script.onerror = () => {
        console.error('[VideoConverter] Falha ao carregar script FFmpeg.wasm');
        reject(new Error('Falha ao carregar FFmpeg.wasm. Verifique sua conexão.'));
      };
      document.head.appendChild(script);
    });
  }

  /**
   * Aguarda FFmpeg estar disponível no window
   */
  async waitForFFmpeg() {
    console.log('[VideoConverter] Verificando disponibilidade do FFmpeg...');
    let attempts = 0;
    const maxAttempts = 50; // 5 segundos máximo
    
    while (!window.FFmpeg && attempts < maxAttempts) {
      if (attempts % 10 === 0) {
        console.log(`[VideoConverter] Aguardando... (tentativa ${attempts}/${maxAttempts})`);
      }
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    
    if (!window.FFmpeg) {
      console.error('[VideoConverter] FFmpeg não foi carregado após 5 segundos');
      throw new Error('FFmpeg.wasm não foi carregado. Verifique sua conexão com a internet.');
    }
    
    console.log('[VideoConverter] FFmpeg encontrado no window!');
  }

  /**
   * Carrega o FFmpeg.wasm (executa apenas uma vez)
   */
  async loadFFmpeg() {
    if (this.isLoaded) return;
    if (this.isLoading) {
      // Aguardar carregamento em andamento
      while (this.isLoading) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return;
    }

    try {
      this.isLoading = true;
      
      // Carregar script FFmpeg se ainda não estiver carregado
      await this.loadFFmpegScript();
      
      // Aguardar FFmpeg estar disponível
      console.log('[VideoConverter] Aguardando FFmpeg.wasm...');
      await this.waitForFFmpeg();
      
      // Importar FFmpeg.wasm
      const { createFFmpeg } = window.FFmpeg;
      
      this.ffmpeg = createFFmpeg({
        log: true, // Habilitar logs para feedback do progresso
        logger: ({ type, message }) => {
          if (type === 'fferr' && (message.includes('time=') || message.includes('frame='))) {
            // Mostrar progresso no console
            const timeMatch = message.match(/time=(\d{2}:\d{2}:\d{2})/);
            if (timeMatch) {
              console.log(`[VideoConverter] Progresso: ${timeMatch[1]}`);
            }
          }
        },
        corePath: 'https://unpkg.com/@ffmpeg/core@0.11.0/dist/ffmpeg-core.js'
      });
      
      console.log('[VideoConverter] Carregando FFmpeg core...');
      await this.ffmpeg.load();
      
      this.isLoaded = true;
      this.isLoading = false;
      
      console.log('[VideoConverter] FFmpeg carregado com sucesso');
    } catch (error) {
      this.isLoading = false;
      console.error('[VideoConverter] Erro ao carregar FFmpeg:', error);
      throw new Error('Não foi possível carregar o conversor de vídeo: ' + error.message);
    }
  }

  /**
   * Converte WebM para MP4 com opções de resolução e bitrate
   * @param {Blob} webmBlob - Blob do vídeo WebM
   * @param {Object} options - Opções de conversão
   * @returns {Promise<Blob>} - Blob do vídeo MP4 convertido
   */
  async convertWebMToMP4(webmBlob, options = {}) {
    return this.convertBlobToMP4(webmBlob, options);
  }

  /**
   * Normaliza qualquer blob de vídeo para MP4 H.264/AAC compatível com celular
   * @param {Blob} inputBlob - Blob de vídeo de entrada (WebM ou MP4 bruto)
   * @param {Object} options - Opções de conversão
   * @returns {Promise<Blob>} - Blob MP4 finalizado para entrega
   */
  async convertBlobToMP4(inputBlob, options = {}) {
    // Verificar se já há uma conversão em andamento
    if (this.isConverting) {
      throw new Error('Já existe uma conversão em andamento. Aguarde a conversão atual finalizar antes de iniciar outra.');
    }
    
    try {
      // Bloquear novas conversões
      this.isConverting = true;
      
      await this.loadFFmpeg();

      const {
        width = null,
        height = null,
        bitrate = '2M',
        format = 'youtube' // youtube, tiktok, reels, shorts, etc.
      } = options;

      const inputExt = this.getInputExtension(inputBlob);
      const inputFileName = `input.${inputExt}`;
      const outputFileName = 'output.mp4';

      // Escrever arquivo de entrada no sistema virtual do FFmpeg
      const { fetchFile } = window.FFmpeg;
      this.ffmpeg.FS('writeFile', inputFileName, await fetchFile(inputBlob));

      // Construir comando FFmpeg baseado nas opções
      const ffmpegArgs = [
        '-i', inputFileName,
        '-c:v', 'libx264',        // Codec de vídeo H.264 (compatível com todas plataformas)
        '-preset', 'ultrafast',   // OTIMIZAÇÃO: ultrafast para máxima velocidade no navegador
        '-crf', '28',             // Qualidade ajustada (28 = boa qualidade, tamanho menor)
        '-pix_fmt', 'yuv420p',    // Compatibilidade ampla com Android/iPhone/WhatsApp/Galeria
        '-profile:v', 'main',     // Perfil seguro para celulares modernos
        '-level', '4.0',          // 1080x1920@30fps
        '-vsync', 'cfr',          // CRÍTICO: Constant Frame Rate (evita duplicação)
        '-c:a', 'aac',            // Codec de áudio AAC
        '-b:a', '128k',           // Bitrate do áudio
        '-movflags', '+faststart' // Otimização para streaming
      ];

      // Adicionar bitrate de vídeo
      ffmpegArgs.push('-b:v', bitrate);

      // Aplicar resolução se especificada (SIMPLIFICADO PARA PERFORMANCE)
      if (width && height) {
        // Determinar se é formato vertical (9:16) ou horizontal (16:9)
        const isVertical = height > width;
        
        console.log(`[VideoConverter] Aplicando resolução: ${width}x${height} (${isVertical ? 'VERTICAL 9:16' : 'HORIZONTAL 16:9'})`);
        
        // Filtro simplificado para melhor performance
        // Remove setsar=1 e simplifica pad
        if (isVertical) {
          // MODO COVER: escala para cobrir TODO o frame 9:16 e corta o excesso
          // Elimina faixas pretas. O vídeo preenche 100% da tela do celular.
          ffmpegArgs.push(
            '-vf',
            `scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height}`
          );
          console.log('[VideoConverter] Filtro VERTICAL COVER aplicado (sem faixas pretas)');
        } else {
          // MODO CONTAIN: mantém proporção e adiciona barras (aceitável para horizontal)
          ffmpegArgs.push(
            '-vf', 
            `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2`
          );
          console.log('[VideoConverter] Filtro HORIZONTAL CONTAIN aplicado');
        }
        
        // Não usar -aspect (redundante e pode causar problemas com pad/scale)
      }

      // Arquivo de saída
      ffmpegArgs.push(outputFileName);

      console.log('[VideoConverter] Iniciando normalização para MP4 de entrega...');
      console.log('[VideoConverter] Argumentos:', ffmpegArgs.join(' '));
      console.log('[VideoConverter] Entrada:', inputFileName, inputBlob.type || 'video desconhecido');
      console.log('[VideoConverter] Tamanho entrada:', (inputBlob.size / 1024 / 1024).toFixed(2), 'MB');

      const conversionStart = Date.now();
      
      // Executar conversão
      await this.ffmpeg.run(...ffmpegArgs);
      
      const conversionTime = ((Date.now() - conversionStart) / 1000).toFixed(1);

      // Ler arquivo de saída
      const mp4Data = this.ffmpeg.FS('readFile', outputFileName);

      // Limpar arquivos temporários
      this.ffmpeg.FS('unlink', inputFileName);
      this.ffmpeg.FS('unlink', outputFileName);

      // Converter para Blob
      const mp4Blob = new Blob([mp4Data.buffer], { type: 'video/mp4' });

      console.log('[VideoConverter] ✅ Conversão concluída!');
      console.log('[VideoConverter] Tempo:', conversionTime + 's');
      console.log('[VideoConverter] Tamanho saída:', (mp4Blob.size / 1024 / 1024).toFixed(2), 'MB');
      console.log('[VideoConverter] Compressão:', ((1 - mp4Blob.size / inputBlob.size) * 100).toFixed(1) + '%');

      return mp4Blob;
    } catch (error) {
      console.error('[VideoConverter] Erro na conversão:', error);
      throw new Error('Falha ao converter vídeo para MP4');
    } finally {
      // Sempre liberar o lock, independente de sucesso ou erro
      this.isConverting = false;
      console.log('[VideoConverter] Lock liberado - pronto para próxima conversão');
    }
  }

  /**
   * Pré-definições de formato para plataformas populares
   */
  static PRESETS = {
    'youtube-1080p': {
      width: 1920,
      height: 1080,
      bitrate: '5M',
      format: 'youtube',
      label: 'YouTube 1920x1080 (Full HD 16:9)'
    },
    'youtube-720p': {
      width: 1280,
      height: 720,
      bitrate: '3M',
      format: 'youtube',
      label: 'YouTube 1280x720 (HD 16:9)'
    },
    'youtube-480p': {
      width: 854,
      height: 480,
      bitrate: '1.5M',
      format: 'youtube',
      label: 'YouTube 854x480 (SD 16:9)'
    },
    'tiktok-1080p': {
      width: 1080,
      height: 1920,
      bitrate: '4M',
      format: 'tiktok',
      label: 'TikTok 1080x1920 (Full HD 9:16)'
    },
    'tiktok-720p': {
      width: 720,
      height: 1280,
      bitrate: '2.5M',
      format: 'tiktok',
      label: 'TikTok 720x1280 (HD 9:16)'
    },
    'instagram-reels': {
      width: 1080,
      height: 1920,
      bitrate: '3.5M',
      format: 'instagram-reels',
      label: 'Instagram Reels 1080x1920 (9:16)'
    },
    'instagram-stories': {
      width: 1080,
      height: 1920,
      bitrate: '3.5M',
      format: 'instagram-stories',
      label: 'Instagram Stories 1080x1920 (9:16)'
    },
    'youtube-shorts': {
      width: 1080,
      height: 1920,
      bitrate: '4M',
      format: 'youtube-shorts',
      label: 'YouTube Shorts 1080x1920 (9:16)'
    },
    'facebook-1080p': {
      width: 1920,
      height: 1080,
      bitrate: '4M',
      format: 'facebook',
      label: 'Facebook 1920x1080 (16:9)'
    },
    'facebook-720p': {
      width: 1280,
      height: 720,
      bitrate: '2.5M',
      format: 'facebook',
      label: 'Facebook 1280x720 (16:9)'
    },
    'twitter-1080p': {
      width: 1920,
      height: 1080,
      bitrate: '3M',
      format: 'twitter',
      label: 'Twitter/X 1920x1080 (16:9)'
    },
    'original': {
      width: null,
      height: null,
      bitrate: '5M',
      format: 'original',
      label: 'Original (Como foi gravado)'
    }
  };

  /**
   * Obtém configuração de preset
   */
  static getPreset(presetName) {
    return VideoConverterService.PRESETS[presetName] || VideoConverterService.PRESETS['original'];
  }
}

// Instância singleton
const videoConverterService = new VideoConverterService();

// Export para uso como módulo ES6
export { VideoConverterService, videoConverterService };
