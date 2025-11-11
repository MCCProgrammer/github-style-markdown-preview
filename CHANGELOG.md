# Change Log

All notable changes to the "GitHub Style Markdown Preview" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [0.0.3] - 2025-11-10

### Changed
- ⌨️ Atalho de teclado padrão alterado de `Alt+R` para `Ctrl+Alt+P` (Windows/Linux) ou `Cmd+Opt+P` (Mac)
- 📝 Atualizada documentação para refletir as novas funcionalidades

### Added
- 📊 Botão na barra de status para abrir a preview
  - Aparece automaticamente quando um ficheiro Markdown está aberto
  - Localizado no canto inferior direito da barra de status
  - Tooltip mostra o atalho de teclado: "Open Markdown Preview (Ctrl+Alt+P)"

### Fixed
- 🔧 Melhorada validação de ficheiros suportados para aceitar apenas ficheiros `.md` 
- 📝 Mensagens de erro mais informativas para debug

## [0.0.2] - 2025-11-10

### Added
- 🎨 Ícone da extensão adicionado ao marketplace

## [0.0.1] - 2025-11-10

### Added
- 🎨 Preview estilo GitHub para ficheiros Markdown
- 🌓 Suporte para temas dark e light com toggle
- 🔄 Atualização automática em tempo real enquanto edita
- 💾 Preferências de tema guardadas por ficheiro
- 🚀 Auto-open opcional quando abre ficheiros Markdown
- 🖥️ Preview no browser externo com atualização automática
- 📁 Suporte para múltiplos ficheiros simultaneamente
- 🎯 Proteção de coluna de preview (opcional)
- ⚙️ Configurações personalizáveis:
  - `autoOpen`: Abrir preview automaticamente
  - `updateDelay`: Delay para atualizações (debouncing)
  - `supportedFiles`: Padrões de ficheiros suportados
  - `protectPreviewColumn`: Proteger coluna de preview
  - `openInBrowser`: Mostrar botão para abrir no browser
  - `maxWidth`: Largura máxima do conteúdo (padrão: 980px)
  - `enableEmoji`: Renderização de emojis (:smile:, :rocket:, etc.)
  - `enableBreaks`: Quebras de linha simples como HTML
  - `closeOnFileClose`: Fechar preview quando ficheiro fecha
  - `focusEditorAfterOpen`: Focar editor após abrir preview
- ⌨️ Atalho de teclado padrão: `Alt+R` (personalizável) - **Alterado para `Ctrl+Alt+P` na versão 0.0.3**
- 🎨 Botão de toggle de tema na preview
- 🌐 Botão "Web" para abrir no browser (se ativado)
- 📝 Suporte completo para GitHub Flavored Markdown
- 😄 Suporte para emojis GitHub (markdown-it-emoji)
- 🎨 CSS estilo GitHub (github-markdown-css)