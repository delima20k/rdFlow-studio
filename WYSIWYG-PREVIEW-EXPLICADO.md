# ✅ Sistema WYSIWYG - Preview vs Exportação

> **Data**: 28/03/2026  
> **Autor**: DELIMA  
> **Conceito**: What You See Is What You Get

---

## 🎯 Pergunta

**O preview-canvas mostra como o vídeo final vai ficar?**

### Resposta: **SIM! ✅**

O preview mostra **EXATAMENTE** como o vídeo exportado vai ficar, pixel por pixel (proporcionalmente).

---

## 🔧 Como Funciona

### Sistema de Coordenadas Normalizadas

Todo o sistema usa **coordenadas normalizadas (0-1)** ao invés de pixels fixos:

```javascript
// ❌ ERRADO (pixels fixos - não escala):
layer.x = 100;      // 100 pixels da esquerda
layer.y = 200;      // 200 pixels do topo
layer.width = 300;  // 300 pixels de largura

// ✅ CORRETO (normalizado - escala automaticamente):
layer.x = 0.1;      // 10% da largura
layer.y = 0.2;      // 20% da altura
layer.width = 0.3;  // 30% da largura
```

### Conversão Automática

A classe `Layer` converte automaticamente:

```javascript
toCanvasCoordinates(canvasWidth, canvasHeight) {
  return {
    x: this.x * canvasWidth,        // 0.1 * 360 = 36px (preview)
                                     // 0.1 * 1080 = 108px (export)
    y: this.y * canvasHeight,       // 0.2 * 640 = 128px (preview)
                                     // 0.2 * 1920 = 384px (export)
    width: this.width * canvasWidth * this.scale,
    height: this.height * canvasHeight * this.scale
  };
}
```

**Resultado**: Mesma posição relativa em qualquer resolução! 

---

## 📺 Preview vs Exportação

| Aspecto | Preview | Exportação | Igual? |
|---------|---------|------------|--------|
| **Resolução** | 360×640 | 1080×1920 | ❌ |
| **Proporção** | 9:16 | 9:16 | ✅ |
| **Engine** | `renderEngine.renderFrame()` | `renderEngine.renderFrame()` | ✅ |
| **Camadas** | Mesmas camadas | Mesmas camadas | ✅ |
| **Posição relativa** | Normalizada 0-1 | Normalizada 0-1 | ✅ |
| **FitMode** | `cover` | `cover` | ✅ |
| **Elementos** | Texto, emoji, webcam | Texto, emoji, webcam | ✅ |

**Escala**: 1080÷360 = **3×** (cada pixel do preview = 3 pixels na exportação)

---

## 🎨 Exemplo Prático

### Texto no Topo

```javascript
const textLayer = new OverlayLayer(editorEngine.generateId(), 'text', 'Meu Título');
textLayer.x = 0.5;        // Centro horizontal
textLayer.y = 0.1;        // 10% do topo
textLayer.fontSize = 0.04; // 4% da largura
```

#### No Preview (360×640):
- `x = 0.5 * 360 = 180px` (centro)
- `y = 0.1 * 640 = 64px` (10% do topo)
- `fontSize = 0.04 * 360 = 14.4px`

#### Na Exportação (1080×1920):
- `x = 0.5 * 1080 = 540px` (centro)
- `y = 0.1 * 1920 = 192px` (10% do topo)
- `fontSize = 0.04 * 1080 = 43.2px`

**Posição relativa**: Idêntica! Centro horizontal, 10% do topo. ✅

---

## 🖼️ Indicadores Visuais

Agora o preview mostra claramente que é WYSIWYG:

```
┌─────────────────────────────┐
│ FPS: 60      ✓ WYSIWYG      │ ← Indicador verde
│                             │
│                             │
│      PREVIEW CANVAS         │
│       (360×640)             │
│                             │
│                             │
│ PREVIEW     EXPORTAÇÃO      │
│ 360×640     1080×1920       │ ← Info de resolução
└─────────────────────────────┘
```

### Badges:
1. **✓ WYSIWYG** (verde): Confirma que preview = exportação
2. **FPS: XX** (azul): Taxa de atualização do preview
3. **PREVIEW 360×640** (verde): Resolução do preview
4. **EXPORTAÇÃO 1080×1920** (laranja): Resolução final

---

## 🧪 Como Validar

### Teste 1: Adicionar Texto

1. Adicione texto no centro do preview
2. Observe a posição no preview-canvas
3. Exporte o vídeo
4. Abra o vídeo exportado
5. **Resultado**: Texto no mesmo lugar (centro)

### Teste 2: Webcam no Canto

