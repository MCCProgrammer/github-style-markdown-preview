# GitHub README Viewer - Guia de Uso

## 📖 Visão Geral

A extensão **GitHub README Viewer** permite visualizar ficheiros Markdown no estilo GitHub, com suporte para temas dark e light, atualização automática em tempo real e várias opções de personalização.

## 🚀 Como Usar

### Abrir a Preview

Existem várias formas de abrir a preview de um ficheiro Markdown:

#### 1. **Botão no Editor**
- Quando um ficheiro `.md` está aberto, aparece um botão **"Open README Preview"** na barra de título do editor
- Clique no botão para abrir a preview

#### 2. **Atalho de Teclado**
- Pressione `Ctrl+Shift+R` (Windows/Linux) ou `Cmd+Shift+R` (Mac) quando um ficheiro Markdown está ativo
- A preview abre automaticamente ao lado do editor

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
- **Com auto-open ativado**: Se fechar a preview manualmente, ela não reabre automaticamente. Só reabre quando você abrir o ficheiro novamente

## ⚙️ Configurações

Para aceder às configurações:

1. Abra as Settings do VS Code (`Ctrl+,` ou `Cmd+,`)
2. Procure por "GitHub README Viewer"
3. Configure as opções conforme necessário

### Opções de Configuração

#### `github-readme-viewer.autoOpen`
- **Tipo**: `boolean`
- **Padrão**: `false`
- **Descrição**: Abre automaticamente a preview quando um ficheiro Markdown é aberto
- **Recomendação**: Ative se quer que a preview abra sempre que abrir um ficheiro `.md`

**Exemplo:**
```json
{
  "github-readme-viewer.autoOpen": true
}
```

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

## 🎨 Funcionalidades

### ✅ Atualização Automática
- A preview atualiza automaticamente quando edita o ficheiro Markdown
- O delay é configurável através da opção `updateDelay`

### ✅ Preferências Guardadas
- A preferência de tema (dark/light) é guardada por ficheiro
- Quando reabre um ficheiro, a preview usa o último tema escolhido

### ✅ Suporte para Múltiplos Ficheiros
- Pode ter várias previews abertas ao mesmo tempo (uma por ficheiro)
- Cada preview mantém as suas próprias preferências

### ✅ Integração com VS Code
- A preview adapta-se ao tema do VS Code (se não tiver preferência guardada)
- Usa as cores do VS Code para melhor integração visual

## 📝 Exemplos de Uso

### Exemplo 1: Trabalhar com README.md

1. Abra um ficheiro `README.md`
2. Pressione `Ctrl+Shift+R` para abrir a preview
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

## 🔧 Resolução de Problemas

### A preview não abre
- Verifique se o ficheiro é um ficheiro Markdown (`.md`)
- Verifique se o ficheiro está na lista de ficheiros suportados
- Tente usar o atalho `Ctrl+Shift+R` diretamente

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

## 💡 Dicas

1. **Atalhos Rápidos**: Use `Ctrl+Shift+R` para abrir e `Ctrl+Shift+T` para alternar tema
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

