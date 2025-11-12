# Change Log

All notable changes to the "GitHub Style Markdown Preview" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [0.0.5] - 2025-11-12

### Added
- 📐 **Math Support**: Enable rendering of mathematical formulas with KaTeX (LaTeX/MathJax syntax)
  - Supports inline math: `$formula$` or `\(formula\)`
  - Supports display math: `$$formula$$` or `\[formula\]`
  - Controlled by `enableMath` setting (default: `false`)
  - Applies to IDE preview only
- 💾 **Export Functionality**: Export preview as standalone HTML file
  - Adds an "Export" button in the preview (when `enableExport` is enabled)
  - Allows saving the rendered preview as a standalone HTML file
  - Exported HTML includes all styling and supports Math formulas if enabled
  - Controlled by `enableExport` setting (default: `false`)
  - Applies to IDE preview only

### Configuration
- `enableMath`: Enable math formula rendering (default: `false`)
- `enableExport`: Show export button in preview (default: `false`)

## [0.0.4] - 2025-11-11

### Fixed
- 📦 Fixed package distribution: Updated `.vscodeignore` to include necessary CSS files from `github-markdown-css` package
  - CSS files are now correctly included in the published extension package
  - Ensures preview styling works correctly for all users after installation

## [0.0.3] - 2025-11-11

### Changed
- ⌨️ Default keyboard shortcut changed from `Alt+R` to `Ctrl+Alt+P` (Windows/Linux) or `Cmd+Opt+P` (Mac)
- 📝 Updated documentation to reflect new features

### Added
- 📊 Status bar button to open preview
  - Appears automatically when a Markdown file is open
  - Located in the bottom right corner of the status bar
  - Tooltip shows keyboard shortcut: "Open Markdown Preview (Ctrl+Alt+P)"

### Fixed
- 🔧 Improved validation of supported files to accept only `.md` files
- 📝 More informative error messages for debugging
- Shortcut keybinding was not working in VS Code

## [0.0.2] - 2025-11-10

### Added
- 🎨 Extension icon added to marketplace

## [0.0.1] - 2025-11-10

### Added
- 🎨 GitHub-style preview for Markdown files
- 🌓 Dark and light theme support with toggle
- 🔄 Real-time automatic updates while editing
- 💾 Theme preferences saved per file
- 🚀 Optional auto-open when opening Markdown files
- 🖥️ External browser preview with automatic updates
- 📁 Support for multiple files simultaneously
- 🎯 Preview column protection (optional)
- ⚙️ Customizable settings:
  - `autoOpen`: Automatically open preview
  - `updateDelay`: Delay for updates (debouncing)
  - `supportedFiles`: Supported file patterns
  - `protectPreviewColumn`: Protect preview column
  - `openInBrowser`: Show button to open in browser
  - `maxWidth`: Maximum content width (default: 980px)
  - `enableEmoji`: Emoji rendering (:smile:, :rocket:, etc.)
  - `enableBreaks`: Simple line breaks as HTML
  - `closeOnFileClose`: Close preview when file closes
  - `focusEditorAfterOpen`: Focus editor after opening preview
- ⌨️ Default keyboard shortcut: `Alt+R` (customizable) - **Changed to `Ctrl+Alt+P` in version 0.0.3**
- 🎨 Theme toggle button in preview
- 🌐 "Web" button to open in browser (if enabled)
- 📝 Full support for GitHub Flavored Markdown
- 😄 Support for GitHub emojis (markdown-it-emoji)
- 🎨 GitHub-style CSS (github-markdown-css)
