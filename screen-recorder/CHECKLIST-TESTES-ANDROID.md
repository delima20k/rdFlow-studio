# ✅ CHECKLIST DE TESTES - EXPORTAÇÃO DE VÍDEO MOBILE

## 📋 PRÉ-REQUISITOS

- [ ] Android 5.0+ (API 21+) ou dispositivo físico
- [ ] Emulador Android configurado (Android Studio)
- [ ] Cabo USB para conexão com celular
- [ ] ADB (Android Debug Bridge) instalado
- [ ] Navegador Chrome ou Firefox instalado no celular
- [ ] Espaço de armazenamento disponível (mín. 500 MB)

---

## 🔧 FASE 1: PREPARAÇÃO DO AMBIENTE

### 1.1 Configurar Dispositivo Android

- [ ] Ativar **Modo Desenvolvedor** no Android
  - Acessar: Configurações → Sobre o telefone
  - Tocar 7 vezes em "Número da versão"
  
- [ ] Ativar **Depuração USB**
  - Configurações → Opções do desenvolvedor → Depuração USB

- [ ] Conectar celular via USB ao computador

- [ ] Verificar conexão ADB:
  ```bash
  adb devices
  ```
  Deve exibir o dispositivo conectado

### 1.2 Configurar Servidor de Desenvolvimento

- [ ] Obter IP local da máquina:
  ```bash
  # Windows
  ipconfig
  
  # Linux/Mac
  ifconfig
  ```

- [ ] Iniciar servidor HTTP local:
  ```bash
  # Na pasta do projeto
  cd c:\Users\delim\Desktop\api-s\screen-recorder
  
  # Iniciar servidor (Python)
  python -m http.server 8080
  
  # OU Node.js
  npx http-server -p 8080
  ```

- [ ] Anotar URL de acesso:
  ```
  http://SEU_IP_LOCAL:8080
  ```

### 1.3 Configurar Port Forwarding (Alternativa)

- [ ] Usar ADB para mapear porta:
  ```bash
  adb reverse tcp:8080 tcp:8080
  ```
  
- [ ] Acessar no celular via:
  ```
  http://localhost:8080
  ```

---

## 🧪 FASE 2: TESTES DE CODECS E COMPATIBILIDADE

### 2.1 Verificar Suporte de Codecs no Browser Mobile

- [ ] Abrir Chrome no celular
- [ ] Acessar a aplicação
- [ ] Abrir DevTools Remote (Chrome desktop → More Tools → Remote Devices)
- [ ] Executar no console:
  ```javascript
  ExportExamples.checkCodecSupport()
  ```

- [ ] Anotar codecs suportados:
  - [ ] H.264 + AAC (MP4): ✅ / ❌
  - [ ] VP8 + Opus (WebM): ✅ / ❌
  - [ ] VP9 + Opus (WebM): ✅ / ❌

**ESPERADO:** Pelo menos um codec deve estar disponível

---

## 🎬 FASE 3: TESTES DE EXPORTAÇÃO

### 3.1 Exportação de Vídeo Simples

- [ ] Carregar vídeo de teste (horizontal 16:9)
- [ ] Posicionar vídeo (centro, topo ou base)
- [ ] Verificar preview no editor
- [ ] Clicar em "Exportar"
- [ ] Aguardar barra de progresso (0% → 100%)
- [ ] Verificar download automático

**Validações:**
- [ ] Download iniciou automaticamente
- [ ] Arquivo salvo em Downloads/
- [ ] Nome do arquivo: `video_final_1080x1920_*.mp4`

### 3.2 Exportação com Webcam + Overlays

- [ ] Carregar vídeo principal
- [ ] Ativar webcam overlay
- [ ] Posicionar webcam no canvas
- [ ] Adicionar texto/emoji
- [ ] Verificar preview completo
- [ ] Exportar vídeo
- [ ] Confirmar download

**Validações:**
- [ ] Webcam visível no vídeo exportado
- [ ] Posição da webcam correta
- [ ] Textos/emojis presentes
- [ ] Ordem de camadas respeitada (vídeo → webcam → overlays)

### 3.3 Testes de Posicionamento

Exportar vídeos com posições diferentes:

- [ ] **Posição Topo:**
  - Vídeo alinhado ao topo do canvas
  - Área inferior do vídeo cortada (se necessário)
  
- [ ] **Posição Centro:**
  - Vídeo centralizado verticalmente
  - Recorte balanceado em cima e embaixo

- [ ] **Posição Base:**
  - Vídeo alinhado à base do canvas
  - Área superior do vídeo cortada (se necessário)

---

## 📱 FASE 4: VALIDAÇÃO NO DISPOSITIVO ANDROID

### 4.1 Verificar Arquivo Exportado

