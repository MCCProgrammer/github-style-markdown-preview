**GitHub Style Markdown Preview** ⭐
Para além disso quero dividir em geral que da para preview ide e web. e so web e so ide.
Pode estar o grupo e depois tem se é de layout, ect.
#### `github-readme-viewer.maxWidth`
- **Tipo**: `number` | `string`
- **Padrão**: `980` (pixels) ou `"auto"`
- **Descrição**: Largura máxima do conteúdo na preview
- **Valores**: Número (pixels) ou `"auto"` para largura total
- **Uso**: Controlar a largura do conteúdo para melhor leitura (GitHub usa ~980px)
- **Hint**:avisa o usuario que o default do github é 980 px

```json
{
  "github-readme-viewer.maxWidth": 980
}
```

#### `github-readme-viewer.showLineNumbers`
- **Tipo**: `boolean`
- **Padrão**: `false`
- **Descrição**: Mostrar números de linha na preview
- **Uso**: Útil para referenciar linhas específicas

```json
{
  "github-readme-viewer.showLineNumbers": true
}
```

### 📐 Layout

#### `github-readme-viewer.previewPosition`
- **Tipo**: `string`
- **Padrão**: `"beside"`
- **Descrição**: Posição inicial da preview
- **Valores**: `"beside"`, `"right"`, `"below"`, `"active"`
- **Uso**: Controlar onde a preview abre

```json
{
  "github-readme-viewer.previewPosition": "right"
}
```

#### `github-readme-viewer.enableMath`
- **Tipo**: `boolean`
- **Padrão**: `false`
- **Descrição**: Ativar suporte para fórmulas matemáticas (LaTeX/MathJax)
- **Uso**: Para documentos com fórmulas matemáticas

```json
{
  "github-readme-viewer.enableMath": true
}
```

#### `github-readme-viewer.enableEmoji`
- **Tipo**: `boolean`
- **Padrão**: `true`
- **Descrição**: Renderizar emojis (ex: :smile:, :heart:)
- **Uso**: Controlar se emojis são renderizados

```json
{
  "github-readme-viewer.enableEmoji": true
}

### 🔄 Sincronização

#### `github-readme-viewer.syncScroll`
- **Tipo**: `boolean`
- **Padrão**: `false`
- **Descrição**: Sincronizar scroll entre editor e preview mas ´so no preview do ide
- **Uso**: Navegar no documento mantendo contexto

```json
{
  "github-readme-viewer.syncScroll": true
}
```

#### `github-readme-viewer.highlightCurrentLine`
- **Tipo**: `boolean`
- **Padrão**: `false`
- **Descrição**: Destacar a linha atual na preview (quando syncScroll está ativo)
- **Uso**: Ver qual linha está sendo editada na preview so do preview do ide

```json
{
  "github-readme-viewer.highlightCurrentLine": true
}
```


#### `github-readme-viewer.enableExport`
- **Tipo**: `boolean`
- **Padrão**: `true`
- **Descrição**: Ativar opção de exportar preview para HTML/PDF
- **Uso**: Permitir exportar a preview

```json
{
  "github-readme-viewer.enableExport": true
}
```

#### `github-readme-viewer.exportIncludeCSS`
- **Tipo**: `boolean`
- **Padrão**: `true`
- **Descrição**: Incluir CSS inline no HTML exportado
- **Uso**: Garantir que HTML exportado seja standalone

```json
{
  "github-readme-viewer.exportIncludeCSS": true
}
```

### Não imprtante

#### `github-readme-viewer.enableBreaks`
- **Tipo**: `boolean`
- **Padrão**: `false`
- **Descrição**: Quebrar linhas simples como quebras de linha HTML
- **Uso**: Comportamento similar ao GitHub (quebras de linha simples)

```json
{
  "github-readme-viewer.enableBreaks": true
}
```

### 🎯 Comportamento

#### `github-readme-viewer.closeOnFileClose`
- **Tipo**: `boolean`
- **Padrão**: `true`
- **Descrição**: Fechar preview automaticamente quando o ficheiro é fechado
- **Uso**: Controlar se a preview fecha com o ficheiro

```json
{
  "github-readme-viewer.closeOnFileClose": true
}
```

#### `github-readme-viewer.focusEditorAfterOpen`
- **Tipo**: `boolean`
- **Padrão**: `true`
- **Descrição**: Focar no editor após abrir a preview
- **Uso**: Manter foco no editor para continuar a editar

```json
{
  "github-readme-viewer.focusEditorAfterOpen": true
}
```

#### `github-readme-viewer.showPreviewOnStartup`
- **Tipo**: `boolean`
- **Padrão**: `false`
- **Descrição**: Mostrar preview quando VS Code inicia (se autoOpen está ativo)
- **Uso**: Controlar se previews são abertas no startup

```json
{
  "github-readme-viewer.showPreviewOnStartup": true
}
```

### Considerações Técnicas:
- **Math Support**: Requer biblioteca como KaTeX ou MathJax
- **Syntax Highlighting**: Requer biblioteca como highlight.js
- **Custom CSS**: Precisa ser injetado no HTML do webview
- **Sync Scroll**: Requer cálculo de posições e eventos de scroll


#### `mudar a tecla do atalho ou hot key`
- **Descrição**: Escolher qual tecla querem para abrir a preview
- **Uso**: Controlar se previews são abertas no startup

```json
{
  "github-readme-viewer.showPreviewOnStartup": true
}
```