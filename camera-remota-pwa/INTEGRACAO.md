# 🔌 Integração com Backend

Este arquivo explica como integrar o PWA da câmera remota com o backend da API de streaming.

---

## 📋 Pré-requisitos

O backend já possui os endpoints necessários:

- ✅ `POST /api/v1/phone-camera/sessions` - Criar sessão
- ✅ `POST /api/v1/phone-camera/sessions/:sessionId/offer` - Enviar offer WebRTC
- ✅ `GET /api/v1/phone-camera/sessions/:sessionId/answer` - Obter answer WebRTC

---

## 🚀 Configuração

### 1. Backend (Servidor Node.js)

O backend já está pronto. Certifique-se de que está rodando:

```bash
cd api-s
npm start
```

O servidor estará em: `http://localhost:3000`

### 2. PWA (Câmera Remota)

#### **Opção A: Servir localmente (desenvolvimento)**

Coloque a pasta `camera-remota-pwa` em `api-s/public/pwa/`:

```bash
# No diretório api-s
mkdir public/pwa
cp -r camera-remota-pwa/* public/pwa/
```

Acesse: `http://localhost:3000/pwa/`

#### **Opção B: Deploy separado (produção)**

Faça deploy do PWA em Vercel/Netlify/GitHub Pages e configure a URL do backend.

---

## 🔗 Conectar PWA ao Backend

### Método 1: Editar código (permanente)

Edite `camera-remota-pwa/index.html` linha ~213:

```javascript
const API_BASE_URL = new URLSearchParams(window.location.search).get("api") || "http://localhost:3000";
```

Se o backend estiver em produção:

```javascript
const API_BASE_URL = new URLSearchParams(window.location.search).get("api") || "https://meu-backend.herokuapp.com";
```

### Método 2: Via query string (dinâmico)

Use a URL com parâmetros:

```
https://camera-remota.vercel.app/?api=http://localhost:3000&session=abc123
```

---

## 🎯 Fluxo Completo

### No Estúdio (Desktop)

1. Abra: `http://localhost:3000/studio.html`
2. Clique em **"📱 Câmera do Celular"**
3. Backend cria sessão via `POST /api/v1/phone-camera/sessions`
4. Resposta: `{ "sessionId": "abc123", "qrCode": "..." }`
5. QR Code é exibido na tela

### No Celular (PWA)

1. Escaneie o QR Code
2. Abre: `https://pwa-url/?api=http://192.168.0.100:3000&session=abc123`
3. Usuário clica em **"Iniciar Câmera"**
4. PWA envia offer via `POST /api/v1/phone-camera/sessions/abc123/offer`
5. Backend responde com answer
6. Conexão WebRTC estabelecida
7. Vídeo/áudio transmitido em tempo real

---

## 🔧 Modificações Necessárias

### Se o PWA estiver em outro domínio

#### 1. Habilitar CORS no backend

Edite `src/app.js`:

```javascript
import cors from 'cors';

app.use(cors({
  origin: 'https://camera-remota.vercel.app',
  credentials: true
}));
```

#### 2. Adicionar dependência

```bash
npm install cors
```

### Se quiser HTTPS local (desenvolvimento)

#### 1. Gerar certificado SSL

```bash
# Windows (OpenSSL)
openssl req -nodes -new -x509 -keyout server.key -out server.cert

# Linux/Mac
mkcert localhost
```

#### 2. Modificar servidor

Edite `src/config/env.js`:

```javascript
export const envConfig = {
  // ...
  ssl: {
    enabled: true,
    keyPath: './server.key',
    certPath: './server.cert'
  }
};
```

Edite `src/app.js`:

```javascript
import https from 'https';
import fs from 'fs';

// No final do arquivo
if (envConfig.ssl.enabled) {
  const options = {
    key: fs.readFileSync(envConfig.ssl.keyPath),
    cert: fs.readFileSync(envConfig.ssl.certPath)
  };
  
  https.createServer(options, app).listen(envConfig.port, () => {
    console.log(`🔒 HTTPS Server running on https://localhost:${envConfig.port}`);
  });
} else {
  app.listen(envConfig.port, () => {
    console.log(`🚀 HTTP Server running on http://localhost:${envConfig.port}`);
  });
}
```

---

## 📱 QR Code com URL Dinâmica

No `studio.html` (ou `studio.js`), quando gera o QR Code:

```javascript
async function createPhoneCameraSession() {
  const response = await fetch(`${API_BASE_URL}/api/v1/phone-camera/sessions`, {
    method: 'POST'
  });
  
  const { sessionId } = await response.json();
  
  // URL do PWA (ajuste conforme seu deploy)
  const pwaUrl = 'https://camera-remota.vercel.app';
  
  // URL completa com parâmetros
  const fullUrl = `${pwaUrl}/?api=${encodeURIComponent(API_BASE_URL)}&session=${sessionId}`;
  
  // Gerar QR Code
  const qrCode = await QRCode.toDataURL(fullUrl);
  
  // Exibir QR Code
  document.getElementById('qr-code-image').src = qrCode;
}
```

---

## 🌐 Cenários de Rede

### Cenário 1: Mesma rede WiFi

✅ **Funciona direto**

Desktop e celular na mesma WiFi:
- Backend: `http://192.168.0.100:3000`
- PWA: Qualquer URL
- Conexão WebRTC: Direta (peer-to-peer)

