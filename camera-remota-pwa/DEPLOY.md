# 🚀 Guia Rápido de Deploy

Este guia mostra como subir o app PWA em diferentes plataformas, todas com plano gratuito.

---

## 📦 Opção 1: GitHub Pages (Mais Simples)

### Passos

1. **Crie um repositório no GitHub**
   - Acesse https://github.com/new
   - Nome sugerido: `camera-remota-pwa`
   - Deixe público (obrigatório para plano gratuito)
   - Clique em **"Create repository"**

2. **Faça upload dos arquivos**

   **Via interface web:**
   - Clique em **"uploading an existing file"**
   - Arraste todos os arquivos da pasta `camera-remota-pwa`
   - Clique em **"Commit changes"**

   **Via Git (linha de comando):**
   ```bash
   cd camera-remota-pwa
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/SEU_USUARIO/camera-remota-pwa.git
   git push -u origin main
   ```

3. **Ative o GitHub Pages**
   - Vá em **Settings** (no repositório)
   - Clique em **Pages** (menu lateral)
   - Em **Source**, selecione: `main` branch
   - Clique em **Save**
   - Aguarde 2-3 minutos

4. **Acesse seu app**
   ```
   https://SEU_USUARIO.github.io/camera-remota-pwa/
   ```

### ✅ Vantagens
- Totalmente gratuito
- Sem configuração complexa
- SSL/HTTPS automático
- Sem limite de banda para projetos pequenos

### ⚠️ Limitações
- Repositório precisa ser público
- 100 GB/mês de banda (mais que suficiente)

---

## 📦 Opção 2: Vercel (Mais Rápido)

### Passos

1. **Instale a CLI**
   ```bash
   npm install -g vercel
   ```

2. **Faça deploy**
   ```bash
   cd camera-remota-pwa
   vercel --prod
   ```

3. **Siga o prompt**
   - Login com GitHub/GitLab/Bitbucket
   - Confirme as configurações
   - Aguarde o deploy

4. **Acesse seu app**
   ```
   https://camera-remota-pwa.vercel.app
   ```

### ✅ Vantagens
- Deploy em 30 segundos
- SSL automático
- CDN global
- GitHub integration (auto-deploy em push)

### ⚠️ Limitações
- 100 GB/mês de banda (plano gratuito)

---

## 📦 Opção 3: Netlify (Mais Flexível)

### Passos

1. **Instale a CLI**
   ```bash
   npm install -g netlify-cli
   ```

2. **Login**
   ```bash
   netlify login
   ```

3. **Deploy**
   ```bash
   cd camera-remota-pwa
   netlify deploy --prod --dir=.
   ```

4. **Acesse seu app**
   ```
   https://SEU_SITE.netlify.app
   ```

### Interface Web (Alternativa)

1. Acesse https://app.netlify.com/drop
2. Arraste a pasta `camera-remota-pwa` para a página
3. Aguarde o upload
4. Pronto! App está no ar

### ✅ Vantagens
- Drag-and-drop deploy
- SSL automático
- Formulários e funções serverless gratuitas
- 100 GB/mês de banda

---

## 📦 Opção 4: Firebase Hosting (Mais Escalável)

### Passos

1. **Instale a CLI**
   ```bash
   npm install -g firebase-tools
   ```

2. **Login**
   ```bash
   firebase login
   ```

3. **Initialize**
   ```bash
   cd camera-remota-pwa
   firebase init hosting
   ```

   Configurações:
   - **Public directory:** `.` (ponto)
   - **Single-page app:** `Yes`
   - **GitHub integration:** Opcional

4. **Deploy**
   ```bash
   firebase deploy --only hosting
   ```

5. **Acesse seu app**
   ```
   https://SEU_PROJETO.web.app
   ```

### ✅ Vantagens
- CDN global do Google
- 10 GB armazenamento
- 360 MB/dia de banda transferida
- Integração com Firebase Auth, Firestore, etc.

---

## 🔗 Conectar ao Backend

Depois do deploy, você precisa configurar a URL do backend.

### Opção A: Editar o Código (Permanente)

Edite `index.html` linha ~213:

```javascript
const API_BASE_URL = new URLSearchParams(window.location.search).get("api") || "https://SEU_BACKEND.herokuapp.com";
```

Depois faça deploy novamente.

### Opção B: Via Query String (Sem Editar Código)

Compartilhe o link assim:

```
https://seu-app.vercel.app/?api=https://seu-backend.com&session=abc123
```

---

## 📱 Testar Instalação PWA

### Android (Chrome/Edge)

1. Abra o app no navegador
2. Toque no botão **"⬇ Instalar App"**
3. Ou menu (⋮) → **"Adicionar à tela inicial"**

### iOS (Safari)

1. Abra o app no Safari
2. Botão **Compartilhar** → **"Adicionar à Tela de Início"**

---

## 🐛 Resolver Problemas Comuns

### Service Worker não registra

**Causa:** HTTPS não está ativo

**Solução:** Certifique-se de acessar via `https://` (todas as plataformas acima já fornecem HTTPS)

### Manifest.json não carrega

**Causa:** Content-Type incorreto

**Solução:** Os arquivos `vercel.json`, `netlify.toml` e `firebase.json` já resolvem isso

### PWA não atualiza

**Solução:**
1. DevTools → Application → Service Workers
2. Clique em **"Unregister"**
3. Recarregue a página

---

## 📊 Comparação de Plataformas

| Plataforma | Deploy | SSL | Banda/Mês | Melhor Para |
|------------|--------|-----|-----------|-------------|
| **GitHub Pages** | Médio | ✅ | 100 GB | Projetos open source |
| **Vercel** | Fácil | ✅ | 100 GB | Deploy rápido e CDN |
| **Netlify** | Fácil | ✅ | 100 GB | Formulários e funções |
| **Firebase** | Médio | ✅ | 360 MB/dia | Integração Google Cloud |

---

## ✅ Checklist Pós-Deploy

- [ ] App acessível via HTTPS
- [ ] Manifest carrega sem erros (DevTools → Application → Manifest)
- [ ] Service Worker registrado (DevTools → Application → Service Workers)
- [ ] Botão "Instalar App" aparece (após 2+ visitas)
- [ ] Câmera inicia quando clica em "Iniciar Câmera"
- [ ] Conecta ao backend quando fornece `?session=ID`

---

## 🎯 Próximo Passo

Compartilhe o link do app via QR Code no estúdio:

```javascript
// No studio.html, gere QR Code com:
const appUrl = `https://seu-app.vercel.app/?api=${API_BASE_URL}&session=${sessionId}`;
```

Pronto! Seu celular agora é uma câmera profissional wireless! 🎥📱
