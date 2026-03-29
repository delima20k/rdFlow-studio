# API de Streaming Local (Node.js + Express + RTMP + HLS)

Projeto completo para transmissão ao vivo com:
- Ingestão RTMP e entrega HLS
- Estúdio de captura com tela, webcam e câmera do celular
- Gravação local de múltiplas fontes
- Persistência de transmissões em SQLite

## Stack

- Node.js + Express
- SQLite (armazena metadados de transmissões e sessões)
- FFmpeg (recebe RTMP e gera HLS)
- MediaDevices API (Screen Capture, getUserMedia)
- MediaRecorder API (gravação local)
- WebRTC (conexão desktop-celular)
- Frontend HTML + JavaScript puro
- Testes com Vitest + Supertest

## Arquitetura

```text
src/
  config/        -> ambiente e conexão com banco
  controllers/   -> entrada HTTP
  services/      -> regras de negócio, ingestão FFmpeg e WebRTC signaling
  repositories/  -> acesso ao SQLite
  models/        -> entidades Stream e PhoneCameraSession
  routes/        -> endpoints REST
  middlewares/   -> validação e erros
  validators/    -> schemas Zod
public/
  index.html           -> cliente de teste HLS básico
  studio.html          -> estúdio de captura completo
  phone-camera.html    -> app web para celular virar câmera
  js/
    services/          -> lógica de captura e API
    components/        -> componentes reutilizáveis
tests/
  stream-api.test.js
```

## Funcionalidades

### Estúdio de Captura (studio.html)

- 🖥️ **Captura de tela** com áudio do sistema
- 📹 **Webcam** com seleção de dispositivo e resolução
- 🎤 **Microfone** independente
- 📱 **Câmera do celular** via WebRTC (conexão por QR Code)
- 🎬 **Gravação local** com download direto
- 👁️ **Preview em tempo real** de todas as fontes
- 🎛️ **Controles centralizados** para gerenciar captura

### API de Streaming

- Criação de transmissões
- Ingestão RTMP (OBS, FFmpeg, etc.)
- Entrega HLS em chunks
- Gerenciamento de sessões WebRTC
- Armazenamento de metadados

## Requisitos locais

1. **Node.js 20+**
2. **FFmpeg** instalado e disponível no PATH

Comando para verificar FFmpeg:

```bash
ffmpeg -version
```

## Configuração

1. Copie `.env.example` para `.env`
2. Ajuste se necessário:

```env
PORT=3000
RTMP_PORT=1935
HLS_PATH=./media/live
DB_PATH=./data/streaming.sqlite
API_BASE_URL=http://localhost:3000
```

## Execução

```bash
npm install
npm run dev
```

Acesse:

- **API**: `http://localhost:3000`
- **Cliente HLS básico**: `http://localhost:3000`
- **Estúdio de captura**: `http://localhost:3000/studio.html`

## Fluxos de uso

### 1. Estúdio de Captura Local

1. Acesse `http://localhost:3000/studio.html`
2. Clique nas fontes para ativar:
   - **Tela + Áudio Sistema**: captura desktop completo
   - **Webcam**: selecione câmera e resolução
   - **Microfone**: captura áudio independente
   - **Câmera do Celular**: gera QR Code para conexão
3. Clique em **Iniciar Gravação** para gravar localmente
4. Clique em **Parar Gravação** e depois em **Baixar** para salvar

### 2. Usar Câmera do Celular

1. No estúdio, clique em **Câmera do Celular**
2. Escaneie o QR Code com seu celular
3. No celular, clique em **Iniciar Câmera**
4. Autorize as permissões de câmera e microfone
5. O vídeo aparecerá automaticamente no preview do desktop
6. Use **Inverter Câmera** para trocar entre frontal e traseira

### 3. Transmissão RTMP para HLS

1. Acesse `http://localhost:3000`
2. Clique em **Criar Stream**
3. Copie a URL RTMP retornada
4. Clique em **Iniciar Ingestão RTMP**
5. No OBS:
   - Settings → Stream
   - Service: Custom
   - Server: cole a URL RTMP
   - Start Streaming
6. Clique em **Reproduzir HLS** para tocar o stream ao vivo

## Principais rotas da API

### Streams

- `POST /api/v1/streams` — cria transmissão
- `GET /api/v1/streams` — lista transmissões
- `GET /api/v1/streams/:streamId` — detalha transmissão

### Ingestão e HLS

- `POST /api/v1/ingest/rtmp/start` — inicia receptor RTMP
- `POST /api/v1/ingest/rtmp/stop` — para receptor RTMP
- `GET /api/v1/streams/:streamId/hls/index.m3u8` — entrega playlist HLS
- `GET /api/v1/streams/:streamId/hls/:segmentName` — entrega chunks HLS

### Câmera do Celular (WebRTC)

- `POST /api/v1/phone-camera/sessions` — cria sessão de conexão
- `GET /api/v1/phone-camera/sessions/:sessionId/status` — verifica status
- `POST /api/v1/phone-camera/sessions/:sessionId/offer` — recebe offer do celular
- `POST /api/v1/phone-camera/sessions/:sessionId/answer` — envia answer para desktop

## Testes

```bash
npm test
```

Os testes validam:
- Healthcheck
- Criação e listagem de streams
- Rotas de playlist HLS

## Compatibilidade de navegadores

- **Chrome/Edge**: suporte completo a todas as funcionalidades
- **Firefox**: suporte completo a todas as funcionalidades
- **Safari**: suporte a getUserMedia e getDisplayMedia com limitações de áudio do sistema
- **Mobile Chrome/Safari**: funciona como câmera remota

## Observações técnicas

### Captura de áudio do sistema

O áudio do sistema via `getDisplayMedia` só funciona:
1. Em Windows 10+ e macOS 13+
2. Com HTTPS ou localhost
3. Se o usuário autorizar explicitamente

### WebRTC para câmera do celular

O sistema usa STUN público do Google para NAT traversal. Para ambientes corporativos com firewall restritivo, configure um servidor TURN próprio.

### Gravação local

A gravação usa `MediaRecorder` com codec VP9/Opus quando disponível. O arquivo final é `.webm` e pode ser convertido com FFmpeg se necessário:

```bash
ffmpeg -i gravacao.webm -c:v libx264 -c:a aac gravacao.mp4
```

## Próximas etapas recomendadas

1. Integrar media server dedicado (mediasoup, Janus, LiveKit) para WebRTC real entre peers
2. Adicionar composição de múltiplas fontes com Canvas API
3. Implementar upload de gravações para o backend
4. Criar filtros e efeitos em tempo real
5. Adicionar autenticação e autorização
6. Implementar dashboard de analytics de transmissões
