# GitHub Style Markdown Preview - Guia de Uso

## 📖 Visão Geral

A extensão **GitHub Style Markdown Preview** permite visualizar ficheiros Markdown no estilo GitHub, com suporte para temas dark e light, atualização automática em tempo real e várias opções de personalização.

## 🚀 Como Usar

### Abrir a Preview

Existem várias formas de abrir a preview de um ficheiro Markdown:

#### 1. **Botão no Editor**
- Quando um ficheiro `.md` está aberto, aparece um botão **"Open README Preview"** na barra de título do editor
- Clique no botão para abrir a preview

#### 2. **Atalho de Teclado**
- Pressione `Alt+R` (Windows/Linux) ou `Opt+R` (Mac) quando um ficheiro Markdown está ativo
- A preview abre automaticamente ao lado do editor
- **Nota**: O atalho foi mudado de `Ctrl+Shift+R` para `Alt+R` para evitar conflito com o reload do VS Code

#### 3. **Comando da Paleta**
- Pressione `F1` ou `Ctrl+Shift+P` (Windows/Linux) ou `Cmd+Shift+P` (Mac)
- Digite "Open README Preview" e pressione Enter

### Alternar entre Dark e Light Mode

Existem três formas de alternar o tema:

#### 1. **Botão na Preview**
- Clique no botão **🌙 Dark Mode** ou **☀️ Light Mode** no canto superior direito da preview

#### 2. **Atalho de Teclado**
- Pressione `Ctrl+Shift+T` (Windows/Linux) ou `Cmd+Shift+T` (Mac) quando a preview está ativa

#### 3. **Comando da Paleta**
- Pressione `F1` ou `Ctrl+Shift+P`
- Digite "Toggle Preview Theme" e pressione Enter

### Fechar a Preview

- **Fechar o ficheiro**: Quando fecha um ficheiro Markdown, a preview correspondente fecha automaticamente
- **Fechar manualmente**: Clique no botão X no separador da preview
- **Com auto-open ativado**: Se fechar a preview manualmente, ela não reabre automaticamente. Só reabre quando você fechar e reabrir o ficheiro

### Foco Automático

- Quando abre a preview, o foco volta automaticamente para o ficheiro `.md`
- Isso permite que quando abrir outro ficheiro, ele abra na aba correta (não na preview)
- Mantém o seu fluxo de trabalho fluido

## ⚙️ Configurações

Para aceder às configurações:

1. Abra as Settings do VS Code (`Ctrl+,` ou `Cmd+,`)
2. Procure por "GitHub README Viewer"
3. Configure as opções conforme necessário

### Opções de Configuração

#### `github-readme-viewer.autoOpen`
- **Tipo**: `boolean`
- **Padrão**: `false`
- **Descrição**: Abre automaticamente a preview quando um ficheiro Markdown é aberto. Quando ativado, também verifica ficheiros já abertos quando o VS Code inicia e abre as previews automaticamente.
- **Recomendação**: Ative se quer que a preview abra sempre que abrir um ficheiro `.md` ou quando o VS Code inicia com ficheiros Markdown abertos

**Exemplo:**
```json
{
  "github-readme-viewer.autoOpen": true
}
```

**Nota**: Se fechar a preview manualmente, ela não reabre automaticamente até fechar e reabrir o ficheiro.

#### `github-readme-viewer.updateDelay`
- **Tipo**: `number`
- **Padrão**: `300` (milissegundos)
- **Descrição**: Delay antes de atualizar a preview após editar o ficheiro
- **Valores**:
  - `0` = Atualização instantânea (pode ser mais lento com ficheiros grandes)
  - `300` = Aguarda 300ms após parar de editar (recomendado)
  - `1000` = Aguarda 1 segundo (útil para ficheiros muito grandes)
- **Mínimo**: `0`
- **Máximo**: `2000`

**Exemplo:**
```json
{
  "github-readme-viewer.updateDelay": 500
}
```

#### `github-readme-viewer.supportedFiles`
- **Tipo**: `array` de `string`
- **Padrão**: `["*.md"]`
- **Descrição**: Padrões de ficheiros suportados (usando sintaxe glob)
- **Padrões comuns**:
  - `*.md` - Todos os ficheiros `.md`
  - `*.markdown` - Todos os ficheiros `.markdown`
  - `README*` - Todos os ficheiros que começam com "README"
  - `**/*.md` - Todos os ficheiros `.md` em qualquer pasta

**Exemplo:**
```json
{
  "github-readme-viewer.supportedFiles": [
    "*.md",
    "*.markdown",
    "README*"
  ]
}
```

#### `github-readme-viewer.protectPreviewColumn`
- **Tipo**: `boolean`
- **Padrão**: `false`
- **Descrição**: Protege a coluna da preview de outros ficheiros. Quando ativado:
  - A preview usa uma coluna dedicada (coluna 2)
  - Outros ficheiros abertos nessa coluna serão automaticamente movidos para a primeira coluna
  - Ficheiros que tentam abrir na coluna da preview são redirecionados para a coluna 1
- **Recomendação**: Ative se quiser manter a preview sempre visível sem interferência de outros ficheiros

