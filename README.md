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

1. **Botão no Editor**: Clique no botão "Open README Preview" na barra de título do editor
2. **Atalho de Teclado**: Pressione `Alt+R` (Windows/Linux) ou `Opt+R` (Mac)
3. **Command Palette**: Pressione `F1` ou `Ctrl+Shift+P` e digite "Open README Preview"

### Alternar Tema

1. **Botão na Preview**: Clique no botão 🌙/☀️ no canto superior direito
2. **Atalho de Teclado**: Pressione `Ctrl+Shift+T` (Windows/Linux) ou `Cmd+Shift+T` (Mac)
3. **Command Palette**: Digite "Toggle Preview Theme"

## ⚙️ Configurações

A extensão suporta as seguintes configurações:

### `github-readme-viewer.autoOpen`
Abre automaticamente a preview quando um ficheiro Markdown é aberto.

**Padrão**: `false`

```json
{
  "github-readme-viewer.autoOpen": true
}
```

### `github-readme-viewer.updateDelay`
Delay em milissegundos antes de atualizar a preview após editar (debouncing).

**Padrão**: `300`

```json
{
  "github-readme-viewer.updateDelay": 500
}
```

### `github-readme-viewer.supportedFiles`
Padrões de ficheiros suportados (sintaxe glob).

**Padrão**: `["*.md"]`

```json
{
  "github-readme-viewer.supportedFiles": [
    "*.md",
    "*.markdown",
    "README*"
  ]
}
```

### `github-readme-viewer.protectPreviewColumn`
Protege a coluna da preview (coluna 2) de outros ficheiros.

**Padrão**: `false`

```json
{
  "github-readme-viewer.protectPreviewColumn": true
}
```

### `github-readme-viewer.openInBrowser`
Mostra um botão "Web" na preview do IDE para abrir no navegador externo.

**Padrão**: `false`

```json
{
  "github-readme-viewer.openInBrowser": true
}
```

**Nota**: 
- Quando ativado, aparece um botão "🌐 Web" na preview do IDE
- Ao clicar no botão, abre a preview no navegador e fecha a preview do IDE
- O browser preview usa o tema preferido guardado (não tem botão de toggle dark/light mode)
- Requer um workspace aberto para funcionar corretamente (cria ficheiro HTML temporário na pasta `.vscode`)

### `github-readme-viewer.maxWidth`
Largura máxima do conteúdo na preview (em pixels). Use `"auto"` para largura total.

**Padrão**: `980` (pixels)

**Nota**: O GitHub usa 980px como largura padrão.

```json
{
  "github-readme-viewer.maxWidth": 980
}
```

Ou para largura total:
```json
{
  "github-readme-viewer.maxWidth": "auto"
}
```

### `github-readme-viewer.enableEmoji`
Ativa a renderização de emojis (ex: :smile:, :heart:). Aplica-se tanto à preview do IDE quanto à do browser.

**Padrão**: `true`

```json
{
  "github-readme-viewer.enableEmoji": true
}
```

### `github-readme-viewer.enableBreaks`
Converte quebras de linha simples em quebras de linha HTML (comportamento similar ao GitHub). Aplica-se tanto à preview do IDE quanto à do browser.

**Padrão**: `false`

```json
{
  "github-readme-viewer.enableBreaks": true
}
```

### `github-readme-viewer.closeOnFileClose`
Fecha automaticamente a preview quando o ficheiro Markdown é fechado (apenas preview do IDE).

**Padrão**: `true`

```json
{
  "github-readme-viewer.closeOnFileClose": true
}
```

### `github-readme-viewer.focusEditorAfterOpen`
Foca no editor após abrir a preview, permitindo continuar a editar (apenas preview do IDE).

**Padrão**: `true`

```json
{
  "github-readme-viewer.focusEditorAfterOpen": true
}
```

### Personalizar Atalho de Teclado

O atalho padrão para abrir a preview é `Alt+R` (ou `Opt+R` no Mac).

**Para personalizar o atalho:**
1. Pressione `Ctrl+K Ctrl+S` (ou `Cmd+K Cmd+S` no Mac) para abrir Keyboard Shortcuts
2. Procure por "Open README Preview"
3. Clique duas vezes no atalho atual
4. Pressione a nova combinação de teclas desejada
5. O atalho será atualizado automaticamente

## 🎯 Atalhos de Teclado

| Atalho | Ação |
|--------|------|
| `Alt+R` / `Opt+R` | Abrir preview (personalizável em Keyboard Shortcuts) |
| `Ctrl+Shift+T` / `Cmd+Shift+T` | Alternar tema (dark/light) |

**Nota**: Para personalizar o atalho de abrir preview, vá para `File > Preferences > Keyboard Shortcuts` (ou `Ctrl+K Ctrl+S`) e procure por "Open README Preview".

## 📚 Documentação

Para mais informações detalhadas, consulte o [Guia de Uso](USAGE.md).

## 🔧 Requisitos

- Visual Studio Code 1.85.0 ou superior

## 🐛 Problemas Conhecidos

Nenhum problema conhecido no momento.

## 📝 Notas de Lançamento

### 0.0.1
- Lançamento inicial
- Preview estilo GitHub
- Suporte para temas dark e light
- Atualização automática
- Preferências por ficheiro
- Auto-open opcional
- Preview no browser
- Proteção de coluna

## 🤝 Contribuições

Contribuições são bem-vindas! Por favor, abra uma issue ou pull request no repositório.

## 📄 Licença

Este projeto está sob licença MIT.

## 🙏 Agradecimentos

- [GitHub Markdown CSS](https://github.com/sindresorhus/github-markdown-css) pelo estilo CSS
- [markdown-it](https://github.com/markdown-it/markdown-it) pelo renderizador Markdown

---

**Desfrute da extensão GitHub Style Markdown Preview!** 🎉
