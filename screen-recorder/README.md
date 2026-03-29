# Screen Recorder Module

Módulo profissional de composição e exportação de vídeo para gravação de tela do Windows.

## Características

- Gravação de tela do Windows
- Gravação de webcam
- Captura de áudio do sistema
- Captura de áudio do microfone
- Composição em múltiplos formatos:
  - YouTube (16:9 - 1920x1080)
  - TikTok (9:16 - 1080x1920)
  - Shorts/Reels (9:16 - 1080x1920)
- Preview em tempo real antes da exportação
- Exportação em MP4

## Arquitetura

```
/src
  /core       - Facades e orquestradores principais
  /capture    - Classes de captura de mídia
  /composition - Motor de composição e timeline
  /export     - Exportação de vídeo
  /presets    - Presets de layout
  /ui         - Componentes de interface
  /models     - Entidades e modelos de dados
  /utils      - Utilitários e helpers
```

## Princípios de Design

- **Orientação a Objetos**: Encapsulamento, herança, composição
- **Separação de Responsabilidades**: Cada classe tem uma única razão de existir
- **Baixo Acoplamento**: Mudanças isoladas não quebram outras partes
- **Alta Coesão**: Elementos relacionados juntos
- **Extensibilidade**: Arquitetura preparada para novos formatos e features

## Fluxo de Uso

1. Usuário escolhe formato (YouTube, TikTok, Shorts)
2. Usuário configura fontes (webcam, microfone, áudio do sistema)
3. Sistema grava cada fonte separadamente
4. Sistema mostra preview da composição
5. Sistema exporta vídeo final compilado
