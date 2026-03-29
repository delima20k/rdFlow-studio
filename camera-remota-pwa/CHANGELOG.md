# 📝 Changelog

Todas as mudanças notáveis neste projeto serão documentadas aqui.

O formato segue o padrão [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/).

---

## [1.0.0] - 2026-03-25

### ✨ Adicionado

- PWA completo com Service Worker e Web App Manifest
- Captura de câmera frontal e traseira
- Captura de áudio integrado
- Conexão WebRTC peer-to-peer
- Signaling via REST API
- Seleção de câmera (dispositivos múltiplos)
- Troca rápida de câmera (frontal/traseira)
- Botão de instalação PWA nativo
- Suporte offline após primeira instalação
- QR Code para conexão rápida
- Interface responsiva (mobile-first)
- Tema dark mode
- Ícones SVG otimizados (192px e 512px)
- Scripts de inicialização (start.sh, start.bat)
- Servidor HTTP standalone (server.js)
- Configuração para múltiplas plataformas:
  - GitHub Pages (deploy.yml)
  - Vercel (vercel.json)
  - Netlify (netlify.toml)
  - Firebase (firebase.json)

### 📚 Documentação

- README.md - Documentação completa
- INICIO-RAPIDO.md - Guia de início rápido
- DEPLOY.md - Guia de deploy detalhado
- INTEGRACAO.md - Integração com backend
- SPECS.md - Especificações técnicas
- EXEMPLOS.html - Casos de uso reais
- LICENSE - Licença MIT
- CHANGELOG.md - Este arquivo

### 🎨 Design

- Paleta de cores dark theme
- Tipografia: IBM Plex Sans + Space Grotesk
- Screenshot SVG
- Diagrama de fluxo de conexão SVG
- Ícones gradiente (azul/roxo)

### 🔧 Técnico

- HTML5 semântico
- CSS3 com CSS Variables
- JavaScript ES6+ (zero dependências)
- MediaDevices API para captura
- WebRTC API para transmissão
- Service Worker API para cache
- Fetch API para signaling
- Cache-first strategy
- STUN server do Google
- Resolução adaptativa (até 1920x1080)

### 🌐 Compatibilidade

- Chrome/Edge 90+
- Safari 14.5+
- Firefox 88+
- Android Chrome 90+
- iOS Safari 14.5+

---

## [Unreleased]

### 🚧 Planejado

- [ ] TURN server integration para redes corporativas
- [ ] Upload de gravações para backend
- [ ] Filtros e efeitos de câmera
- [ ] Marca d'água customizável
- [ ] Configuração de bitrate manual
- [ ] Estatísticas de conexão em tempo real
- [ ] Notificações push
- [ ] Multi-idioma (i18n)
- [ ] Suporte a múltiplas sessões simultâneas
- [ ] Gravação local no PWA
- [ ] Download de gravações
- [ ] Modo picture-in-picture
- [ ] Zoom digital
- [ ] Flash/lanterna
- [ ] Grid de composição
- [ ] Configurações persistentes (localStorage)

### 🐛 Correções Futuras

- Melhorar tratamento de erros de permissão
- Fallback para resoluções não suportadas
- Otimizar reconexão após perda de rede
- Melhorar feedback visual de estados

---

## Convenções de Versão

Este projeto usa [Semantic Versioning](https://semver.org/):

- **MAJOR** (X.0.0): Mudanças incompatíveis com versões anteriores
- **MINOR** (1.X.0): Novas funcionalidades compatíveis
- **PATCH** (1.0.X): Correções de bugs

---

## Tipos de Mudanças

- **✨ Adicionado**: Novas funcionalidades
- **🔧 Alterado**: Mudanças em funcionalidades existentes
- **🗑️ Depreciado**: Funcionalidades que serão removidas
- **❌ Removido**: Funcionalidades removidas
- **🐛 Corrigido**: Correções de bugs
- **🔒 Segurança**: Correções de vulnerabilidades

---

**Projeto criado em:** Março de 2026  
**Desenvolvido com:** HTML, CSS e JavaScript puro (zero dependências)
