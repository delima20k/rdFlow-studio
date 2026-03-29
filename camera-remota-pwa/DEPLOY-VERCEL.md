# 🚀 Deploy no Vercel - Câmera Remota PWA

## ✅ Problema Corrigido

**Erro Original:**
```
404: NOT_FOUND
Code: NOT_FOUND
```

**Causa Raiz:**
- O `index.html` continha **código JavaScript duplicado** (14 erros de redeclaração de variáveis)
- Quando o navegador tentava executar, o JavaScript quebrava
- Resultado: página não carregava corretamente → erro 404

**Solução Aplicada:**
1. ✅ Substituído `index.html` quebrado por versão funcional baseada no `phone-camera.html`
2. ✅ Ajustados caminhos de `/camera/*` para `/*` (deploy standalone)
3. ✅ Atualizado `manifest.json` (start_url e scope para `/`)
4. ✅ Corrigido `sw.js` (removidas referências a arquivos inexistentes)
5. ✅ Criado `.vercelignore` para otimizar deploy

---

## 📋 Como Fazer Deploy

### Opção 1: Via CLI do Vercel

```bash
# Instalar Vercel CLI (se ainda não tiver)
npm install -g vercel

# Navegar para a pasta do projeto
cd camera-remota-pwa

# Fazer deploy
vercel

# Para deploy em produção
vercel --prod
```

### Opção 2: Via Interface Web do Vercel

1. Acesse [vercel.com](https://vercel.com)
2. Clique em **New Project**
3. Selecione o repositório do GitHub (ou importe)
4. Configure:
   - **Framework Preset:** Other (Static Site)
   - **Root Directory:** `camera-remota-pwa`
   - **Build Command:** (deixe vazio)
   - **Output Directory:** (deixe vazio - usa raiz)
5. Clique em **Deploy**

---

## 🔍 Estrutura de Arquivos Essenciais

```
camera-remota-pwa/
├── index.html          ← Página principal (✅ CORRIGIDA)
├── manifest.json       ← PWA manifest (✅ CORRIGIDA)
├── sw.js              ← Service Worker (✅ CORRIGIDA)
├── vercel.json        ← Configuração do Vercel
├── .vercelignore      ← Arquivos a ignorar (✅ NOVA)
└── assets/            ← Assets estáticos (se houver)
```

---

## 🧪 Como Testar Antes do Deploy

### Teste Local
```bash
# Instalar servidor HTTP simples
npm install -g http-server

# Rodar na pasta do projeto
cd camera-remota-pwa
http-server -p 8080

# Acessar no navegador
http://localhost:8080
```

### Verificações Essenciais

1. ✅ **Console do Browser (F12):**
   - Não deve ter erros JavaScript
   - Deve ver: `PWA Iniciado` e `[SW] Registrado`

2. ✅ **Página Carrega:**
   - Header: "📱 Câmera Remota"
   - Status: "Pronta para iniciar"
   - Botão: "📹 Iniciar Câmera"

3. ✅ **PWA Funciona:**
   - DevTools → Application → Service Workers → Estado "Activated"
   - DevTools → Application → Manifest → Sem erros

4. ✅ **Câmera Funciona (no celular):**
   - Toque em "Iniciar Câmera"
   - Aceite permissões
   - Stream de vídeo aparece

---

## 🔗 URLs Esperadas Após Deploy

```
# Página principal
https://seu-projeto.vercel.app/

# Manifest
https://seu-projeto.vercel.app/manifest.json

# Service Worker
https://seu-projeto.vercel.app/sw.js

# Com parâmetros de sessão (do estúdio)
https://seu-projeto.vercel.app/?api=https://api-url&session=123abc
```

---

## 🐛 Troubleshooting

### Erro: "Service Worker registration failed"
```javascript
// Verificar console para detalhes
// Certifique-se que o domínio usa HTTPS (Vercel usa por padrão)
```

### Erro: "getUserMedia is not defined"
- PWAs de câmera **exigem HTTPS** (Vercel fornece automaticamente)
- No localhost, use `http://localhost:8080` (permitido para dev)

### Erro: "Cannot read property 'getTracks'"
- Permissões de câmera negadas
- Recarregue e aceite permissões

### Deploy OK mas página em branco
1. Abra DevTools (F12) → Console
2. Verifique erros JavaScript
3. Certifique-se que `vercel.json` está configurado corretamente

---

## ✨ Recursos do PWA

- 📱 **Instalável** (iOS e Android)
- 🎥 **Câmera HD** (1920x1080)
- 🎤 **Microfone** com cancelamento de eco
- 🔄 **Troca de câmera** (frontal/traseira)
- 🔗 **WebRTC** para conexão com estúdio
- 📶 **Offline-ready** via Service Worker
- 🌐 **Progressive Enhancement**

---

## 📞 Uso com o Estúdio

1. No **estúdio** (localhost:3000):
   - Clique em "📱 Câmera do Celular"
   - Copie a URL ou escaneie QR Code

2. No **celular**:
   - Acesse a URL do Vercel com parâmetros
   - Exemplo: `https://camera.vercel.app/?api=https://api.com&session=abc123`
   - Toque em "Iniciar Câmera"
   - Aceite permissões
   - Aguarde conexão com estúdio

---

## 🎯 Checklist Final de Deploy

- [x] `index.html` sem erros JavaScript
- [x] `manifest.json` com caminhos corretos
- [x] `sw.js` otimizado
- [x] `.vercelignore` criado
- [x] `vercel.json` configurado
- [ ] **Commit e push** para GitHub
- [ ] **Deploy no Vercel**
- [ ] **Teste em celular real** (HTTPS obrigatório)
- [ ] **Teste conexão com estúdio**
- [ ] **Teste instalação PWA**

---

## 📚 Recursos Adicionais

- [Vercel Docs](https://vercel.com/docs)
- [PWA Checklist](https://web.dev/pwa-checklist/)
- [WebRTC API](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API)
- [getUserMedia](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia)

---

**Problema resolvido! 🎉**

Agora você pode fazer deploy no Vercel sem erros 404.