### Cenário 2: Redes diferentes (4G + WiFi)

⚠️ **Requer STUN/TURN server**

Backend precisa estar acessível publicamente:
- Backend: `https://meu-servidor.com`
- PWA: Qualquer URL
- WebRTC: Via STUN server (já configurado no PWA)

### Cenário 3: Atrás de firewall corporativo

❌ **Pode não funcionar sem TURN**

Solução:
1. Configure servidor TURN (coturn, Twilio, etc.)
2. Adicione configuração TURN no PWA (`index.html`):

```javascript
peerConnection = new RTCPeerConnection({
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { 
      urls: "turn:seu-turn-server.com:3478",
      username: "usuario",
      credential: "senha"
    }
  ]
});
```

---

## 🧪 Testar Integração

### 1. Backend está respondendo?

```bash
curl http://localhost:3000/api/v1/health
# Resposta: {"status":"ok","timestamp":"..."}
```

### 2. Criar sessão funciona?

```bash
curl -X POST http://localhost:3000/api/v1/phone-camera/sessions
# Resposta: {"sessionId":"...","createdAt":"..."}
```

### 3. WebRTC offer/answer funciona?

```bash
# Enviar offer
curl -X POST http://localhost:3000/api/v1/phone-camera/sessions/abc123/offer \
  -H "Content-Type: application/json" \
  -d '{"offer":{"type":"offer","sdp":"..."}}'

# Obter answer
curl http://localhost:3000/api/v1/phone-camera/sessions/abc123/answer
```

---

## 🐛 Troubleshooting

### Erro: CORS blocked

**Sintoma:** Console do navegador mostra erro de CORS

**Solução:** Adicione CORS no backend (veja seção "Modificações Necessárias")

### Erro: Failed to fetch

**Sintoma:** PWA não consegue se comunicar com backend

**Possíveis causas:**
1. Backend não está rodando
2. URL do backend está incorreta
3. Firewall bloqueando requisições

**Solução:**
1. Verifique se `npm start` está rodando
2. Confirme a URL em DevTools → Network
3. Desabilite firewall temporariamente para testar

### Erro: WebRTC connection failed

**Sintoma:** Offer enviado, mas conexão não estabelece

**Possíveis causas:**
1. Redes diferentes sem STUN/TURN
2. Firewall bloqueando portas UDP
3. NAT muito restritivo

**Solução:**
1. Teste na mesma WiFi primeiro
2. Configure servidor TURN
3. Use VPN para colocar ambos na mesma rede virtual

---

## 📊 Monitoramento

### Logs do Backend

```bash
# Ver logs em tempo real
npm start

# Filtrar apenas phone-camera
npm start | grep "phone-camera"
```

### Logs do PWA

Abra DevTools (F12) → Console

```javascript
// Ver estado da conexão
console.log(peerConnection.connectionState);

// Ver ICE candidates
peerConnection.onicecandidate = (e) => {
  console.log('ICE candidate:', e.candidate);
};
```

---

## ✅ Checklist de Integração

- [ ] Backend rodando em `http://localhost:3000`
- [ ] Endpoint `/api/v1/health` respondendo
- [ ] Endpoint `/api/v1/phone-camera/sessions` criando sessões
- [ ] CORS habilitado (se PWA em domínio diferente)
- [ ] PWA acessível via HTTPS (ou localhost)
- [ ] QR Code gerando URL correta com `?api=` e `?session=`
- [ ] Celular consegue acessar o PWA
- [ ] Celular consegue fazer POST para `/offer`
- [ ] WebRTC conecta (verificar `connectionState === "connected"`)

---

**Integração completa! 🎉**

Agora você pode usar o celular como câmera profissional em qualquer setup de streaming.
