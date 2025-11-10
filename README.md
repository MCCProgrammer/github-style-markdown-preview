# GitHub Style Markdown Preview

Uma extensão para Visual Studio Code que permite visualizar ficheiros Markdown no estilo GitHub, com suporte para temas dark e light, atualização automática em tempo real e várias opções de personalização.

## ✨ Funcionalidades

- 🎨 **Preview Estilo GitHub**: Visualize ficheiros Markdown com o estilo GitHub oficial
- 🌓 **Temas Dark/Light**: Alterna entre temas dark e light com um clique
- 🔄 **Atualização Automática**: A preview atualiza automaticamente enquanto edita o ficheiro
- 💾 **Preferências por Ficheiro**: Cada ficheiro guarda a sua preferência de tema
- 🚀 **Auto-Open**: Abre a preview automaticamente quando abre um ficheiro Markdown
- 🖥️ **Preview no Browser**: Opção para abrir a preview no navegador externo
- 📁 **Múltiplos Ficheiros**: Suporta várias previews abertas simultaneamente
- 🎯 **Proteção de Coluna**: Mantém a preview numa coluna dedicada

## 🚀 Instalação

1. Abra o VS Code
2. Vá para a secção de Extensões (`Ctrl+Shift+X` ou `Cmd+Shift+X`)
3. Procure por "GitHub Style Markdown Preview"
4. Clique em "Install"

## 📖 Como Usar

### Abrir a Preview

Existem três formas de abrir a preview:

1. **Botão no Editor**: Clique no botão "Open Markdown Preview" na barra de título do editor
2. **Atalho de Teclado**: Pressione `Alt+R` (Windows/Linux) ou `Opt+R` (Mac)
3. **Command Palette**: Pressione `F1` ou `Ctrl+Shift+P` e digite "Open Markdown Preview"

### Alternar Tema

1. **Botão na Preview**: Clique no botão 🌙/☀️ no canto superior direito
2. **Atalho de Teclado**: Pressione `Ctrl+Shift+T` (Windows/Linux) ou `Cmd+Shift+T` (Mac)
3. **Command Palette**: Digite "Toggle Preview Theme"

## ⚙️ Configurações

A extensão suporta as seguintes configurações:

### `github-style-markdown-preview.autoOpen`
Abre automaticamente a preview quando um ficheiro Markdown é aberto.

**Padrão**: `false`

```json
{
  "github-style-markdown-preview.autoOpen": true
}
```

### `github-style-markdown-preview.updateDelay`
Delay em milissegundos antes de atualizar a preview após editar (debouncing).

**Padrão**: `300`

```json
{
  "github-style-markdown-preview.updateDelay": 500
}
```

### `github-style-markdown-preview.supportedFiles`
Padrões de ficheiros suportados (sintaxe glob).

**Padrão**: `["*.md"]`

```json
{
  "github-style-markdown-preview.supportedFiles": [
    "*.md",
    "*.markdown",
    "README*"
  ]
}
```

### `github-style-markdown-preview.protectPreviewColumn`
Protege a coluna da preview (coluna 2) de outros ficheiros.

**Padrão**: `false`

```json
{
  "github-style-markdown-preview.protectPreviewColumn": true
}
```

### `github-style-markdown-preview.openInBrowser`
Mostra um botão "Web" na preview do IDE para abrir no navegador externo.

**Padrão**: `false`

```json
{
  "github-style-markdown-preview.openInBrowser": true
}
```

**Nota**: 
- Quando ativado, aparece um botão "🌐 Web" na preview do IDE
- Ao clicar no botão, abre a preview no navegador e fecha a preview do IDE
- O browser preview usa o tema preferido guardado (não tem botão de toggle dark/light mode)
- Requer um workspace aberto para funcionar corretamente (cria ficheiro HTML temporário na pasta `.vscode`)

### `github-style-markdown-preview.maxWidth`
Largura máxima do conteúdo na preview (em pixels). Use `"auto"` para largura total.