1. Adicione webcam PiP no canto superior direito (x:0.75, y:0.05)
2. Observe no preview: canto superior direito
3. Exporte o vídeo
4. **Resultado**: Webcam no mesmo lugar (canto superior direito)

### Teste 3: Emoji Embaixo

1. Adicione emoji em (x:0.5, y:0.9)
2. Observe no preview: centro horizontal, 90% abaixo
3. Exporte o vídeo
4. **Resultado**: Emoji na mesma posição relativa

---

## 🎯 Garantias do Sistema

### 1. Mesma Engine de Renderização

```javascript
// Preview em tempo real
function renderPreviewLoop() {
  renderEngine.renderFrame(previewCtx, previewCanvas.width, previewCanvas.height);
  requestAnimationFrame(renderPreviewLoop);
}

// Exportação
const renderFrame = (timestamp) => {
  renderEngine.renderFrame(ctx, canvas.width, canvas.height);
  requestAnimationFrame(renderFrame);
};
```

**Mesma função `renderEngine.renderFrame()` nos dois casos!**

### 2. Mesmas Camadas

```javascript
// Ambos usam editorEngine.layers
for (const layer of this.editorEngine.layers) {
  if (layer.visible) {
    layer.render(ctx, canvasWidth, canvasHeight);
  }
}
```

**Mesma lista de camadas renderizada!**

### 3. Coordenadas Normalizadas

```javascript
// Todas as posições são relativas (0-1)
layer.x = 0.5;      // 50% (centro)
layer.y = 0.1;      // 10% do topo
layer.width = 0.3;  // 30% da largura
```

**Escala automática para qualquer resolução!**

---

## 🔬 Matemática por Trás

### Propriedade de Similaridade

```
Preview (360×640):
- Elemento em x=0.5, y=0.1
- Pixels: (180, 64)

Exportação (1080×1920):
- Elemento em x=0.5, y=0.1
- Pixels: (540, 192)

Relação:
540 ÷ 180 = 3
192 ÷ 64 = 3

Fator de escala: 3× em ambas as dimensões
Proporção mantida: 9:16 em ambos
```

**Teorema da Uniformidade**:  
Se duas resoluções têm a mesma proporção (aspect ratio), coordenadas normalizadas mantêm a posição relativa idêntica.

---

## ⚠️ Quando Pode Haver Diferença

### Fonte de Vídeo com Proporção Diferente

Se o vídeo original não for 9:16:

```javascript
// Vídeo landscape 16:9 (1920×1080)
// fitMode = 'cover'
// Resultado: Corta topo e base

// Preview (360×640 - 9:16):
// - Corta topo/base proporcionalmente

// Exportação (1080×1920 - 9:16):
// - Corta topo/base proporcionalmente

// Mesmo corte relativo: ✅
```

**Coordenadas normalizadas garantem mesmo crop relativo!**

### Qualidade de Renderização

```
Preview: 360×640 = 230.400 pixels
Exportação: 1080×1920 = 2.073.600 pixels

Diferença: 9× mais pixels na exportação
```

**Mesma posição, maior qualidade na exportação!**

---

## 📝 Logs do Console

Ao abrir o editor, você verá:

```
[Editor] Engine OOP inicializado ✅
[Editor] Iniciando preview em tempo real...
[Editor] 📺 PREVIEW (360x640) → 📱 EXPORTAÇÃO (1080x1920)
[Editor] ✓ WYSIWYG: O que você vê é o que será exportado (mesma proporção 9:16)
[Editor] 🎨 Coordenadas normalizadas garantem posicionamento idêntico
```

Ao exportar:

```
[ExportManager] Iniciando exportação...
[ExportManager] Resolução de exportação: 1080x1920 (9:16 Full HD)
[ExportManager] Fonte: 1920x1080
```

---

## ✅ Conclusão

### O preview-canvas mostra como o vídeo final vai ficar?

# **SIM! 🎯**

### Por que?

1. ✅ Mesma engine de renderização (`renderEngine.renderFrame()`)
2. ✅ Mesmas camadas (`editorEngine.layers`)
3. ✅ Mesma proporção (9:16)
4. ✅ Coordenadas normalizadas (escala automática)
5. ✅ Mesmo fitMode (`cover`)
6. ✅ Mesmos elementos renderizados

### Diferença:

- **Resolução**: 360×640 (preview) vs 1080×1920 (export)
- **Qualidade**: Menor (preview) vs Maior (export)

### Posição, layout e composição:

# **100% IDÊNTICOS! ✓**

---

**Assinatura**: DELIMA — WYSIWYG garantido por arquitetura orientada a objetos. ✅
