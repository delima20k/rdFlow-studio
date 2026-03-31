# Guia Rápido - Estúdio de Captura

## Início Rápido

### 1. Inicie o servidor
```bash
npm run dev
```

### 2. Acesse o estúdio
Abra `http://localhost:3000/studio.html` no navegador

### 3. Ative suas fontes de captura

#### Captura de Tela + Áudio
- Clique em "🖥️ Tela + Áudio Sistema"
- Selecione a tela/janela a capturar
- Marque "Compartilhar áudio da aba" se disponível
- Confirme

#### Webcam
- Selecione a câmera no dropdown (se tiver múltiplas)
- Escolha a resolução (HD ou Full HD)
- Clique em "📹 Webcam"

#### Microfone
- Clique em "🎤 Microfone"
- Autorize o acesso ao microfone

#### Câmera do Celular
- Clique em "📱 Câmera do Celular"
- Escaneie o QR Code com seu celular
- No celular:
  - Selecione a câmera (frontal/traseira)
  - Clique em "Iniciar Câmera"
  - Autorize câmera e microfone
- A conexão ocorre automaticamente

### 4. Grave ou transmita

#### Gravação Local
1. Clique em "● Iniciar Gravação" (botão vermelho)
2. Grave o quanto precisar
3. Clique em "■ Parar Gravação"
4. Clique em "⬇ Baixar Última Gravação"
5. Arquivo `.webm` será baixado automaticamente

#### Transmissão ao vivo (RTMP → HLS)
1. Digite um título no campo "Título da transmissão"
2. Clique em "Criar Transmissão"
3. Clique em "📡 Iniciar Broadcast"
4. Configure o OBS com a URL RTMP fornecida
5. Inicie o streaming no OBS
6. Reproduza em `http://localhost:3000` ou via HLS player

### 5. Controle das fontes

- **Preview Principal**: mostra a fonte principal ativa
- **Previews individuais**: cada fonte tem seu próprio preview
- **Parar Todas Fontes**: desativa todas as capturas de uma vez

## Dicas

### Áudio do sistema não captura?
- Verifique se marcou "Compartilhar áudio da aba" ao selecionar a tela
- No Windows 11, certifique-se que o navegador tem permissão de áudio
- Teste em Chrome/Edge (melhor suporte)

### Câmera do celular não conecta?
- Certifique-se que celular e desktop estão na mesma rede
- Verifique se o firewall não está bloqueando
- Tente recarregar a página do celular

### Gravação não funciona?
- Certifique-se que pelo menos uma fonte de vídeo está ativa (tela ou webcam)
- Verifique espaço em disco
- Navegadores limitam gravação longa (use chunks menores)

### Múltiplas fontes
Atualmente o sistema grava a primeira fonte de vídeo ativa. Para mixagem:
- Use "Tela" para capturar tudo que está visível na tela
- Ou posicione as janelas de preview na tela e capture a tela completa

## Atalhos úteis

| Tecla | Ação |
|---|---|
| Esc | Cancela seleção de tela |
| F11 | Fullscreen no navegador |

## Formatos de saída

- **Gravação local**: `.webm` (VP9/Opus)
- **Streaming RTMP**: entrada H.264/AAC
- **Entrega HLS**: `.m3u8` + `.ts` (H.264/AAC)

## Conversão de .webm para .mp4

Se precisar converter a gravação para MP4:

```bash
ffmpeg -i gravacao.webm -c:v libx264 -preset fast -crf 22 -c:a aac -b:a 192k gravacao.mp4
```

## Resolução de problemas

### Erro "Falha ao capturar tela"
- Recarregue a página e tente novamente
- Verifique permissões do navegador em Configurações > Privacidade

### Erro "Falha ao acessar webcam"
- Feche outros apps que possam estar usando a câmera
- Verifique permissões do sistema operacional

### Preview congelado
- Clique em "Parar Todas Fontes"
- Reative as fontes desejadas

## Próximos passos

1. Explore combinação de múltiplas fontes
2. Teste gravação de sessões longas
3. Configure OBS para streaming profissional
4. Conecte múltiplos celulares (quando disponível)
