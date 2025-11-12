# GitHub Style Markdown Preview

A Visual Studio Code extension that allows you to preview Markdown files in GitHub style, with dark and light theme support, real-time automatic updates, and various customization options.

## ✨ Features

- 🎨 **GitHub Style Preview**: Preview Markdown files with the official GitHub style
- 🌓 **Dark/Light Themes**: Toggle between dark and light themes with one click
- 🔄 **Automatic Updates**: Preview updates automatically while editing the file
- 💾 **Per-File Preferences**: Each file saves its theme preference
- 🚀 **Auto-Open**: Automatically opens preview when opening a Markdown file
- 🖥️ **Browser Preview**: Option to open preview in external browser
- 📁 **Multiple Files**: Supports multiple previews open simultaneously
- 🎯 **Column Protection**: Keeps preview in a dedicated column
- 📐 **Math Support**: Render mathematical formulas with KaTeX (LaTeX/MathJax syntax)
- 💾 **Export Functionality**: Export preview as standalone HTML file

## 🚀 Installation

1. Open VS Code
2. Go to Extensions section (`Ctrl+Shift+X` or `Cmd+Shift+X`)
3. Search for "GitHub Style Markdown Preview"
4. Click "Install"

## 📖 How to Use

### Open Preview

There are three ways to open the preview:

1. **Status Bar Button**: Click the "Markdown Preview" button in the status bar (bottom right corner)
2. **Keyboard Shortcut**: Press `Ctrl+Alt+P` (Windows/Linux) or `Cmd+Opt+P` (Mac)
3. **Command Palette**: Press `F1` or `Ctrl+Shift+P` and type "Open Markdown Preview"

### Toggle Theme

1. **Button in Preview**: Click the 🌙/☀️ button in the top right corner
2. **Keyboard Shortcut**: Press `Ctrl+Shift+T` (Windows/Linux) or `Cmd+Shift+T` (Mac)
3. **Command Palette**: Type "Toggle Preview Theme"

### Export Preview

When `enableExport` is enabled, an **💾 Export** button appears in the **bottom right corner** of the preview. Click it to save the rendered preview as a standalone HTML file.

### Math Formulas

When `enableMath` is enabled, the preview supports rendering mathematical formulas using KaTeX:
- Inline math: `$formula$` or `\(formula\)`
- Display math: `$$formula$$` or `\[formula\]`

## ⚙️ Settings

The extension supports the following settings:

### `github-style-markdown-preview.autoOpen`
Automatically opens preview when a Markdown file is opened.

**Default**: `false`

```json
{
  "github-style-markdown-preview.autoOpen": true
}
```

### `github-style-markdown-preview.updateDelay`
Delay in milliseconds before updating preview after editing (debouncing).

**Default**: `300`

```json
{
  "github-style-markdown-preview.updateDelay": 500
}
```

### `github-style-markdown-preview.supportedFiles`
Supported file patterns (glob syntax).

**Default**: `["*.md"]`

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
Protects the preview column (column 2) from other files.

**Default**: `false`

```json
{
  "github-style-markdown-preview.protectPreviewColumn": true
}
```

### `github-style-markdown-preview.openInBrowser`
Shows a "Web" button in the IDE preview to open in external browser.

**Default**: `false`

```json
{
  "github-style-markdown-preview.openInBrowser": true
}
```

**Note**: 
- When enabled, a "🌐 Web" button appears in the IDE preview
- Clicking the button opens preview in browser and closes IDE preview
- Browser preview uses the saved preferred theme (no dark/light mode toggle button)
- Requires an open workspace to work correctly (creates temporary HTML file in `.vscode` folder)

### `github-style-markdown-preview.maxWidth`
Maximum width of content in preview (in pixels). Use `"auto"` for full width.

**Default**: `980` (pixels)

**Note**: GitHub uses 980px as default width.

```json
{
  "github-style-markdown-preview.maxWidth": 980
}
```

