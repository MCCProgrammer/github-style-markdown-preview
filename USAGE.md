# GitHub Style Markdown Preview - Usage Guide

## 📖 Overview

The **GitHub Style Markdown Preview** extension allows you to preview Markdown files in GitHub style, with dark and light theme support, real-time automatic updates, and various customization options.

## 🚀 How to Use

### Open Preview

There are several ways to open the preview of a Markdown file:

#### 1. **Status Bar Button** (Recommended)
- When a `.md` file is open, a **"Markdown Preview"** button appears in the status bar (bottom right corner)
- Click the button to open the preview
- Similar to the "Go Live" button in Live Server

#### 2. **Keyboard Shortcut**
- Press `Ctrl+Alt+P` (Windows/Linux) or `Cmd+Opt+P` (Mac) when a Markdown file is active
- The preview opens automatically beside the editor
- **Note**: The default shortcut is `Ctrl+Alt+P` (or `Cmd+Opt+P` on Mac). Can be customized in Keyboard Shortcuts.

#### 3. **Command Palette**
- Press `F1` or `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (Mac)
- Type "Open Markdown Preview" and press Enter

### Toggle between Dark and Light Mode

There are three ways to toggle the theme:

#### 1. **Button in Preview**
- Click the **🌙 Dark Mode** or **☀️ Light Mode** button in the top right corner of the preview

#### 2. **Keyboard Shortcut**
- Press `Ctrl+Shift+T` (Windows/Linux) or `Cmd+Shift+T` (Mac) when the preview is active

#### 3. **Command Palette**
- Press `F1` or `Ctrl+Shift+P`
- Type "Toggle Preview Theme" and press Enter

### Close Preview

- **Close the file**: When you close a Markdown file, the corresponding preview closes automatically
- **Close manually**: Click the X button on the preview tab
- **With auto-open enabled**: If you close the preview manually, it won't reopen automatically. It only reopens when you close and reopen the file

### Automatic Focus

- When you open the preview, focus automatically returns to the `.md` file
- This allows other files to open in the correct tab (not in the preview)
- Keeps your workflow smooth

## ⚙️ Settings

To access settings:

1. Open VS Code Settings (`Ctrl+,` or `Cmd+,`)
2. Search for "GitHub Style Markdown Preview"
3. Configure options as needed

### Configuration Options

#### `github-style-markdown-preview.autoOpen`
- **Type**: `boolean`
- **Default**: `false`
- **Description**: Automatically opens preview when a Markdown file is opened. When enabled, also checks already open files when VS Code starts and opens previews automatically.
- **Recommendation**: Enable if you want the preview to always open when opening a `.md` file or when VS Code starts with Markdown files open

**Example:**
```json
{
  "github-style-markdown-preview.autoOpen": true
}
```

**Note**: If you close the preview manually, it won't reopen automatically until you close and reopen the file.

#### `github-style-markdown-preview.updateDelay`
- **Type**: `number`
- **Default**: `300` (milliseconds)
- **Description**: Delay before updating preview after editing the file
- **Values**:
  - `0` = Instant update (may be slower with large files)
  - `300` = Waits 300ms after stopping editing (recommended)
  - `1000` = Waits 1 second (useful for very large files)
- **Minimum**: `0`
- **Maximum**: `2000`

**Example:**
```json
{
  "github-style-markdown-preview.updateDelay": 500
}
```

#### `github-style-markdown-preview.supportedFiles`
- **Type**: `array` of `string`
- **Default**: `["*.md"]`
- **Description**: Supported file patterns (using glob syntax)
- **Common patterns**:
  - `*.md` - All `.md` files
  - `*.markdown` - All `.markdown` files
  - `README*` - All files starting with "README"
  - `**/*.md` - All `.md` files in any folder

**Example:**
```json
{
  "github-style-markdown-preview.supportedFiles": [
    "*.md",
    "*.markdown",
    "README*"
  ]
}
```

#### `github-style-markdown-preview.protectPreviewColumn`
- **Type**: `boolean`
- **Default**: `false`
- **Description**: Protects the preview column from other files. When enabled:
  - Preview uses a dedicated column (column 2)
  - Other files opened in that column will be automatically moved to the first column
  - Files trying to open in the preview column are redirected to column 1
- **Recommendation**: Enable if you want to keep the preview always visible without interference from other files

**Example:**
```json
{
  "github-style-markdown-preview.protectPreviewColumn": true
}
```

#### `github-style-markdown-preview.openInBrowser`
- **Type**: `boolean`
- **Default**: `false`
- **Description**: When enabled, shows a "🌐 Web" button in the IDE preview. When clicking the button:
  - Preview opens in your default browser
  - IDE preview closes automatically
  - Updates automatically when editing the file (using the configured `updateDelay`)
  - Uses a temporary HTML file in the workspace `.vscode` folder
  - File is automatically deleted when the document is closed
- **Recommendation**: Enable if you want the option to open preview in browser from the IDE preview

**Example:**
```json
{
  "github-style-markdown-preview.openInBrowser": true
}
```

**Note**: 
- This setting only shows the "Web" button in the IDE preview
- To open in browser, you need to click the "🌐 Web" button that appears in the top right corner of the preview
- When preview is opened in browser, it's served through a temporary HTML file that updates automatically
- If there's no workspace open, small files (< 2MB) may use data URI (limited functionality)

#### `github-style-markdown-preview.maxWidth`
- **Type**: `number` | `string`
- **Default**: `980` (pixels)
- **Description**: Maximum width of content in preview (in pixels). Use `"auto"` for full width. Applies to both IDE and browser previews.
- **Values**: 
  - Number (pixels) - e.g., `980`, `1200`
  - `"auto"` - full screen width
- **Note**: GitHub uses 980px as default width for better readability.

**Example:**
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

#### `github-style-markdown-preview.enableEmoji`
- **Type**: `boolean`
- **Default**: `true`
- **Description**: Enables emoji rendering (e.g., :smile:, :heart:). Applies to both IDE and browser previews.
- **Recommendation**: Keep enabled if you use emojis in your Markdown documents

**Example:**
```json
{
  "github-style-markdown-preview.enableEmoji": true
}
```

#### `github-style-markdown-preview.enableBreaks`
- **Type**: `boolean`
- **Default**: `false`
- **Description**: Converts single line breaks to HTML line breaks (similar to GitHub behavior). Applies to both IDE and browser previews.
- **Recommendation**: Enable if you want single line breaks to be rendered as HTML line breaks (GitHub behavior)

**Example:**
```json
{
  "github-style-markdown-preview.enableBreaks": true
}
```

#### `github-style-markdown-preview.closeOnFileClose`
- **Type**: `boolean`
- **Default**: `true`
- **Description**: Automatically closes preview when the Markdown file is closed (IDE preview only).
- **Recommendation**: Keep enabled to keep workspace clean

**Example:**
```json
{
  "github-style-markdown-preview.closeOnFileClose": true
}
```

#### `github-style-markdown-preview.focusEditorAfterOpen`
- **Type**: `boolean`
- **Default**: `true`
- **Description**: Focuses the editor after opening preview, allowing you to continue editing immediately (IDE preview only).
- **Recommendation**: Keep enabled for a smoother workflow

**Example:**
```json
{
  "github-style-markdown-preview.focusEditorAfterOpen": true
}
```

#### `github-style-markdown-preview.enableMath`
- **Type**: `boolean`
- **Default**: `false`
- **Description**: Enables math formula rendering with KaTeX (LaTeX/MathJax syntax). Supports inline math: `$formula$` or `\(formula\)`, and display math: `$$formula$$` or `\[formula\]`. Applies to IDE preview only.
- **Recommendation**: Enable if you need to render mathematical formulas in your Markdown documents

**Example:**
```json
{
  "github-style-markdown-preview.enableMath": true
}
```

#### `github-style-markdown-preview.enableExport`
- **Type**: `boolean`
- **Default**: `false`
- **Description**: Shows an "Export" button in the preview to save rendered preview as HTML file. The button appears in the **bottom right corner** of the preview. Applies to IDE preview only.
- **Recommendation**: Enable if you want to export previews as standalone HTML files

**Example:**
```json
{
  "github-style-markdown-preview.enableExport": true
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

**Note**: Keyboard shortcuts cannot be configured through extension settings. They must be customized through VS Code Keyboard Shortcuts preferences.

## 🎨 Features

### ✅ Automatic Updates
- Preview updates automatically when editing the Markdown file
- Delay is configurable through the `updateDelay` option
- Immediate update when saving the file (Ctrl+S)
- Configurable debouncing to avoid excessive updates during typing

### ✅ Saved Preferences
- Theme preference (dark/light) is saved per file
- When reopening a file, preview uses the last chosen theme
- Preferences persist between VS Code sessions
- Each file has its own theme preference

### ✅ Multiple Files Support
- Can have multiple previews open at the same time (one per file)
- Each preview maintains its own preferences
- Duplicate prevention (doesn't open multiple previews for the same file)

### ✅ VS Code Integration
- Preview adapts to VS Code theme (if no saved preference)
- Uses VS Code colors for better visual integration
- Automatic focus on editor after opening preview
- Closes automatically when file is closed

### ✅ Browser Preview
- Option to open preview in external browser (via "Web" button in IDE preview)
- Automatic updates in browser when editing the file
- Temporary HTML file created in workspace `.vscode` folder
- Automatic cleanup when file is closed
- **Note**: Browser preview doesn't have dark/light mode toggle button - theme is set at opening time based on saved preference

### ✅ Math Formula Support
- Render mathematical formulas with KaTeX (LaTeX/MathJax syntax)
- Supports inline math: `$formula$` or `\(formula\)`
- Supports display math: `$$formula$$` or `\[formula\]`
- Controlled by `enableMath` setting (default: `false`)
- Applies to IDE preview only

### ✅ Export Functionality
- Export preview as standalone HTML file
- Adds an "💾 Export" button in the **bottom right corner** of the preview (when `enableExport` is enabled)
- Exported HTML includes all styling and supports Math formulas if enabled
- Controlled by `enableExport` setting (default: `false`)
- Applies to IDE preview only

## 📝 Usage Examples

### Example 1: Working with README.md

1. Open a `README.md` file
2. Click the "Markdown Preview" button in the status bar or press `Ctrl+Alt+P` to open preview
3. Edit the file and see the preview update automatically
4. Click the button to toggle between dark and light mode
5. Close the file and preview closes automatically

### Example 2: Enable Auto-Open

1. Open Settings (`Ctrl+,`)
2. Search for "GitHub Style Markdown Preview"
3. Enable "Auto Open"
4. Now, whenever you open a `.md` file, preview opens automatically

### Example 3: Configure Custom Delay

1. Open Settings
2. Search for "Update Delay"
3. Set desired value (e.g., `500` for 500ms)
4. Preview updates with the configured delay

### Example 4: Support Other Markdown Files

1. Open Settings
2. Search for "Supported Files"
3. Add patterns like `["*.md", "*.markdown", "*.txt"]`
4. Now the extension works with those file types

### Example 5: Protect Preview Column

1. Open Settings
2. Search for "Protect Preview Column"
3. Enable the option
4. Preview now uses a dedicated column (column 2)
5. Other files opened in that column will be automatically moved to the first column
6. If a file tries to open in the preview column, it will be redirected to column 1
7. Keeps preview always visible without interference

### Example 6: Open Preview in Browser

1. Open Settings
2. Search for "Open In Browser"
3. Enable the option
4. Open a `.md` file and use `Ctrl+Alt+P` or click the "Markdown Preview" button in the status bar
5. Preview opens in IDE panel with a "🌐 Web" button visible
6. Click the "🌐 Web" button in the top right corner of the preview
7. Preview opens in your default browser and IDE preview closes automatically
8. Edit the file and see preview update automatically in browser
9. Preview closes automatically when you close the file in VS Code

**Note**: The "Web" button only appears in IDE preview when `openInBrowser` is enabled. Preview doesn't open directly in browser when the setting is active - you need to click the button.

## 🔧 Troubleshooting

### Preview doesn't open
- Verify the file is a Markdown file (`.md`)
- Verify the file is in the supported files list
- Try using the `Ctrl+Alt+P` shortcut directly or click the button in the status bar
- Verify the button appears in the status bar (bottom right corner)

### Preview doesn't update
- Check the `updateDelay` setting
- Try setting `updateDelay` to `0` for instant update
- Make sure the file is saved

### Theme doesn't change
- Make sure the preview is active (visible)
- Try using the `Ctrl+Shift+T` shortcut
- Check for any error messages in the console

### Auto-open doesn't work
- Verify `autoOpen` is enabled in settings
- Make sure the file matches patterns in `supportedFiles`
- If you closed the preview manually, it won't reopen automatically until you open the file again

### Browser preview doesn't work
- Make sure you have a workspace open (required to create temporary HTML file)
- If there's no workspace, only small files (< 2MB) may work with data URI
- Verify the `openInBrowser` setting is enabled to show the "Web" button
- Remember you need to click the "🌐 Web" button in IDE preview to open in browser
- Preview doesn't open directly in browser - first opens in IDE, then click the "Web" button

## 💡 Tips

1. **Quick Shortcuts**: Use `Ctrl+Alt+P` to open (or click the status bar button) and `Ctrl+Shift+T` to toggle theme
2. **Auto-Open**: Enable `autoOpen` if you frequently work with Markdown files
3. **Custom Delay**: Adjust `updateDelay` according to your file sizes
4. **Multiple Files**: You can have multiple previews open at the same time
5. **Preferences**: Preferences are saved per file, not globally

## 🆘 Support

If you encounter issues or have suggestions:

1. Check this guide first
2. Check extension settings
3. Report issues or suggestions in the GitHub repository

## 📚 Additional Resources

- [VS Code Documentation](https://code.visualstudio.com/docs)
- [Markdown Guide](https://www.markdownguide.org/)
- [GitHub Markdown CSS](https://github.com/sindresorhus/github-markdown-css)

---

**Enjoy the GitHub Style Markdown Preview extension!** 🎉
