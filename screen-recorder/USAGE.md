# Guia de Uso - Screen Recorder Studio

## Início Rápido

### 1. Instalação

O módulo não requer instalação de dependências externas. Funciona diretamente no navegador usando Web APIs nativas.

```bash
# Clone ou copie a pasta screen-recorder
cd screen-recorder

# Abra o index.html em um navegador moderno
# Recomendado: Chrome, Edge ou Firefox
```

### 2. Fluxo de Uso

#### Passo 1: Configurar

1. Escolha o **formato do vídeo**:
   - YouTube (16:9 - 1920x1080)
   - TikTok (9:16 - 1080x1920)
   - Shorts/Reels (9:16 - 1080x1920)

2. Selecione o **layout**:
   - Tela + Webcam (Canto) - para YouTube
   - Tela + Webcam (Topo) - para TikTok/Shorts
   - Apenas Tela
   - Apenas Webcam

3. Defina a **qualidade**:
   - Baixa (1 Mbps)
   - Média (2.5 Mbps)
   - Alta (5 Mbps) - recomendado
   - Ultra (10 Mbps)

4. Configure **fontes de captura**:
   - ☑ Habilitar Webcam
   - ☑ Capturar Microfone
   - ☐ Capturar Áudio do Sistema

5. Escolha **FPS**:
   - 24 FPS
   - 30 FPS (recomendado)
   - 60 FPS

6. Defina o **nome do projeto**

#### Passo 2: Inicializar

1. Clique em **"Inicializar"**
2. O navegador pedirá permissões:
   - Permissão para capturar tela
   - Permissão para acessar webcam
   - Permissão para acessar microfone
3. Aceite as permissões
4. O preview será exibido

#### Passo 3: Gravar

1. Clique em **"Iniciar Gravação"**
2. A gravação começa
3. O contador de duração inicia
4. O preview mostra a composição em tempo real
5. Clique em **"Parar Gravação"** quando terminar

#### Passo 4: Exportar

1. Clique em **"Exportar"**
2. Aguarde o processamento
3. O vídeo será baixado automaticamente

---

## Uso Programático

### Exemplo Básico

```javascript
import { ScreenRecorder, RecordingConfig, VideoFormatType, LayoutType, ExportQuality } from './src/index.js';

// Cria configuração
const config = new RecordingConfig({
  formatType: VideoFormatType.YOUTUBE,
  layoutType: LayoutType.SCREEN_PLUS_WEBCAM_CORNER,
  quality: ExportQuality.HIGH,
  webcamEnabled: true,
  microphoneEnabled: true,
  fps: 30,
  projectName: 'meu_video'
});

// Inicializa recorder
const recorder = new ScreenRecorder();
await recorder.initialize(config);

// Inicia sessão
await recorder.startSession();

// Inicia gravação
await recorder.startRecording();

// Para gravação
await recorder.stopRecording();

// Exporta
const result = await recorder.export();
console.log('Vídeo exportado:', result.fileName);
```

### Uso Avançado - Componentes Individuais

```javascript
import { CaptureManager, PresetFactory, CompositionEngine, ExportManager } from './src/index.js';

// Gerenciador de captura
const captureManager = new CaptureManager();

// Cria preset personalizado
const preset = PresetFactory.createPreset('TIKTOK', 'SCREEN_PLUS_WEBCAM_TOP');

// Motor de composição
const compositionEngine = new CompositionEngine(preset);
compositionEngine.initialize();

// Gerenciador de exportação
const exportManager = new ExportManager();
```

---

## Arquitetura do Projeto

```
screen-recorder/
│
├── src/
│   ├── models/              # Entidades e configurações
│   │   ├── enums.js
│   │   ├── constants.js
│   │   ├── recording-config.js
│   │   ├── media-source.js
│   │   └── recording-session.js
│   │
│   ├── capture/             # Captura de mídia
│   │   ├── screen-recorder.js
│   │   ├── webcam-recorder.js
│   │   └── audio-recorder.js
│   │
│   ├── core/                # Orquestradores
│   │   └── capture-manager.js
│   │
│   ├── presets/             # Presets de layout
│   │   ├── layout-preset.js
│   │   ├── youtube-layout-preset.js
│   │   ├── tiktok-layout-preset.js
│   │   ├── shorts-layout-preset.js
│   │   └── preset-factory.js
│   │
│   ├── composition/         # Composição de vídeo
│   │   ├── composition-engine.js
│   │   ├── video-timeline-composer.js
│   │   └── preview-renderer.js
│   │
│   ├── export/              # Exportação
│   │   └── export-manager.js
│   │
│   ├── utils/               # Utilitários
│   │   └── project-settings.js
│   │
│   └── index.js             # Entry point
│
├── ui/                      # Interface
│   ├── app.js
│   └── styles.css
│
├── index.html               # Página principal
├── package.json
└── README.md
```

---

## Classes Principais

### CaptureManager
Orquestra captura de tela, webcam e áudio.

### CompositionEngine
Combina múltiplas fontes de vídeo em um canvas.

### ExportManager
Processa e exporta o vídeo final.

### PreviewRenderer
Renderiza preview em tempo real.

### ProjectSettings
Persiste preferências do usuário.

---

## Formatos Suportados

| Formato | Resolução | Aspect Ratio | Uso Ideal |
|---------|-----------|--------------|-----------|
| YouTube | 1920x1080 | 16:9 | Vídeos horizontais |
| TikTok | 1080x1920 | 9:16 | Vídeos verticais |
| Shorts/Reels | 1080x1920 | 9:16 | Vídeos curtos verticais |

---

## Troubleshooting

### Webcam não aparece
- Verifique se concedeu permissão
- Verifique se a webcam está conectada
- Tente em outro navegador

### Áudio não funciona
- Áudio do sistema requer compartilhamento de tela com áudio
- Nem todos os navegadores suportam captura de áudio do sistema
- Verifique permissões do microfone

### Exportação falha
- Verifique espaço em disco
- Tente qualidade menor
- Reduza duração do vídeo

---

## Requisitos

- Navegador moderno (Chrome 94+, Edge 94+, Firefox 92+)
- Webcam (opcional)
- Microfone (opcional)
- Permissões de captura de tela/webcam/áudio

---

## Próximos Passos

1. Integração com FFmpeg para processamento avançado
2. Suporte a edição de vídeo
3. Filtros e efeitos
4. Upload direto para plataformas
5. Marca d'água personalizada
6. Templates customizados

---

## Suporte

Para dúvidas ou problemas, consulte o código-fonte ou abra uma issue.