Or for full width:
```json
{
  "github-style-markdown-preview.maxWidth": "auto"
}
```

### `github-style-markdown-preview.enableEmoji`
Enables emoji rendering (e.g., :smile:, :heart:). Applies to both IDE and browser previews.

**Default**: `true`

```json
{
  "github-style-markdown-preview.enableEmoji": true
}
```

### `github-style-markdown-preview.enableBreaks`
Converts single line breaks to HTML line breaks (similar to GitHub behavior). Applies to both IDE and browser previews.

**Default**: `false`

```json
{
  "github-style-markdown-preview.enableBreaks": true
}
```

### `github-style-markdown-preview.enableMath`
Enables math formula rendering with KaTeX (LaTeX/MathJax syntax). Supports inline math: `$formula$` or `\(formula\)`, and display math: `$$formula$$` or `\[formula\]`. Applies to IDE preview only.

**Default**: `false`

```json
{
  "github-style-markdown-preview.enableMath": true
}
```

### `github-style-markdown-preview.enableExport`
Shows an "Export" button in the preview to save rendered preview as HTML file. The button appears in the **bottom right corner** of the preview. Applies to IDE preview only.

**Default**: `false`

```json
{
  "github-style-markdown-preview.enableExport": true
}
```

### `github-style-markdown-preview.closeOnFileClose`
Automatically closes preview when the Markdown file is closed (IDE preview only).

**Default**: `true`

```json
{
  "github-style-markdown-preview.closeOnFileClose": true
}
```

### `github-style-markdown-preview.focusEditorAfterOpen`
Focuses the editor after opening preview, allowing you to continue editing (IDE preview only).

**Default**: `true`

```json
{
  "github-style-markdown-preview.focusEditorAfterOpen": true
}
```

### Customize Keyboard Shortcut

The default shortcut to open preview is `Ctrl+Alt+P` (or `Cmd+Opt+P` on Mac).

**To customize the shortcut:**
1. Press `Ctrl+K Ctrl+S` (or `Cmd+K Cmd+S` on Mac) to open Keyboard Shortcuts
2. Search for "Open Markdown Preview"
3. Double-click the current shortcut
4. Press the desired new key combination
5. The shortcut will be updated automatically

## 🎯 Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Alt+P` / `Cmd+Opt+P` | Open preview (customizable in Keyboard Shortcuts) |
| `Ctrl+Shift+T` / `Cmd+Shift+T` | Toggle theme (dark/light) |

**Note**: To customize the open preview shortcut, go to `File > Preferences > Keyboard Shortcuts` (or `Ctrl+K Ctrl+S`) and search for "Open Markdown Preview".

## 📚 Documentation

For more detailed information, see the [Usage Guide](USAGE.md).

## 🔧 Requirements

- Visual Studio Code 1.85.0 or higher

## 🐛 Known Issues

No known issues at this time.

## 📝 Release Notes

See [CHANGELOG.md](CHANGELOG.md) for complete version history.

### 0.0.1 - Initial Release
- GitHub-style preview for Markdown files
- Dark and light theme support with toggle
- Real-time automatic updates
- Theme preferences saved per file
- Optional auto-open
- External browser preview
- Preview column protection
- Customizable settings (maxWidth, emoji, breaks, etc.)
- Full support for GitHub Flavored Markdown
- Support for GitHub emojis (:smile:, :rocket:, etc.)

## 🤝 Contributing

Contributions are welcome! Please open an issue or pull request in the repository.

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- [GitHub Markdown CSS](https://github.com/sindresorhus/github-markdown-css) for the CSS style
- [markdown-it](https://github.com/markdown-it/markdown-it) for the Markdown renderer
- [markdown-it-emoji](https://github.com/markdown-it/markdown-it-emoji) for emoji support

---

**Enjoy the GitHub Style Markdown Preview extension!** 🎉
