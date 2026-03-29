class RecordingService {
  constructor() {
    this.mediaRecorder = null;
    this.recordedChunks = [];
    this.isRecording = false;
    this.recordingFormat = 'youtube'; // 'youtube' ou 'tiktok'
  }

  startRecording(stream, format = 'youtube', mimeType = "video/webm;codecs=vp9,opus") {
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = "video/webm";
    }

    this.recordedChunks = [];
    this.recordingFormat = format;

    // Ajustar bitrate baseado no formato
    const videoBitsPerSecond = format === 'tiktok' ? 3500000 : 2500000; // TikTok maior qualidade

    this.mediaRecorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond
    });

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.recordedChunks.push(event.data);
      }
    };

    this.mediaRecorder.start(1000);
    this.isRecording = true;
    
    console.log(`Gravando em formato: ${format} (${videoBitsPerSecond / 1000000}Mbps)`);
  }

  stopRecording() {
    return new Promise((resolve) => {
      if (!this.mediaRecorder || this.mediaRecorder.state === "inactive") {
        resolve(null);
        return;
      }

      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.recordedChunks, { type: this.mediaRecorder.mimeType });
        this.isRecording = false;
        resolve(blob);
      };

      this.mediaRecorder.stop();
    });
  }

  downloadRecording(blob, filename = `gravacao-${Date.now()}.webm`) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = filename;
    link.click();

    URL.revokeObjectURL(url);
  }
  
  downloadWithResponsivePlayer(blob, format = 'youtube', customAspectRatio = null, customMaxWidth = null, resolution = '1080p') {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const formatLabel = format === 'tiktok' ? 'TikTok-9x16' : 'YouTube-16x9';
    const filename = `gravacao-${formatLabel}-${resolution}-${timestamp}.html`;
    
    // Converter blob para base64
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64Video = reader.result;
      const htmlContent = this.generateResponsivePlayerHTML(base64Video, format, customAspectRatio, customMaxWidth, resolution);
      
      const htmlBlob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(htmlBlob);
      const link = document.createElement("a");
      
      link.href = url;
      link.download = filename;
      link.click();
      
      URL.revokeObjectURL(url);
    };
    reader.readAsDataURL(blob);
  }
  
  generateResponsivePlayerHTML(base64Video, format, customAspectRatio = null, customMaxWidth = null, resolution = '1080p') {
    const isVertical = format === 'tiktok';
    const aspectRatio = customAspectRatio || (isVertical ? '9 / 16' : '16 / 9');
    const maxWidth = customMaxWidth || (isVertical ? '450px' : '100%');
    const orientation = isVertical ? 'portrait' : 'landscape';
    
    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <title>V\u00eddeo ${format === 'tiktok' ? 'TikTok' : 'YouTube'} ${resolution} - Grava\u00e7\u00e3o</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    body {
      background: #000;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      overflow: hidden;
    }
    
    .video-container {
      width: 100%;
      height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
    }
    
    video {
      width: 100%;
      height: 100%;
      max-width: ${maxWidth};
      aspect-ratio: ${aspectRatio};
      object-fit: contain;
      background: #000;
    }
    
    /* Fullscreen no celular horizontal (YouTube) */
    @media (orientation: landscape) and (max-width: 1024px) {
      video {
        width: 100vw;
        height: 100vh;
        max-width: 100%;
        aspect-ratio: ${!isVertical ? '16 / 9' : 'auto'};
      }
    }
    
    /* Fullscreen no celular vertical (TikTok) */
    @media (orientation: portrait) and (max-width: 768px) {
      video {
        width: 100vw;
        height: 100vh;
        max-width: 100%;
        aspect-ratio: ${isVertical ? '9 / 16' : 'auto'};
      }
    }
    
    .controls {
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0, 0, 0, 0.8);
      padding: 12px 20px;
      border-radius: 30px;
      display: flex;
      gap: 16px;
      align-items: center;
      z-index: 10;
      backdrop-filter: blur(10px);
    }
    
    button {
      background: rgba(255, 255, 255, 0.2);
      border: none;
      color: white;
      padding: 10px 16px;
      border-radius: 20px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 600;
      transition: all 0.2s;
    }
    
    button:hover {
      background: rgba(255, 255, 255, 0.3);
      transform: scale(1.05);
    }
    
    .info {
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0, 0, 0, 0.7);
      padding: 8px 16px;
      border-radius: 20px;
      color: white;
      font-size: 12px;
      backdrop-filter: blur(10px);
      z-index: 10;
    }
  </style>
</head>
<body>
  <div class="info">${isVertical ? '\ud83d\udcf1 Formato TikTok (9:16)' : '\ud83c\udfac Formato YouTube (16:9)'}</div>
  
  <div class="video-container">
    <video id="video" controls autoplay loop>
      <source src="${base64Video}" type="video/webm">
      Seu navegador n\u00e3o suporta reprodu\u00e7\u00e3o de v\u00eddeo.
    </video>
  </div>
  
  <div class="controls">
    <button onclick="togglePlay()">\u23ef Play/Pause</button>
    <button onclick="toggleFullscreen()">\ud83d\udcfa Fullscreen</button>
    <button onclick="downloadOriginal()">\u2b07 Baixar V\u00eddeo</button>
  </div>
  
  <script>
    const video = document.getElementById('video');
    
    function togglePlay() {
      if (video.paused) {
        video.play();
      } else {
        video.pause();
      }
    }
    
    function toggleFullscreen() {
      if (!document.fullscreenElement) {
        video.requestFullscreen().catch(err => {
          alert('Erro ao entrar em fullscreen: ' + err.message);
        });
      } else {
        document.exitFullscreen();
      }
    }
    
    function downloadOriginal() {
      const link = document.createElement('a');
      link.href = video.src;
      link.download = 'video-${format}-' + Date.now() + '.webm';
      link.click();
    }
    
    // Auto-fullscreen em mobile
    if (window.innerWidth <= 768) {
      video.addEventListener('play', () => {
        setTimeout(() => {
          if (!document.fullscreenElement) {
            video.requestFullscreen().catch(() => {});
          }
        }, 500);
      }, { once: true });
    }
  </script>
</body>
</html>`;
  }

  async uploadRecording(blob, apiBaseUrl, streamId) {
    const formData = new FormData();
    formData.append("recording", blob, `recording-${Date.now()}.webm`);
    formData.append("streamId", streamId);

    const response = await fetch(`${apiBaseUrl}/api/v1/recordings/upload`, {
      method: "POST",
      body: formData
    });

    if (!response.ok) {
      throw new Error("Falha ao enviar gravacao.");
    }

    return response.json();
  }

  getRecordingDuration() {
    if (!this.isRecording || !this.mediaRecorder) {
      return 0;
    }

    return Date.now() - this.mediaRecorder.startTime;
  }
}

export { RecordingService };
