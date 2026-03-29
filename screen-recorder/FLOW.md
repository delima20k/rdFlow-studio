# Diagrama de Fluxo - Screen Recorder Module

## Fluxo Principal de Execução

```
┌─────────────────────────────────────────────────────────────┐
│                         USUÁRIO                              │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    1. CONFIGURAÇÃO                           │
│  • Escolhe formato (YouTube/TikTok/Shorts)                   │
│  • Define layout (Tela+Webcam/Apenas Tela)                   │
│  • Configura qualidade (Low/Medium/High/Ultra)               │
│  • Habilita/desabilita webcam, microfone, áudio sistema      │
│  • Define FPS e nome do projeto                              │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                   2. INICIALIZAÇÃO                           │
│                                                              │
│  ScreenRecorder.initialize(config)                           │
│    │                                                         │
│    ├──► RecordingConfig.validate()                           │
│    │                                                         │
│    ├──► PresetFactory.createPreset()                         │
│    │      └──► YouTubeLayoutPreset | TikTokLayoutPreset      │
│    │                                                         │
│    └──► ProjectSettings.saveLastConfig()                     │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                 3. INICIAR SESSÃO                            │
│                                                              │
│  CaptureManager.startSession(config)                         │
│    │                                                         │
│    ├──► ScreenRecorder.startCapture()                        │
│    │      └──► navigator.mediaDevices.getDisplayMedia()      │
│    │                                                         │
│    ├──► WebcamRecorder.startCapture()  [se habilitado]       │
│    │      └──► navigator.mediaDevices.getUserMedia()         │
│    │                                                         │
│    └──► AudioRecorder.startMicrophoneCapture() [se hab.]     │
│           └──► navigator.mediaDevices.getUserMedia()         │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                   4. PREVIEW                                 │
│                                                              │
│  PreviewRenderer.initialize(container)                       │
│    │                                                         │
│    ├──► CompositionEngine.initialize()                       │
│    │      └──► Cria canvas com dimensões do preset           │
│    │                                                         │
│    ├──► CompositionEngine.setScreenVideo(stream)             │
│    ├──► CompositionEngine.setWebcamVideo(stream)             │
│    │                                                         │
│    └──► PreviewRenderer.startRendering(fps)                  │
│           └──► Renderiza frame a cada 1000/fps ms            │
│                 ├──► Desenha background                      │
│                 ├──► Desenha vídeo da tela                   │
│                 └──► Desenha webcam em overlay               │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                  5. INICIAR GRAVAÇÃO                         │
│                                                              │
│  CaptureManager.startRecording()                             │
│    │                                                         │
│    ├──► ScreenRecorder.startRecording()                      │
│    │      └──► new MediaRecorder(screenStream)               │
│    │                                                         │
│    ├──► WebcamRecorder.startRecording()  [se habilitado]     │
│    │      └──► new MediaRecorder(webcamStream)               │
│    │                                                         │
│    └──► AudioRecorder.startRecording()  [se habilitado]      │
│           └──► new MediaRecorder(audioStream)                │
│                                                              │
│  RecordingSession.start()                                    │
│    └──► Define startTime, status = RECORDING                 │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           │ [usuário grava conteúdo]
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                   6. PARAR GRAVAÇÃO                          │
│                                                              │
│  CaptureManager.stopRecording()                              │
│    │                                                         │
│    ├──► ScreenRecorder.stopRecording()                       │
│    │      └──► MediaRecorder.stop()                          │
│    │            └──► Gera Blob do vídeo da tela              │
│    │                  └──► MediaSource(SCREEN, blob)         │
│    │                                                         │
│    ├──► WebcamRecorder.stopRecording()                       │
│    │      └──► Gera Blob do vídeo da webcam                  │
│    │            └──► MediaSource(WEBCAM, blob)               │
│    │                                                         │
│    └──► AudioRecorder.stopRecording()                        │
│           └──► Gera Blob do áudio                            │
│                 └──► MediaSource(MICROPHONE_AUDIO, blob)     │
│                                                              │
│  RecordingSession.stop()                                     │
│    └──► Define endTime, status = STOPPED                     │
│    └──► RecordingSession.addMediaSource() para cada fonte    │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    7. COMPOSIÇÃO                             │
│                                                              │
│  CompositionEngine.renderFrame() [em loop durante export]    │
│    │                                                         │
│    ├──► _clearCanvas()                                       │
│    ├──► _drawBackground()  (black/gradient/blur)             │
│    ├──► _drawVideo(screenVideo, screenLayout)                │
│    │      └──► Calcula dimensões (contain/cover/stretch)     │
│    │            └──► context.drawImage(video, x, y, w, h)    │
│    │                                                         │
│    └──► _drawVideo(webcamVideo, webcamLayout)                │
│           └──► Desenha webcam em posição overlay             │
│           └──► _drawWebcamBorder() (borda, sombra)           │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    8. EXPORTAÇÃO                             │
│                                                              │
│  ExportManager.exportWithMediaRecorder(canvasStream, audio)  │
│    │                                                         │
│    ├──► ExportJob.start()                                    │
│    │      └──► status = PROCESSING, progress = 0             │
│    │                                                         │
│    ├──► Combina canvas stream + audio stream                 │
│    │      └──► new MediaStream([...videoTracks, ...audio])   │
│    │                                                         │
│    ├──► new MediaRecorder(combinedStream)                    │
│    │      └──► Coleta chunks de dados                        │
│    │                                                         │
│    ├──► MediaRecorder.stop()                                 │
│    │      └──► Cria Blob final                               │
│    │            └──► URL.createObjectURL(blob)               │
│    │                                                         │
│    ├──► _triggerDownload(url, filename)                      │
│    │      └──► Cria tag <a> e clica automaticamente          │
│    │                                                         │
│    └──► ExportJob.complete(url)                              │
│           └──► status = COMPLETED, progress = 100            │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                   9. FINALIZAÇÃO                             │
│                                                              │
│  ScreenRecorder.dispose()                                    │
│    │                                                         │
│    ├──► CaptureManager.dispose()                             │
│    │      ├──► ScreenRecorder.dispose()                      │
│    │      ├──► WebcamRecorder.dispose()                      │
│    │      └──► AudioRecorder.dispose()                       │
│    │                                                         │
│    ├──► PreviewRenderer.dispose()                            │
│    │      └──► CompositionEngine.dispose()                   │
│    │                                                         │
│    └──► ExportManager.dispose()                              │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                  VÍDEO EXPORTADO                             │
│   • Formato: MP4/WebM                                        │
│   • Resolução: Baseada no preset escolhido                   │
│   • Composição: Tela + Webcam + Áudio                        │
│   • Download automático                                      │
└─────────────────────────────────────────────────────────────┘
```

