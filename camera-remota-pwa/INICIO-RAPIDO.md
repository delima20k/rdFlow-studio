# ⚡ Início Rápido

Comece em 2 minutos!

---

## 🎯 Testar Localmente (Desenvolvimento)

### **Opção 1: Python**

```bash
cd camera-remota-pwa
python -m http.server 8080
```

Ou use o script pronto:
```bash
# Linux/Mac
bash start.sh

# Windows
start.bat
```

Abra: `http://localhost:8080`

### **Opção 2: Node.js**

```bash
cd camera-remota-pwa
node server.js
```

Abra: `http://localhost:8080`

---

## 🚀 Publicar (Produção)

### **GitHub Pages** (Mais Fácil)

1. Crie repositório em https://github.com/new
2. Faça upload desta pasta
3. Settings → Pages → Source: `main`
4. Aguarde 2 min
5. Acesse: `https://SEU_USUARIO.github.io/NOME_REPO/`

### **Vercel** (Mais Rápido)

```bash
npm install -g vercel
vercel --prod
```

Pronto! URL gerada automaticamente.

### **Netlify** (Drag & Drop)

1. Acesse: https://app.netlify.com/drop
2. Arraste a pasta `camera-remota-pwa`
3. Pronto!

---

## 🔗 Conectar ao Backend

Edite `index.html` linha ~213 ou use query string:

```
https://seu-pwa.vercel.app/?api=http://192.168.0.100:3000&session=abc123
```

---

## 📱 Instalar no Celular

### Android
1. Abra o PWA no Chrome
2. Toque em **"⬇ Instalar App"**

### iOS
1. Abra o PWA no Safari
2. Compartilhar → **"Adicionar à Tela de Início"**

---

## 📚 Documentação Completa

- [README.md](README.md) - Documentação completa
- [DEPLOY.md](DEPLOY.md) - Guia detalhado de deploy
- [INTEGRACAO.md](INTEGRACAO.md) - Integrar com backend
- [EXEMPLOS.html](EXEMPLOS.html) - Casos de uso reais

---

## 🎥 Fluxo de Uso

1. **Desktop:** Abre `studio.html` → Clica "📱 Câmera do Celular"
2. **Celular:** Escaneia QR Code → Permite câmera → Clica "Iniciar Câmera"
3. **Pronto!** Vídeo transmitindo em tempo real via WebRTC

---

**Dúvidas?** Leia [README.md](README.md) ou [INTEGRACAO.md](INTEGRACAO.md)