- [ ] Abrir app **Galeria** ou **Arquivos**
- [ ] Navegar até pasta Downloads/
- [ ] Localizar arquivo `video_final_1080x1920_*.mp4`
- [ ] Verificar tamanho do arquivo (> 1 MB)

### 4.2 Reprodução Nativa no Android

- [ ] Abrir vídeo na **Galeria**
- [ ] Tocar para reproduzir

**Validações Críticas:**
- [ ] Vídeo abre sem erro
- [ ] Reprodução inicia imediatamente (faststart ok)
- [ ] Vídeo ocupa **TODA** a tela vertical (sem faixas pretas)
- [ ] Aspect ratio correto (9:16)
- [ ] Qualidade visual boa (sem pixelização)
- [ ] Áudio sincronizado com vídeo
- [ ] Duração correta

### 4.3 Verificar Metadados

- [ ] Usar app **VLC** ou **MediaInfo** (Android)
- [ ] Abrir o vídeo exportado
- [ ] Verificar informações:
  ```
  Resolução: 1080x1920 ✅
  Codec Vídeo: H.264 / AVC ✅
  Codec Áudio: AAC ✅
  Bitrate Vídeo: ~8 Mbps ✅
  Bitrate Áudio: ~128 kbps ✅
  FPS: 30 ✅
  ```

### 4.4 Testar Rotação de Tela

- [ ] Reproduzir vídeo em modo retrato (vertical)
- [ ] Vídeo preenche a tela completamente
- [ ] Rotacionar para modo paisagem (horizontal)
- [ ] Verificar comportamento (pillarbox esperado)

---

## 📤 FASE 5: COMPATIBILIDADE COM APPS SOCIAIS

### 5.1 WhatsApp

- [ ] Abrir WhatsApp
- [ ] Criar nova conversa (ou grupo de teste)
- [ ] Anexar vídeo exportado
- [ ] Enviar para si mesmo
- [ ] Reproduzir vídeo recebido

**Validações:**
- [ ] WhatsApp aceita o vídeo (não comprime demais)
- [ ] Reprodução em tela cheia sem faixas pretas
- [ ] Qualidade mantida (bitrate ok)

### 5.2 Instagram Reels

- [ ] Abrir Instagram
- [ ] Criar novo Reel
- [ ] Selecionar vídeo exportado
- [ ] Verificar preview no editor do Instagram

**Validações:**
- [ ] Instagram aceita o vídeo sem erro
- [ ] Vídeo preenche o frame do Reel (9:16)
- [ ] Sem faixas pretas

### 5.3 TikTok

- [ ] Abrir TikTok
- [ ] Criar novo vídeo
- [ ] Fazer upload do vídeo exportado
- [ ] Verificar preview

**Validações:**
- [ ] TikTok aceita o vídeo
- [ ] Vídeo centralizado corretamente
- [ ] Sem bordas pretas

### 5.4 YouTube Shorts

- [ ] Abrir YouTube
- [ ] Criar novo Short
- [ ] Fazer upload do vídeo exportado
- [ ] Verificar preview

**Validações:**
- [ ] YouTube aceita formato vertical
- [ ] Vídeo preenche tela do Short
- [ ] Qualidade mantida após processamento

---

## 🐛 FASE 6: TESTES DE CENÁRIOS DE ERRO

### 6.1 Vídeo Muito Curto

- [ ] Exportar vídeo com < 1 segundo
- [ ] Verificar se validação detecta

**Esperado:** Validação deve alertar ou bloquear

### 6.2 Vídeo Sem Áudio

- [ ] Exportar vídeo sem track de áudio
- [ ] Verificar se exporta corretamente

**Esperado:** Vídeo sem áudio mas reproduzível

### 6.3 Resolução Incorreta

Se resolver forçar resolução errada (teste técnico):

- [ ] Modificar ExportConfig para 1920x1080
- [ ] Tentar exportar
- [ ] Verificar se validador bloqueia

**Esperado:** ExportValidator detecta e rejeita

### 6.4 Codec Não Suportado

- [ ] Simular browser sem H.264
- [ ] Verificar fallback para WebM
- [ ] Validar warning de conversão necessária

**Esperado:** Sistema usa VP8/VP9 e alerta usuário

---

## 🔍 FASE 7: TESTES DE PERFORMANCE

### 7.1 Vídeo Curto (< 10s)

- [ ] Exportar vídeo de 5-10 segundos
- [ ] Medir tempo de exportação
- [ ] Verificar consumo de memória (DevTools)

**Esperado:** 
- Tempo < 30 segundos
- Memória < 500 MB

### 7.2 Vídeo Médio (30s-1min)

- [ ] Exportar vídeo de 30-60 segundos
- [ ] Medir tempo de exportação
- [ ] Monitor ar progresso (deve atualizar suavemente)