**Exemplo:**
```json
{
  "github-readme-viewer.protectPreviewColumn": true
}
```

#### `github-readme-viewer.openInBrowser`
- **Tipo**: `boolean`
- **Padrão**: `false`
- **Descrição**: Quando ativado, mostra um botão "🌐 Web" na preview do IDE. Ao clicar no botão:
  - A preview abre no seu navegador padrão
  - A preview do IDE fecha automaticamente
  - Atualiza automaticamente quando edita o ficheiro (usando o `updateDelay` configurado)
  - Usa um ficheiro HTML temporário na pasta `.vscode` do workspace
  - O ficheiro é apagado automaticamente quando o documento é fechado
- **Recomendação**: Ative se quiser ter a opção de abrir a preview no navegador a partir da preview do IDE

**Exemplo:**
```json
{
  "github-readme-viewer.openInBrowser": true
}
```

**Nota**: 
- Esta configuração apenas mostra o botão "Web" na preview do IDE
- Para abrir no browser, é necessário clicar no botão "🌐 Web" que aparece no canto superior direito da preview
- Quando a preview é aberta no browser, ela é servida através de um ficheiro HTML temporário que é atualizado automaticamente
- Se não houver workspace aberto, ficheiros pequenos (< 2MB) podem usar data URI (funcionalidade limitada)

#### `github-readme-viewer.maxWidth`
- **Tipo**: `number` | `string`
- **Padrão**: `980` (pixels)
- **Descrição**: Largura máxima do conteúdo na preview (em pixels). Use `"auto"` para largura total. Aplica-se tanto à preview do IDE quanto à do browser.
- **Valores**: 
  - Número (pixels) - ex: `980`, `1200`
  - `"auto"` - largura total do ecrã
- **Nota**: O GitHub usa 980px como largura padrão para melhor legibilidade.

**Exemplo:**
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

#### `github-readme-viewer.enableEmoji`
- **Tipo**: `boolean`
- **Padrão**: `true`
- **Descrição**: Ativa a renderização de emojis (ex: :smile:, :heart:). Aplica-se tanto à preview do IDE quanto à do browser.
- **Recomendação**: Mantenha ativado se usar emojis nos seus documentos Markdown

**Exemplo:**
```json
{
  "github-readme-viewer.enableEmoji": true
}
```

#### `github-readme-viewer.enableBreaks`
- **Tipo**: `boolean`
- **Padrão**: `false`
- **Descrição**: Converte quebras de linha simples em quebras de linha HTML (comportamento similar ao GitHub). Aplica-se tanto à preview do IDE quanto à do browser.
- **Recomendação**: Ative se quiser que quebras de linha simples sejam renderizadas como quebras de linha HTML (comportamento do GitHub)

**Exemplo:**
```json
{
  "github-readme-viewer.enableBreaks": true
}
```

#### `github-readme-viewer.closeOnFileClose`
- **Tipo**: `boolean`
- **Padrão**: `true`
- **Descrição**: Fecha automaticamente a preview quando o ficheiro Markdown é fechado (apenas preview do IDE).
- **Recomendação**: Mantenha ativado para manter o workspace limpo

**Exemplo:**
```json
{
  "github-readme-viewer.closeOnFileClose": true
}
```

#### `github-readme-viewer.focusEditorAfterOpen`
- **Tipo**: `boolean`
- **Padrão**: `true`
- **Descrição**: Foca no editor após abrir a preview, permitindo continuar a editar imediatamente (apenas preview do IDE).
- **Recomendação**: Mantenha ativado para um fluxo de trabalho mais fluido

**Exemplo:**
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

**Nota**: Os atalhos de teclado não podem ser configurados através das configurações da extensão. Eles devem ser personalizados através das preferências de Keyboard Shortcuts do VS Code.

## 🎨 Funcionalidades

### ✅ Atualização Automática
- A preview atualiza automaticamente quando edita o ficheiro Markdown
- O delay é configurável através da opção `updateDelay`
- Atualização imediata quando guarda o ficheiro (Ctrl+S)
- Debouncing configurável para evitar atualizações excessivas durante a escrita

### ✅ Preferências Guardadas
- A preferência de tema (dark/light) é guardada por ficheiro
- Quando reabre um ficheiro, a preview usa o último tema escolhido
- Preferências persistem entre sessões do VS Code
- Cada ficheiro tem a sua própria preferência de tema

### ✅ Suporte para Múltiplos Ficheiros
- Pode ter várias previews abertas ao mesmo tempo (uma por ficheiro)
- Cada preview mantém as suas próprias preferências
- Prevenção de duplicados (não abre múltiplas previews para o mesmo ficheiro)

### ✅ Integração com VS Code
- A preview adapta-se ao tema do VS Code (se não tiver preferência guardada)
- Usa as cores do VS Code para melhor integração visual
- Foco automático no editor após abrir a preview
- Fecha automaticamente quando o ficheiro é fechado