**Padrão**: `980` (pixels)

**Nota**: O GitHub usa 980px como largura padrão.

```json
{
  "github-style-markdown-preview.maxWidth": 980
}
```

Ou para largura total:
```json
{
  "github-style-markdown-preview.maxWidth": "auto"
}
```

### `github-style-markdown-preview.enableEmoji`
Ativa a renderização de emojis (ex: :smile:, :heart:). Aplica-se tanto à preview do IDE quanto à do browser.

**Padrão**: `true`

```json
{
  "github-style-markdown-preview.enableEmoji": true
}
```

### `github-style-markdown-preview.enableBreaks`
Converte quebras de linha simples em quebras de linha HTML (comportamento similar ao GitHub). Aplica-se tanto à preview do IDE quanto à do browser.

**Padrão**: `false`

```json
{
  "github-style-markdown-preview.enableBreaks": true
}
```

### `github-style-markdown-preview.closeOnFileClose`
Fecha automaticamente a preview quando o ficheiro Markdown é fechado (apenas preview do IDE).

**Padrão**: `true`

```json
{
  "github-style-markdown-preview.closeOnFileClose": true
}
```

### `github-style-markdown-preview.focusEditorAfterOpen`
Foca no editor após abrir a preview, permitindo continuar a editar (apenas preview do IDE).

**Padrão**: `true`

```json
{
  "github-style-markdown-preview.focusEditorAfterOpen": true
}
```

### Personalizar Atalho de Teclado

O atalho padrão para abrir a preview é `Alt+R` (ou `Opt+R` no Mac).

**Para personalizar o atalho:**
1. Pressione `Ctrl+K Ctrl+S` (ou `Cmd+K Cmd+S` no Mac) para abrir Keyboard Shortcuts
2. Procure por "Open Markdown Preview"
3. Clique duas vezes no atalho atual
4. Pressione a nova combinação de teclas desejada
5. O atalho será atualizado automaticamente

## 🎯 Atalhos de Teclado

| Atalho | Ação |
|--------|------|
| `Alt+R` / `Opt+R` | Abrir preview (personalizável em Keyboard Shortcuts) |
| `Ctrl+Shift+T` / `Cmd+Shift+T` | Alternar tema (dark/light) |

**Nota**: Para personalizar o atalho de abrir preview, vá para `File > Preferences > Keyboard Shortcuts` (ou `Ctrl+K Ctrl+S`) e procure por "Open Markdown Preview".

## 📚 Documentação

Para mais informações detalhadas, consulte o [Guia de Uso](USAGE.md).

## 🔧 Requisitos

- Visual Studio Code 1.85.0 ou superior

## 🐛 Problemas Conhecidos

Nenhum problema conhecido no momento.

## 📝 Notas de Lançamento

Consulte [CHANGELOG.md](CHANGELOG.md) para histórico completo de versões.

### 0.0.1 - Lançamento Inicial
- Preview estilo GitHub para ficheiros Markdown
- Suporte para temas dark e light com toggle
- Atualização automática em tempo real
- Preferências de tema guardadas por ficheiro
- Auto-open opcional
- Preview no browser externo
- Proteção de coluna de preview
- Configurações personalizáveis (maxWidth, emoji, breaks, etc.)
- Suporte completo para GitHub Flavored Markdown
- Suporte para emojis GitHub (:smile:, :rocket:, etc.)

## 🤝 Contribuições

Contribuições são bem-vindas! Por favor, abra uma issue ou pull request no repositório.

## 📄 Licença

Este projeto está sob licença MIT.

## 🙏 Agradecimentos

- [GitHub Markdown CSS](https://github.com/sindresorhus/github-markdown-css) pelo estilo CSS
- [markdown-it](https://github.com/markdown-it/markdown-it) pelo renderizador Markdown
- [markdown-it-emoji](https://github.com/markdown-it/markdown-it-emoji) pelo suporte a emojis

---

**Desfrute da extensão GitHub Style Markdown Preview!** 🎉