**Esperado:**
- Tempo proporcional (1-2 minutos)
- Barra de progresso fluida

### 7.3 Vídeo Longo (2-5min)

- [ ] Exportar vídeo de 2-5 minutos
- [ ] Verificar se browser não trava
- [ ] Monitorar uso de CPU

**Esperado:**
- Exportação completa sem crash
- UI responsiva durante processo
- Tempo < 5x duração do vídeo

---

## 📊 FASE 8: VALIDAÇÃO AUTOMÁTICA

### 8.1 Executar Validador

Após cada exportação, verificar:

```javascript
// No console do browser
const result = await orchestrator.export(editorState);
console.log(result.validation);
```

**Checklist do ValidationResult:**
- [ ] `valid === true`
- [ ] `errors.length === 0`
- [ ] `metadata.resolution === {width: 1080, height: 1920}`
- [ ] `metadata.aspectRatio === 0.5625` (±0.01)
- [ ] `metadata.duration` corresponde ao vídeo original (±0.5s)
- [ ] `metadata.codecs.video` é H.264 ou VP8
- [ ] `metadata.codecs.audio` é AAC ou Opus
- [ ] `metadata.fileSize > 1024` (não vazio)
- [ ] `metadata.canPlay === true`

---

## 🚀 FASE 9: INSTALAÇÃO VIA USB (OPCIONAL)

Se quiser testar como PWA instalado:

### 9.1 Instalar via ADB

```bash
# Gerar APK ou usar Chrome Custom Tabs
adb install -r app.apk
```

### 9.2 Testar PWA Offline

- [ ] Ativar modo avião no celular
- [ ] Abrir PWA instalado
- [ ] Verificar se cache funciona
- [ ] Tentar exportar vídeo offline (se aplicável)

---

## 📝 FASE 10: DOCUMENTAÇÃO DE BUGS

Para cada bug encontrado, documentar:

```markdown
### BUG #N - [Título Curto]

**Descrição:**
[O que aconteceu]

**Passos para Reproduzir:**
1. [Passo 1]
2. [Passo 2]
3. [Etc.]

**Resultado Esperado:**
[O que deveria acontecer]

**Resultado Atual:**
[O que aconteceu de fato]

**Dispositivo:**
- Modelo: [Ex: Samsung Galaxy S21]
- Android: [Ex: 12]
- Browser: [Ex: Chrome 110]

**Logs:**
```
[Cole logs do console aqui]
```

**Evidências:**
[Screenshots ou vídeos do bug]
```

---

## ✅ CRITÉRIOS DE ACEITAÇÃO FINAL

O sistema será considerado **PRONTO PARA PRODUÇÃO** se:

- [ ] ✅ 100% dos vídeos exportados abrem no celular Android
- [ ] ✅ 100% dos vídeos ocupam toda a tela vertical (9:16) sem faixas pretas
- [ ] ✅ 100% dos vídeos têm resolução EXATA de 1080x1920
- [ ] ✅ 100% dos vídeos são aceitos pelo WhatsApp sem reprocessamento pesado
- [ ] ✅ 90%+ dos vídeos são aceitos por Instagram/TikTok/YouTube sem erro
- [ ] ✅ Tempo de exportação < 2x duração do vídeo (vídeos até 2 minutos)
- [ ] ✅ 0 crashes durante exportação (estabilidade 100%)
- [ ] ✅ Validador detecta e bloqueia 100% dos vídeos com erro
- [ ] ✅ Layout exportado é 100% idêntico ao preview do editor

---

## 🔧 COMANDOS ÚTEIS

### ADB
```bash
# Listar dispositivos
adb devices

# Port forwarding
adb reverse tcp:8080 tcp:8080

# Transferir arquivo para celular
adb push video.mp4 /sdcard/Download/

# Transferir arquivo do celular
adb pull /sdcard/Download/video.mp4 ./

# Ver logs em tempo real
adb logcat | grep Chrome

# Abrir URL no Chrome mobile
adb shell am start -a android.intent.action.VIEW -d "http://localhost:8080"
```

### Inspeção Remota (Chrome)
```
chrome://inspect#devices
```

### FFprobe (Verificar Metadados no PC)
```bash
ffprobe -v error -show_format -show_streams video_final_1080x1920.mp4
```

---

## 📞 SUPORTE

Se encontrar qualquer problema, documente conforme template acima e:

1. Verifique logs do console (F12 → Console)
2. Verifique logs do ADB (`adb logcat`)
3. Capture screenshots/vídeos do problema
4. Anote modelo do dispositivo e versão do Android
5. Reporte no repositório GitHub ou crie issue

---

**Última atualização:** 29/03/2026  
**Responsável:** DELIMA  
**Versão do Sistema:** 1.0.0