### ✅ Preview no Browser
- Opção para abrir preview no navegador externo (via botão "Web" na preview do IDE)
- Atualização automática no browser quando edita o ficheiro
- Ficheiro HTML temporário criado na pasta `.vscode` do workspace
- Limpeza automática quando o ficheiro é fechado
- **Nota**: O browser preview não tem botão de toggle dark/light mode - o tema é definido no momento da abertura baseado na preferência guardada

## 📝 Exemplos de Uso

### Exemplo 1: Trabalhar com README.md

1. Abra um ficheiro `README.md`
2. Pressione `Alt+R` para abrir a preview
3. Edite o ficheiro e veja a preview atualizar automaticamente
4. Clique no botão para alternar entre dark e light mode
5. Feche o ficheiro e a preview fecha automaticamente

### Exemplo 2: Ativar Auto-Open

1. Abra as Settings (`Ctrl+,`)
2. Procure "GitHub README Viewer"
3. Ative "Auto Open"
4. Agora, sempre que abrir um ficheiro `.md`, a preview abre automaticamente

### Exemplo 3: Configurar Delay Personalizado

1. Abra as Settings
2. Procure "Update Delay"
3. Defina o valor desejado (ex: `500` para 500ms)
4. A preview atualiza com o delay configurado

### Exemplo 4: Suportar Outros Ficheiros Markdown

1. Abra as Settings
2. Procure "Supported Files"
3. Adicione padrões como `["*.md", "*.markdown", "*.txt"]`
4. Agora a extensão funciona com esses tipos de ficheiro

### Exemplo 5: Proteger a Coluna da Preview

1. Abra as Settings
2. Procure "Protect Preview Column"
3. Ative a opção
4. A preview agora usa uma coluna dedicada (coluna 2)
5. Outros ficheiros abertos nessa coluna serão movidos automaticamente para a primeira coluna
6. Se um ficheiro tentar abrir na coluna da preview, será redirecionado para a coluna 1
7. Mantém a preview sempre visível sem interferência

### Exemplo 6: Abrir Preview no Navegador

1. Abra as Settings
2. Procure "Open In Browser"
3. Ative a opção
4. Abra um ficheiro `.md` e use `Alt+R` ou clique no botão "Open README Preview"
5. A preview abre no painel do IDE com um botão "🌐 Web" visível
6. Clique no botão "🌐 Web" no canto superior direito da preview
7. A preview abre no seu navegador padrão e a preview do IDE fecha automaticamente
8. Edite o ficheiro e veja a preview atualizar automaticamente no navegador
9. A preview fecha automaticamente quando fecha o ficheiro no VS Code

**Nota**: O botão "Web" só aparece na preview do IDE quando `openInBrowser` está ativado. A preview não abre diretamente no browser quando a configuração está ativa - é necessário clicar no botão.

## 🔧 Resolução de Problemas

### A preview não abre
- Verifique se o ficheiro é um ficheiro Markdown (`.md`)
- Verifique se o ficheiro está na lista de ficheiros suportados
- Tente usar o atalho `Alt+R` diretamente
- Verifique se o botão aparece na barra de título do editor

### A preview não atualiza
- Verifique a configuração `updateDelay`
- Tente definir `updateDelay` para `0` para atualização instantânea
- Certifique-se de que o ficheiro está salvo

### O tema não muda
- Certifique-se de que a preview está ativa (visível)
- Tente usar o atalho `Ctrl+Shift+T`
- Verifique se há alguma mensagem de erro no console

### Auto-open não funciona
- Verifique se `autoOpen` está ativado nas configurações
- Certifique-se de que o ficheiro corresponde aos padrões em `supportedFiles`
- Se fechou a preview manualmente, ela não reabre automaticamente até abrir o ficheiro novamente

### Preview no browser não funciona
- Certifique-se de que tem um workspace aberto (necessário para criar o ficheiro HTML temporário)
- Se não houver workspace, apenas ficheiros pequenos (< 2MB) podem funcionar com data URI
- Verifique se a configuração `openInBrowser` está ativada para mostrar o botão "Web"
- Lembre-se que é necessário clicar no botão "🌐 Web" na preview do IDE para abrir no browser
- A preview não abre diretamente no browser - primeiro abre no IDE, depois clique no botão "Web"

## 💡 Dicas

1. **Atalhos Rápidos**: Use `Alt+R` para abrir e `Ctrl+Shift+T` para alternar tema
2. **Auto-Open**: Ative `autoOpen` se trabalha frequentemente com ficheiros Markdown
3. **Delay Personalizado**: Ajuste `updateDelay` conforme o tamanho dos seus ficheiros
4. **Múltiplos Ficheiros**: Pode ter várias previews abertas ao mesmo tempo
5. **Preferências**: As preferências são guardadas por ficheiro, não globalmente

## 🆘 Suporte

Se encontrar problemas ou tiver sugestões:

1. Verifique este guia primeiro
2. Verifique as configurações da extensão
3. Reporte problemas ou sugestões no repositório do GitHub

## 📚 Recursos Adicionais

- [Documentação do VS Code](https://code.visualstudio.com/docs)
- [Guia de Markdown](https://www.markdownguide.org/)
- [GitHub Markdown CSS](https://github.com/sindresorhus/github-markdown-css)

---

**Desfrute da extensão GitHub README Viewer!** 🎉

