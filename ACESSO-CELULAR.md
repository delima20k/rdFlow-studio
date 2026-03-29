# 📱 Como Acessar o PWA no Celular

## ✅ Servidor Configurado e Rodando!

O servidor está configurado para aceitar conexões de dispositivos na mesma rede Wi-Fi.

---

## 🌐 Endereços de Acesso

**No Computador (Local):**
```
http://localhost:3000
```

**No Celular (Mesma Rede Wi-Fi):**
```
http://192.168.31.81:3000
```

---

## 📋 Passo a Passo para Testar no Celular

### 1️⃣ Conectar na Mesma Rede Wi-Fi
- Certifique-se de que seu celular está conectado na **mesma rede Wi-Fi** que o computador
- Ambos devem estar na mesma rede (ex: Wi-Fi da casa/escritório)

### 2️⃣ Abrir no Navegador do Celular
- Abra o **Chrome** ou **Safari** no celular
- Digite na barra de endereço:
  ```
  http://192.168.31.81:3000
  ```
- Pressione **Enter**

### 3️⃣ Permitir Acesso à Câmera
- O navegador vai pedir permissão para acessar a câmera
- Clique em **Permitir** ou **Allow**
- A câmera do celular ficará disponível no sistema

### 4️⃣ (Opcional) Instalar como PWA
- No Chrome: Menu (⋮) → **Adicionar à tela inicial**
- No Safari: Compartilhar (📤) → **Adicionar à Tela de Início**
- O app ficará como ícone no celular

---

## 🎬 Formatos de Gravação Disponíveis

### 📱 Vertical (TikTok / Reels / Shorts)
- **TikTok Full HD:** 1080x1920 (melhor qualidade)
- **TikTok HD:** 720x1280 (boa qualidade, menor arquivo)
- **TikTok SD:** 480x854 (qualidade básica, arquivo pequeno)

### 🎥 Horizontal (YouTube / Paisagem)
- **YouTube 4K:** 3840x2160 (ultra HD, requer câmera 4K)
- **YouTube Full HD:** 1920x1080 (recomendado, melhor qualidade)
- **YouTube HD:** 1280x720 (boa qualidade, arquivo menor)
- **YouTube SD:** 640x480 (qualidade básica)

---

## 🔧 Solução de Problemas

### ❌ Celular não consegue acessar?
1. Verifique se estão na mesma rede Wi-Fi
2. Desative VPN no celular ou computador
3. Verifique se o firewall do Windows não está bloqueando a porta 3000
4. Tente reiniciar o roteador

### ❌ Câmera não aparece?
1. Dê permissão de câmera no navegador
2. Feche outros apps que podem estar usando a câmera
3. Reinicie o navegador no celular

### ❌ IP mudou?
- O IP pode mudar quando você reinicia o roteador
- Olhe no terminal do servidor para ver o IP atualizado
- Procure por: `🌐 Acesso na Rede:`

---

## 💡 Dicas de Uso

### Para TikTok/Reels
1. Selecione formato **📱 TikTok Full HD (1080x1920)**
2. Segure o celular na **vertical**
3. Grave seu vídeo
4. Baixe o arquivo
5. Faça upload no TikTok/Instagram

### Para YouTube
1. Selecione formato **🎬 YouTube Full HD (1920x1080)**
2. Segure o celular na **horizontal** (paisagem)
3. Grave seu vídeo
4. Baixe o arquivo
5. Faça upload no YouTube

### Para Usar o Celular como Webcam
1. Acesse pelo celular: `http://192.168.31.81:3000/phone-camera.html`
2. Permita acesso à câmera
3. No computador, clique em "📱 Celular" no estúdio
4. Escaneie o QR Code ou use o ID da sessão
5. A câmera do celular aparecerá ao vivo no computador

---

## 🚀 Recursos do Sistema

✅ Captura de tela do computador  
✅ Webcam do computador  
✅ Câmera do celular via rede Wi-Fi  
✅ Gravação em múltiplos formatos  
✅ Picture-in-Picture (PiP) para webcam  
✅ Controles de áudio profissionais  
✅ Medidores de volume estilo OBS  
✅ Detecção inteligente de dispositivos  
✅ Nomes customizados para dispositivos  

---

## 📞 Servidor Rodando

Se precisar reiniciar o servidor, execute no terminal:
```bash
npm run dev
```

O terminal mostrará o novo IP caso tenha mudado.

---

**Desenvolvido com ❤️ por DELIMA**
