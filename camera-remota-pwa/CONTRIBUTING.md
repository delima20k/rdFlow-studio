# 🤝 Contribuindo

Obrigado por considerar contribuir com o **Câmera Remota PWA**! 

---

## 📋 Como Contribuir

### 1. Reportar Bugs

Encontrou um bug? Abra uma issue com:

- **Título claro e descritivo**
- **Passos para reproduzir**
- **Comportamento esperado vs atual**
- **Screenshots/vídeos** (se aplicável)
- **Ambiente:**
  - Navegador e versão
  - Sistema operacional
  - Versão do PWA

**Exemplo:**

```markdown
**Descrição:** Botão de instalação não aparece no iOS Safari

**Passos:**
1. Abra o PWA no Safari (iOS 17.2)
2. Aguarde alguns segundos
3. Botão não aparece

**Esperado:** Botão "Instalar App" deve aparecer
**Atual:** Botão não é exibido

**Ambiente:**
- Safari 17.2
- iOS 17.2
- iPhone 14 Pro
```

---

### 2. Sugerir Funcionalidades

Tem uma ideia? Abra uma issue com:

- **Descrição clara** da funcionalidade
- **Caso de uso** (por que é útil)
- **Mockups/exemplos** (se possível)

**Exemplo:**

```markdown
**Funcionalidade:** Adicionar zoom digital

**Caso de uso:**
Usuários que querem aproximar objetos durante transmissão.

**Proposta:**
- Slider de zoom 1x até 3x
- Pinch-to-zoom no mobile
- Botões +/- para ajuste fino
```

---

### 3. Contribuir com Código

#### **Fork & Clone**

```bash
# Fork no GitHub (botão "Fork")
# Clone seu fork
git clone https://github.com/SEU_USUARIO/camera-remota-pwa.git
cd camera-remota-pwa
```

#### **Crie uma Branch**

```bash
git checkout -b feature/minha-feature
# ou
git checkout -b fix/meu-bugfix
```

#### **Faça suas Mudanças**

Siga as convenções do projeto:

- **HTML:** Semântico, acessível
- **CSS:** Variáveis CSS, mobile-first
- **JavaScript:** ES6+, sem dependências externas
- **Comentários:** Apenas onde necessário
- **Formatação:** 2 espaços de indentação

#### **Teste Localmente**

```bash
# Inicie o servidor
python -m http.server 8080

# Teste em:
# - Chrome Desktop
# - Chrome Mobile (via DevTools)
# - Safari iOS (se possível)
```

#### **Commit com Mensagens Claras**

```bash
git add .
git commit -m "feat: adiciona zoom digital"
# ou
git commit -m "fix: corrige botão de instalação no iOS"
```

**Convenção de commits:**

- `feat:` - Nova funcionalidade
- `fix:` - Correção de bug
- `docs:` - Documentação
- `style:` - Formatação (não afeta lógica)
- `refactor:` - Refatoração
- `test:` - Testes
- `chore:` - Manutenção

#### **Push & Pull Request**

```bash
git push origin feature/minha-feature
```

Abra um Pull Request no GitHub com:

- **Título descritivo**
- **Descrição do que foi alterado**
- **Issues relacionadas** (se houver)
- **Screenshots** (se mudanças visuais)

---

### 4. Melhorar Documentação

Documentação é tão importante quanto código!

- Corrigir erros de digitação
- Melhorar clareza
- Adicionar exemplos
- Traduzir para outros idiomas

---

## 📏 Padrões de Código

### **HTML**

```html
<!-- Semântico -->
<header class="header">
  <h1>Título</h1>
</header>

<!-- Acessível -->
<button aria-label="Fechar">✕</button>

<!-- Indentação 2 espaços -->
<div class="container">
  <p>Texto</p>
</div>
```

### **CSS**

```css
/* Variáveis CSS */
:root {
  --color-primary: #3b82f6;
}

/* Mobile-first */
.elemento {
  width: 100%;
}

@media (min-width: 768px) {
  .elemento {
    width: 50%;
  }
}

/* BEM ou classes descritivas */
.camera-container { }
.camera-container__preview { }
.camera-container__controls { }
```

### **JavaScript**

```javascript
// ES6+ (const/let, arrow functions, template strings)
const API_URL = "https://api.exemplo.com";

async function fetchData() {
  try {
    const response = await fetch(`${API_URL}/data`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Erro:", error);
  }
}

// Evite var, use const/let
// Evite callbacks aninhados, use async/await
// Nomes descritivos, não abreviações
```

---

## 🧪 Testes

### **Checklist Antes de Submeter**

- [ ] Código funciona localmente
- [ ] Sem erros no console
- [ ] Responsivo em mobile e desktop
- [ ] Service Worker não quebrado
- [ ] Manifest.json válido
- [ ] Lighthouse score > 90 (Performance, Acessibilidade, PWA)

### **Testar Lighthouse**

1. Abra DevTools (F12)
2. Aba "Lighthouse"
3. Selecione "Progressive Web App"
4. Clique "Analyze page load"
5. Score deve ser > 90

---

## 🎨 Design Guidelines

### **Cores**

Use variáveis CSS existentes:

```css
--bg-primary: #06070b;
--accent-blue: #3b82f6;
--text-primary: #ffffff;
```

### **Tipografia**

```css
--font-primary: "IBM Plex Sans", sans-serif;
--font-heading: "Space Grotesk", sans-serif;
```

### **Espaçamento**

```css
--spacing-sm: 8px;
--spacing-md: 12px;
--spacing-lg: 16px;
```

---

## 🚫 O Que NÃO Fazer

- ❌ Adicionar dependências externas (jQuery, React, etc.)
- ❌ Quebrar compatibilidade com navegadores listados
- ❌ Código sem comentários em lógica complexa
- ❌ Commit direto na branch `main`
- ❌ Pull Request sem descrição
- ❌ Ignorar feedback de code review

---

## 📝 Code Review

Todos os Pull Requests passam por revisão:

- Verificação de código
- Testes de funcionalidade
- Verificação de compatibilidade
- Lighthouse audit

Seja paciente e receptivo ao feedback!

---

## 🌍 Comunidade

- **Respeito:** Trate todos com respeito
- **Inclusão:** Todos são bem-vindos
- **Colaboração:** Ajude outros contribuidores
- **Paciência:** Nem todos têm o mesmo nível de experiência

---

## 📄 Licença

Ao contribuir, você concorda que suas contribuições serão licenciadas sob a [MIT License](LICENSE).

---

**Obrigado por tornar este projeto melhor! 🎉**