---

## Fluxo de Dados Entre Classes

```
RecordingConfig ──────────────────────────┐
       │                                  │
       │                                  ▼
       ├──────────────► CaptureManager ──────► RecordingSession
       │                     │                       │
       │                     │                       │
       │                     ├──► ScreenRecorder     │
       │                     ├──► WebcamRecorder     │
       │                     └──► AudioRecorder      │
       │                                 │           │
       │                                 ▼           │
       │                           MediaSource ◄─────┘
       │                                 │
       ▼                                 │
PresetFactory ─────► LayoutPreset        │
       │                  │              │
       │                  ▼              │
       └────────► CompositionEngine ◄────┘
                         │
                         ├──────► PreviewRenderer
                         │
                         └──────► ExportManager
                                       │
                                       ▼
                                   ExportJob
```

---

## Timeline de Execução

```
TEMPO   │   AÇÃO
────────┼────────────────────────────────────────────────────
  0s    │   Usuário clica "Inicializar"
 +0.5s  │   Permissões solicitadas
 +2s    │   Permissões concedidas
 +2.5s  │   Preview renderizado
  3s    │   Usuário clica "Iniciar Gravação"
 +3.2s  │   Gravação iniciada
  ...   │   [Usuário grava conteúdo]
 60s    │   Usuário clica "Parar Gravação"
+60.5s  │   Gravação parada
+61s    │   Fontes de mídia salvas
 62s    │   Usuário clica "Exportar"
+62.5s  │   Composição iniciada
+63s    │   Exportação em progresso
+70s    │   Exportação concluída
+70.5s  │   Download iniciado
 71s    │   ✓ VÍDEO EXPORTADO
```

---

## Hierarquia de Classes

```
LayoutPreset (abstract)
    ├── YouTubeLayoutPreset
    ├── TikTokLayoutPreset
    └── ShortsLayoutPreset (extends TikTokLayoutPreset)

MediaSource
    ├── Type.SCREEN
    ├── Type.WEBCAM
    ├── Type.MICROPHONE_AUDIO
    ├── Type.SYSTEM_AUDIO
    └── Type.MIXED_AUDIO

RecordingSession
    ├── RecordingConfig
    └── MediaSource[]

ScreenRecorder (Main Facade)
    ├── CaptureManager
    │      ├── ScreenRecorder
    │      ├── WebcamRecorder
    │      └── AudioRecorder
    ├── PreviewRenderer
    │      └── CompositionEngine
    └── ExportManager
           └── ExportJob
```

---

## Padrões de Design Aplicados

| Padrão | Onde | Benefício |
|--------|------|-----------|
| **Facade** | `CaptureManager`, `ScreenRecorder` | Simplifica API complexa |
| **Factory** | `PresetFactory` | Centraliza criação de presets |
| **Strategy** | `LayoutPreset` | Troca algoritmo de layout |
| **Template Method** | `LayoutPreset` | Define esqueleto, filhos implementam |
| **Observer** (futuro) | Events de progresso | Notificação de mudanças |
| **Builder** (implícito) | `RecordingConfig` | Configuração flexível |

---

## Estados da Aplicação

```
[IDLE] ──┐
         │ initialize()
         ▼
    [PREPARING]
         │ startSession()
         ▼
      [READY]
         │ startRecording()
         ▼
    [RECORDING] ─────┐ pause()
         │           ▼
         │        [PAUSED]
         │           │ resume()
         │           │
         │ ◄─────────┘
         │ stopRecording()
         ▼
     [STOPPED]
         │ export()
         ▼
    [EXPORTING]
         │ complete()
         ▼
    [COMPLETED]
```

---
