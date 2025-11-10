import * as vscode from 'vscode';
import MarkdownIt from 'markdown-it';

// ============================================================================
// UTILITY FUNCTIONS - Funções auxiliares para gestão de estado e preferências
// ============================================================================

/**
 * Gera uma chave única para armazenar a preferência de tema de um documento específico.
 * Cada ficheiro tem a sua própria preferência de tema (dark/light) guardada.
 * 
 * @param document - O documento para o qual gerar a chave
 * @returns Chave única no formato: "github-readme-viewer.theme-mode.{uri}"
 */
function getThemePreferenceKey(document: vscode.TextDocument): string {
	return `github-readme-viewer.theme-mode.${document.uri.toString()}`;
}

/**
 * Guarda a preferência de tema (dark/light) para um documento específico.
 * A preferência é persistida no workspaceState e mantém-se entre sessões do VS Code.
 * 
 * @param context - Contexto da extensão para aceder ao workspaceState
 * @param document - O documento para o qual guardar a preferência
 * @param isDark - true para tema dark, false para tema light
 */
async function saveThemePreference(context: vscode.ExtensionContext, document: vscode.TextDocument, isDark: boolean): Promise<void> {
	const key = getThemePreferenceKey(document);
	await context.workspaceState.update(key, isDark);
}

/**
 * Carrega a preferência de tema guardada para um documento.
 * Se não existir preferência guardada, retorna null (será usado o tema padrão do VS Code).
 * 
 * @param context - Contexto da extensão para aceder ao workspaceState
 * @param document - O documento para o qual carregar a preferência
 * @returns true para dark, false para light, ou null se não houver preferência guardada
 */
function loadThemePreference(context: vscode.ExtensionContext, document: vscode.TextDocument): boolean | null {
	const key = getThemePreferenceKey(document);
	const saved = context.workspaceState.get<boolean | undefined>(key, undefined);
	return saved === undefined ? null : saved;
}

/**
 * Gera uma chave única para rastrear se uma preview foi fechada manualmente pelo utilizador.
 * Isto previne que o auto-open reabra previews que o utilizador fechou explicitamente.
 * 
 * @param document - O documento para o qual gerar a chave
 * @returns Chave única no formato: "github-readme-viewer.preview-closed.{uri}"
 */
function getPreviewClosedKey(document: vscode.TextDocument): string {
	return `github-readme-viewer.preview-closed.${document.uri.toString()}`;
}

/**
 * Guarda o estado de fechamento manual de uma preview.
 * Quando o utilizador fecha manualmente uma preview, este estado é guardado para
 * prevenir que o auto-open a reabra até que o ficheiro seja fechado e reaberto.
 * 
 * @param context - Contexto da extensão para aceder ao workspaceState
 * @param document - O documento para o qual guardar o estado
 * @param closed - true se foi fechada manualmente, false para permitir auto-open
 */
async function setPreviewClosed(context: vscode.ExtensionContext, document: vscode.TextDocument, closed: boolean): Promise<void> {
	const key = getPreviewClosedKey(document);
	await context.workspaceState.update(key, closed);
}

/**
 * Verifica se uma preview foi fechada manualmente para um documento.
 * Usado pela funcionalidade auto-open para respeitar as ações do utilizador.
 * 
 * @param context - Contexto da extensão para aceder ao workspaceState
 * @param document - O documento para verificar
 * @returns true se foi fechada manualmente, false caso contrário
 */
function isPreviewClosed(context: vscode.ExtensionContext, document: vscode.TextDocument): boolean {
	const key = getPreviewClosedKey(document);
	return context.workspaceState.get<boolean>(key, false);
}

/**
 * Verifica se um documento é suportado pela extensão.
 * Um documento é suportado se:
 * 1. Tem o languageId 'markdown'
 * 2. O nome do ficheiro corresponde a um dos padrões configurados (ex: *.md, README*)
 * 
 * Os padrões são convertidos de glob para regex para fazer a correspondência:
 * - ** → .* (qualquer caracteres incluindo separadores de caminho)
 * - *  → [^/]* (qualquer caracteres exceto separadores de caminho)
 * - ?  → . (um único caracter)
 * 
 * @param document - O documento a verificar
 * @returns true se o documento é suportado, false caso contrário
 */
function isFileSupported(document: vscode.TextDocument): boolean {
	const config = vscode.workspace.getConfiguration('github-readme-viewer');
	const supportedPatterns = config.get<string[]>('supportedFiles', ['*.md']);
	const fileName = document.fileName;
	
	// Primeiro verificar: o documento deve ser do tipo markdown
	if (document.languageId !== 'markdown') {
		return false;
	}
	
	// Segundo verificar: o nome do ficheiro deve corresponder a um dos padrões configurados
	return supportedPatterns.some(pattern => {
		// Converter padrão glob para regex
		// Exemplo: "*.md" → "^[^/]*\.md$"
		const regexPattern = pattern
			.replace(/\*\*/g, '.*')      // ** corresponde a qualquer caminho
			.replace(/\*/g, '[^/]*')     // * corresponde a qualquer caracter exceto /
			.replace(/\?/g, '.');        // ? corresponde a um único caracter
		const regex = new RegExp(`^${regexPattern}$`, 'i'); // Case-insensitive
		// Testar tanto o nome do ficheiro como o caminho completo
		return regex.test(fileName) || regex.test(document.uri.fsPath);
	});
}

// ============================================================================
// EXTENSION ACTIVATION - Função principal de ativação da extensão
// ============================================================================

/**
 * Função principal de ativação da extensão.
 * É chamada quando o VS Code ativa a extensão.
 * Configura todos os handlers de comandos, listeners de eventos e opções de configuração.
 * 
 * @param context - Contexto da extensão fornecido pelo VS Code
 */
export function activate(context: vscode.ExtensionContext) {
	try {
	console.log('GitHub README Viewer is active!');

		// ========================================================================
		// ESTRUTURAS DE DADOS PARA GESTÃO DE PREVIEWS
		// ========================================================================
		
		/**
		 * Map de painéis webview ativos, indexados por URI do documento.
		 * Usado para rastrear quais documentos têm previews abertas e prevenir duplicados.
		 * Chave: URI do documento como string
		 * Valor: instância do painel webview
		 */
		const activePanels = new Map<string, vscode.WebviewPanel>();
		
		/**
		 * Map de colunas de visualização para cada preview.
		 * Rastreia em que coluna cada preview está exibida (para funcionalidade protectPreviewColumn).
		 * Chave: URI do documento como string
		 * Valor: coluna de visualização onde a preview está exibida
		 */
		const previewViewColumns = new Map<string, vscode.ViewColumn>();
		
		/**
		 * Map de documentos associados a cada preview.
		 * Armazena referências aos documentos originais para focar após abrir a preview.
		 * Chave: URI do documento como string
		 * Valor: instância do documento de texto
		 */
		const previewDocuments = new Map<string, vscode.TextDocument>();

		/**
		 * Map de dados de previews no browser (para modo browser externo).
		 * Armazena metadados sobre previews abertas em browsers externos, incluindo:
		 * - Referência ao documento
		 * - Modo de tema atual (dark/light)
		 * - Último conteúdo conhecido (para detecção de mudanças)
		 * - Timestamp da última atualização
		 * Chave: URI do documento como string
		 * Valor: objeto com metadados da preview no browser
		 */
		const browserPreviews = new Map<string, { 
			document: vscode.TextDocument; 
			isDarkMode: boolean; 
			lastContent: string;
			lastUpdate: number;
		}>();

		// ========================================================================
		// FUNCIONALIDADE DE PREVIEW NO BROWSER (BROWSER EXTERNO)
		// ========================================================================
		
		/**
		 * Abre uma preview de Markdown num browser externo.
		 * 
		 * Esta função:
		 * 1. Cria um ficheiro HTML temporário na pasta .vscode do workspace
		 * 2. Renderiza o conteúdo Markdown usando markdown-it
		 * 3. Aplica CSS estilo GitHub (tema dark ou light)
		 * 4. Abre o ficheiro HTML no browser padrão
		 * 5. Configura listeners de auto-atualização para refrescar o HTML quando o ficheiro muda
		 * 
		 * Para protocolo file:// (ficheiros locais), as atualizações são detetadas através
		 * de recarregamentos periódicos da página quando o utilizador está inativo.
		 * O ficheiro HTML é atualizado quando o ficheiro é guardado (Ctrl+S).
		 * 
		 * @param document - O documento markdown para fazer preview
		 * @param context - Contexto da extensão
		 * @param updateDelay - Delay em milissegundos antes de atualizar preview após edição (para debouncing)
		 */
		async function openPreviewInBrowser(document: vscode.TextDocument, context: vscode.ExtensionContext, updateDelay: number) {
			const documentUri = document.uri.toString();
			
			// Fechar preview do IDE se estiver aberta (apenas um modo de preview de cada vez)
			const existingPanel = activePanels.get(documentUri);
			if (existingPanel) {
				existingPanel.dispose();
			}
			
			// Verificar se já existe uma preview no browser para este ficheiro
			if (browserPreviews.has(documentUri)) {
				// Se já existe, informar o utilizador (não podemos controlar o browser diretamente)
				vscode.window.showInformationMessage('Preview já está aberta no browser. Verifique o seu navegador.');
				return;
			}

			// Carregar preferência de tema guardada (por ficheiro) ou usar o tema atual do VS Code como padrão
			const savedThemePreference = loadThemePreference(context, document);
			const vsCodeTheme = vscode.window.activeColorTheme;
			const defaultIsDark = vsCodeTheme.kind === vscode.ColorThemeKind.Dark;
			let isDarkMode = savedThemePreference !== null ? savedThemePreference : defaultIsDark;

			// Carregar configurações
			const config = vscode.workspace.getConfiguration('github-readme-viewer');
			const enableEmoji = config.get<boolean>('enableEmoji', true);
			const enableBreaks = config.get<boolean>('enableBreaks', false);
			const maxWidth = config.get<number | string>('maxWidth', 980);
			
			// Inicializar renderizador Markdown com configurações
			const md = new MarkdownIt({
				breaks: enableBreaks,
				html: false, // Por segurança, não permitir HTML inline
				linkify: true, // Converter URLs em links automaticamente
			});
			
			// Adicionar suporte para emojis se ativado
			if (enableEmoji) {
				// markdown-it-emoji seria necessário, mas por agora vamos apenas permitir emojis Unicode
				// Emojis Unicode já funcionam nativamente
			}
			
			const encoder = new TextEncoder();
			
			/**
			 * Atualiza o ficheiro HTML temporário com novo conteúdo e tema.
			 * É chamada sempre que o documento muda ou é guardado.
			 * 
			 * @param tempFile - URI do ficheiro HTML temporário
			 * @param content - O conteúdo markdown para renderizar
			 * @param darkMode - true para usar tema dark, false para tema light
			 */
			const updateHtmlFile = async (tempFile: vscode.Uri, content: string, darkMode: boolean) => {
				const rendered = md.render(content);
				const htmlContent = getBrowserHtml(rendered, content, darkMode, documentUri, updateDelay, maxWidth);
				const data = encoder.encode(htmlContent);
				await vscode.workspace.fs.writeFile(tempFile, data);
			};

			const content = document.getText();
			
			// ========================================================================
			// ESTRATÉGIA DE CRIAÇÃO DE FICHEIRO TEMPORÁRIO
			// ========================================================================
			// Tentar criar ficheiro HTML no workspace, ou usar data URI como fallback
			// Ficheiros no workspace permitem auto-atualizações via file system watching
			// Data URIs são limitadas mas funcionam quando não há workspace aberto
			
			let tempFile: vscode.Uri | undefined;
			let useDataUri = false;
			
			// Estratégia 1: Criar ficheiro HTML temporário na pasta .vscode do workspace
			// Isto permite que o browser recarregue o ficheiro e veja atualizações
			const workspaceFolders = vscode.workspace.workspaceFolders;
			if (workspaceFolders && workspaceFolders.length > 0) {
				// Criar ficheiro no primeiro workspace
				const workspaceFolder = workspaceFolders[0];
				// Nome único baseado em timestamp para evitar conflitos
				tempFile = vscode.Uri.joinPath(workspaceFolder.uri, '.vscode', `preview-${Date.now()}.html`);
				
				// Criar diretório .vscode se não existir
				const vscodeDir = vscode.Uri.joinPath(workspaceFolder.uri, '.vscode');
				try {
					await vscode.workspace.fs.createDirectory(vscodeDir);
				} catch (error) {
					// Diretório já existe ou erro - continuar de qualquer forma
				}
			} else {
				// Estratégia 2: Usar data URI para ficheiros pequenos quando não há workspace aberto
				// Data URIs têm limitações de tamanho (~2MB) e não suportam auto-atualizações bem
				if (content.length < 2 * 1024 * 1024) {
					useDataUri = true;
				} else {
					vscode.window.showErrorMessage('Sem workspace aberto. Por favor, abra um workspace para usar a preview no browser.');
					return;
				}
			}
		
			try {
				if (useDataUri) {
					// ========================================================================
					// MODO DATA URI (Sem workspace disponível)
					// ========================================================================
					// Usar data URI para abrir diretamente no browser
					// Funcionalidade limitada: sem auto-atualizações, limite de tamanho ~2MB
					const rendered = md.render(content);
					const htmlContent = getBrowserHtml(rendered, content, isDarkMode, documentUri, updateDelay, maxWidth);
					const dataUri = `data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`;
					await vscode.env.openExternal(vscode.Uri.parse(dataUri));
					
					// Guardar dados da preview (mas não podemos atualizar data URI facilmente)
					browserPreviews.set(documentUri, {
						document,
						isDarkMode,
						lastContent: content,
						lastUpdate: Date.now()
					});
					
					vscode.window.showInformationMessage('Preview aberta no browser. Nota: Atualizações automáticas podem não funcionar com data URI. Considere abrir um workspace.');
					return;
				}
				
				// ========================================================================
				// MODO FICHEIRO WORKSPACE (Recomendado)
				// ========================================================================
				// Criar ficheiro HTML inicial
				await updateHtmlFile(tempFile!, content, isDarkMode);
				
				// Abrir o ficheiro HTML no browser padrão
				// O VS Code converte automaticamente a URI para um caminho file://
				await vscode.env.openExternal(tempFile!);
				
				// Guardar metadados da preview para rastreamento e atualizações
				browserPreviews.set(documentUri, {
					document,
					isDarkMode,
					lastContent: content,
					lastUpdate: Date.now()
				});

				// Guardar referência ao ficheiro temporário para atualizações futuras
				const savedTempFile = tempFile!;

				// ========================================================================
				// MECANISMO DE AUTO-ATUALIZAÇÃO PARA PREVIEW NO BROWSER
				// ========================================================================
				// Função de atualização com debounce para evitar escritas excessivas enquanto se digita
				let updateTimeout: ReturnType<typeof setTimeout> | undefined;
				
				/**
				 * Agenda uma atualização do ficheiro HTML quando o documento muda.
				 * Usa debouncing para evitar escrever no disco a cada tecla pressionada.
				 * Se updateDelay for 0, as atualizações são instantâneas (sem debouncing).
				 */
				const scheduleUpdate = () => {
					if (updateTimeout) {
						clearTimeout(updateTimeout);
					}
					if (updateDelay > 0) {
						// Atualização com debounce: aguarda que o utilizador pare de digitar
						updateTimeout = setTimeout(async () => {
							const preview = browserPreviews.get(documentUri);
							if (preview) {
								const currentDoc = vscode.workspace.textDocuments.find(d => d.uri.toString() === documentUri);
								if (currentDoc) {
									const newContent = currentDoc.getText();
									// Só atualizar se o conteúdo realmente mudou
									if (newContent !== preview.lastContent) {
										preview.lastContent = newContent;
										preview.lastUpdate = Date.now();
										await updateHtmlFile(savedTempFile, newContent, preview.isDarkMode);
									}
								}
							}
						}, updateDelay);
					} else {
						// Atualização instantânea: sem debouncing (pode causar problemas de performance com ficheiros grandes)
						(async () => {
							const preview = browserPreviews.get(documentUri);
							if (preview) {
								const currentDoc = vscode.workspace.textDocuments.find(d => d.uri.toString() === documentUri);
								if (currentDoc) {
									const newContent = currentDoc.getText();
									if (newContent !== preview.lastContent) {
										preview.lastContent = newContent;
										preview.lastUpdate = Date.now();
										await updateHtmlFile(savedTempFile, newContent, preview.isDarkMode);
									}
								}
							}
						})().catch(() => {
							// Ignorar erros silenciosamente
						});
					}
				};

				// ========================================================================
				// LISTENERS DE EVENTOS PARA ATUALIZAÇÕES DA PREVIEW NO BROWSER
				// ========================================================================
				
				/**
				 * Listener para mudanças no documento - agenda atualizações do ficheiro HTML.
				 * Dispara sempre que o utilizador digita ou edita o ficheiro markdown.
				 */
				const changeSubscription = vscode.workspace.onDidChangeTextDocument((e) => {
					if (e.document.uri.toString() === documentUri) {
						scheduleUpdate();
					}
				});

				/**
				 * Listener para eventos de fechamento de documento - limpa recursos da preview no browser.
				 * Remove preview do map de rastreamento, dispõe listeners de eventos e apaga ficheiro HTML temporário.
				 */
				const closeSubscription = vscode.workspace.onDidCloseTextDocument((doc) => {
					if (doc.uri.toString() === documentUri) {
						browserPreviews.delete(documentUri);
						changeSubscription.dispose();
						closeSubscription.dispose();
						if (updateTimeout) {
							clearTimeout(updateTimeout);
						}
						// Tentar apagar o ficheiro HTML temporário (se foi criado)
						if (savedTempFile && !useDataUri) {
							vscode.workspace.fs.delete(savedTempFile).then(() => {
								// Ficheiro apagado com sucesso
							}, () => {
								// Ignorar erros de apagamento (ficheiro pode ter sido apagado manualmente)
							});
						}
					}
				});

				// Registar subscriptions para limpeza quando a extensão desativar
				context.subscriptions.push(changeSubscription, closeSubscription);
			} catch (error) {
				vscode.window.showErrorMessage(`Erro ao abrir preview no browser: ${error}`);
			}
		}

		// ========================================================================
		// FUNCIONALIDADE DE PREVIEW NO IDE (WEBVIEW PANEL)
		// ========================================================================
		
		/**
		 * Abre uma preview de Markdown no painel webview do VS Code (preview no IDE).
		 * 
		 * Esta função:
		 * 1. Verifica se já existe uma preview aberta para este documento (se sim, apenas revela)
		 * 2. Cria um novo painel webview com estilo GitHub
		 * 3. Renderiza o conteúdo Markdown usando markdown-it
		 * 4. Aplica o tema preferido do utilizador (dark/light) por ficheiro
		 * 5. Configura listeners de auto-atualização para refrescar preview quando o ficheiro muda
		 * 6. Lida com botões de toggle de tema e abertura no browser
		 * 
		 * A preview respeita a configuração protectPreviewColumn:
		 * - Se ativada: preview abre na coluna 2 (coluna dedicada para previews)
		 * - Se desativada: preview abre ao lado do editor (ViewColumn.Beside)
		 * 
		 * @param document - O documento markdown para fazer preview
		 */
		async function openPreview(document: vscode.TextDocument) {
			const documentUri = document.uri.toString();

			// Carregar configurações da extensão
			const config = vscode.workspace.getConfiguration('github-readme-viewer');
			const updateDelay = config.get<number>('updateDelay', 300);
			const protectPreviewColumn = config.get<boolean>('protectPreviewColumn', false);

			// Verificar se já existe um painel aberto para este documento
			// Se existir, apenas revelar e focar o editor (não criar duplicado)
			const existingPanel = activePanels.get(documentUri);
			if (existingPanel) {
				existingPanel.reveal();
				// Focar no editor do documento após revelar a preview
				const editor = await vscode.window.showTextDocument(document, { preview: false });
				return;
			}

			// Carregar preferência de tema guardada para este ficheiro, ou usar o tema atual do VS Code como padrão
			const savedThemePreference = loadThemePreference(context, document);
			const vsCodeTheme = vscode.window.activeColorTheme;
			const defaultIsDark = vsCodeTheme.kind === vscode.ColorThemeKind.Dark;
			let isDarkMode: boolean = savedThemePreference !== null ? savedThemePreference : defaultIsDark;
			
			// Carregar configurações para markdown-it
			const enableEmoji = config.get<boolean>('enableEmoji', true);
			const enableBreaks = config.get<boolean>('enableBreaks', false);
			
			// Inicializar renderizador Markdown com configurações
			const md = new MarkdownIt({
				breaks: enableBreaks,
				html: false, // Por segurança, não permitir HTML inline
				linkify: true, // Converter URLs em links automaticamente
			});

			// Extrair nome do ficheiro para o título do painel (ex: "README.md Preview")
			const fileName = document.fileName.split(/[/\\]/).pop() || 'README.md';
			
			// Determinar coluna de visualização baseada nas configurações
			const previewPosition = config.get<string>('previewPosition', 'beside');
			let previewViewColumn: vscode.ViewColumn;
			
			if (protectPreviewColumn) {
				// Se proteção ativada, sempre usar coluna 2
				previewViewColumn = vscode.ViewColumn.Two;
			} else {
				// Caso contrário, usar a configuração previewPosition
				switch (previewPosition) {
					case 'right':
						previewViewColumn = vscode.ViewColumn.Two;
						break;
					case 'below':
						previewViewColumn = vscode.ViewColumn.Three; // Abaixo (coluna 3)
						break;
					case 'active':
						previewViewColumn = vscode.ViewColumn.Active;
						break;
					case 'beside':
					default:
						previewViewColumn = vscode.ViewColumn.Beside;
						break;
				}
			}
			
			// Criar painel webview para a preview
			const panel = vscode.window.createWebviewPanel(
				'githubReadmePreview', // ID do webview (usado em when clauses para menus/keybindings)
				`${fileName} Preview`, // Título do painel
				previewViewColumn,     // Onde abrir o painel
				{
					enableScripts: true,              // Permitir JavaScript no webview (necessário para toggle de tema)
					retainContextWhenHidden: true,    // Manter estado do webview quando oculto (melhora performance)
				}
			);

			// Guardar painel e metadados nos maps para rastreamento
			activePanels.set(documentUri, panel);
			previewViewColumns.set(documentUri, previewViewColumn);
			previewDocuments.set(documentUri, document);

			// ========================================================================
			// HANDLING DE DISPOSAL DO PAINEL
			// ========================================================================
			/**
			 * Lida com o fechamento do painel (quando o utilizador fecha a preview).
			 * Distingue entre fechamento manual (documento ainda aberto) e fechamento automático (documento fechado).
			 * Isto é importante para a funcionalidade auto-open: se o utilizador fechar manualmente a preview,
			 * não a reabrir até que o ficheiro seja fechado e reaberto.
			 */
			panel.onDidDispose(() => {
				// Remover dos maps de rastreamento
				activePanels.delete(documentUri);
				previewViewColumns.delete(documentUri);
				previewDocuments.delete(documentUri);
				
				// Verificar se foi fechamento manual ou automático (devido ao ficheiro ser fechado)
				// Se o documento ainda existe, foi fechamento manual
				const documentStillExists = vscode.workspace.textDocuments.some(doc => doc.uri.toString() === documentUri);
				if (documentStillExists) {
					// Fechamento manual: utilizador fechou a preview mas o documento ainda está aberto
					// Marcar como fechada para prevenir que auto-open a reabra
					setPreviewClosed(context, document, true).catch(() => {
						// Ignorar erros
					});
				} else {
					// Fechamento automático: documento foi fechado, então a preview foi fechada automaticamente
					// Resetar estado de fechamento para permitir reabrir quando o ficheiro for aberto novamente
					setPreviewClosed(context, document, false).catch(() => {
						// Ignorar erros
					});
				}
			});

			// ========================================================================
			// ATUALIZAÇÕES DE CONTEÚDO DO WEBVIEW
			// ========================================================================
			
			/**
			 * Atualiza o conteúdo HTML do painel webview com o conteúdo atual do documento.
			 * É chamada sempre que:
			 * - A preview é aberta pela primeira vez
			 * - O conteúdo do documento muda (com debouncing)
			 * - O documento é guardado (atualização imediata)
			 * - O tema é alternado
			 * 
			 * Renderiza Markdown para HTML, aplica CSS estilo GitHub, e inclui
			 * botões interativos (toggle de tema, botão web se ativado).
			 */
			const updateWebview = () => {
				// Obter o documento atual (pode ter mudado desde que o painel foi criado)
				const currentDocument = vscode.workspace.textDocuments.find(doc => doc.uri.toString() === documentUri);
				if (!currentDocument) {
					return; // Documento já foi fechado, não pode atualizar
				}

				// Obter conteúdo do documento e renderizar Markdown para HTML
				const content = currentDocument.getText();
				const rendered = md.render(content);
				
				// Selecionar ficheiro CSS baseado na preferência de tema atual
				const cssFile = isDarkMode ? 'github-markdown-dark.css' : 'github-markdown-light.css';
				
				// Converter URI da extensão para URI do webview para carregar ficheiro CSS
				const githubCssUri = panel.webview.asWebviewUri(
					vscode.Uri.joinPath(context.extensionUri, 'node_modules', 'github-markdown-css', cssFile)
				);

				// Verificar se a configuração openInBrowser está ativa para mostrar o botão Web
				const config = vscode.workspace.getConfiguration('github-readme-viewer');
				const openInBrowser = config.get<boolean>('openInBrowser', false);
				const maxWidth = config.get<number | string>('maxWidth', 980);
				
				// Gerar e definir conteúdo HTML para o webview
				panel.webview.html = getWebviewHtml(rendered, githubCssUri, content, isDarkMode, openInBrowser, maxWidth);
			};

			// ========================================================================
			// FUNCIONALIDADE DE TOGGLE DE TEMA
			// ========================================================================
			
			/**
			 * Alterna entre tema dark e light para a preview.
			 * Guarda a preferência por ficheiro para que cada documento se lembre da sua escolha de tema.
			 * Atualiza o webview para refletir o novo tema imediatamente.
			 */
			const toggleTheme = async () => {
				isDarkMode = !isDarkMode;
				await saveThemePreference(context, document, isDarkMode);
				updateWebview(); // Refrescar webview com novo tema
			};

			// Guardar função de toggle no contexto do painel para acesso externo (ex: command palette)
			(panel as any).toggleTheme = toggleTheme;

			// ========================================================================
			// MECANISMO DE AUTO-ATUALIZAÇÃO PARA PREVIEW NO IDE
			// ========================================================================
			
			/**
			 * Agendador de atualização com debounce para preview no IDE.
			 * Previne atualizações excessivas do webview enquanto o utilizador está a digitar.
			 * Se updateDelay for 0, as atualizações são instantâneas (sem debouncing).
			 */
			let updateTimeout: ReturnType<typeof setTimeout> | undefined;
			const scheduleUpdate = () => {
				if (updateTimeout) {
					clearTimeout(updateTimeout);
				}
				if (updateDelay > 0) {
					// Com debounce: aguarda que o utilizador pare de digitar
					updateTimeout = setTimeout(() => {
						updateWebview();
					}, updateDelay);
				} else {
					// Instantâneo: atualiza imediatamente (pode causar problemas de performance)
					updateWebview();
				}
			};

			/**
			 * Listener para mudanças no documento - agenda atualizações da preview.
			 * Dispara sempre que o utilizador digita ou edita o ficheiro markdown.
			 */
			const changeSubscription = vscode.workspace.onDidChangeTextDocument((e) => {
				if (e.document.uri.toString() === documentUri) {
					scheduleUpdate();
				}
			});

			/**
			 * Listener para eventos de guardar documento - atualiza preview imediatamente.
			 * Garante que a preview está atualizada assim que o ficheiro é guardado (Ctrl+S).
			 */
			const saveSubscription = vscode.workspace.onDidSaveTextDocument((doc) => {
				if (doc.uri.toString() === documentUri) {
					// Atualizar imediatamente quando guarda (sem debouncing)
					updateWebview();
				}
			});

			// ========================================================================
			// FUNCIONALIDADE DE BOTÃO PARA ABRIR NO BROWSER
			// ========================================================================
			
			/**
			 * Abre a preview no browser externo e fecha o painel do IDE.
			 * É chamada quando o utilizador clica no botão "Web" na preview do IDE.
			 */
			const openInBrowserAndClose = async () => {
				const config = vscode.workspace.getConfiguration('github-readme-viewer');
				const updateDelay = config.get<number>('updateDelay', 300);
				// Fechar painel do IDE primeiro
				panel.dispose();
				// Aguardar um pouco antes de abrir no browser (garante que o painel está totalmente fechado)
				setTimeout(async () => {
					await openPreviewInBrowser(document, context, updateDelay);
				}, 100);
			};

			// Guardar função no contexto do painel para acesso externo
			(panel as any).openInBrowser = openInBrowserAndClose;

			// ========================================================================
			// HANDLING DE MENSAGENS DO WEBVIEW
			// ========================================================================
			
			/**
			 * Lida com mensagens do webview (do JavaScript na preview).
			 * Suporta dois comandos:
			 * - 'toggleTheme': Alterna entre tema dark e light
			 * - 'openInBrowser': Abre preview no browser externo e fecha painel do IDE
			 */
			panel.webview.onDidReceiveMessage(async (msg) => {
				if (msg.command === 'toggleTheme') {
					await toggleTheme();
				} else if (msg.command === 'openInBrowser') {
					await openInBrowserAndClose();
				}
			});

			// ========================================================================
			// LIMPEZA AO FECHAR O PAINEL
			// ========================================================================
			
			/**
			 * Limpa recursos quando o painel é fechado.
			 * Remove listeners de eventos e limpa timeouts para prevenir memory leaks.
			 */
			panel.onDidDispose(() => {
				changeSubscription.dispose();
				saveSubscription.dispose();
				if (updateTimeout) {
					clearTimeout(updateTimeout);
				}
			});

			// Atualização inicial do webview (mostrar conteúdo da preview)
			updateWebview();
			
			// Focar no editor do documento após abrir a preview (se configurado)
			const focusEditorAfterOpen = config.get<boolean>('focusEditorAfterOpen', true);
			if (focusEditorAfterOpen) {
				setTimeout(async () => {
					try {
						const doc = vscode.workspace.textDocuments.find(d => d.uri.toString() === documentUri);
						if (doc) {
							await vscode.window.showTextDocument(doc, { preview: false, viewColumn: vscode.ViewColumn.One });
						}
					} catch (error) {
						// Ignorar erros ao focar
					}
				}, 100);
			}
		}

		// ========================================================================
		// REGISTO DE COMANDOS DO VS CODE
		// ========================================================================
		
		/**
		 * Comando: Abrir README Preview
		 * 
		 * Abre uma preview estilo GitHub para o ficheiro markdown atualmente ativo.
		 * Pode ser acionado via:
		 * - Command Palette: "GitHub README Viewer: Open README Preview"
		 * - Atalho de teclado: Alt+R (quando a editar markdown)
		 * - Botão no título do editor: ícone Preview (quando a editar markdown)
		 * 
		 * Respeita a configuração openInBrowser:
		 * - Se false: Abre preview no painel webview do IDE
		 * - Se true: Abre preview no browser externo
		 */
		const openCommand = vscode.commands.registerCommand('github-readme-viewer.openReadme', async () => {
		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			vscode.window.showErrorMessage('Nenhum ficheiro aberto.');
			return;
		}

		const document = editor.document;
			if (!isFileSupported(document)) {
				vscode.window.showWarningMessage('Este comando só funciona com ficheiros Markdown suportados.');
				return;
			}

			// Resetar estado de preview fechada quando o utilizador abre manualmente
			// Isto permite que auto-open funcione novamente se o utilizador tiver fechado a preview antes
			await setPreviewClosed(context, document, false);
			await openPreview(document);
		});

		/**
		 * Comando: Toggle Preview Theme
		 * 
		 * Alterna entre tema dark e light para a preview atualmente visível.
		 * Pode ser acionado via:
		 * - Command Palette: "GitHub README Viewer: Toggle Preview Theme"
		 * - Atalho de teclado: Ctrl+Shift+T (quando a preview está ativa)
		 * - Botão na preview: botão de toggle de tema no webview
		 * 
		 * A preferência de tema é guardada por ficheiro e persiste entre sessões do VS Code.
		 */
		const toggleThemeCommand = vscode.commands.registerCommand('github-readme-viewer.toggleTheme', async () => {
			// Encontrar o painel de preview atualmente visível/ativo
			const activePanel = Array.from(activePanels.values()).find(panel => panel.visible);
			if (activePanel && (activePanel as any).toggleTheme) {
				await (activePanel as any).toggleTheme();
			} else {
				vscode.window.showInformationMessage('Nenhuma preview ativa. Abra uma preview primeiro.');
			}
		});

		// ========================================================================
		// HANDLING DE FECHAMENTO DE DOCUMENTO
		// ========================================================================
		
		/**
		 * Listener para eventos de fechamento de documento - fecha painéis de preview associados.
		 * Quando um ficheiro markdown é fechado, a sua preview é automaticamente fechada também
		 * (se closeOnFileClose estiver ativado).
		 * O handler onDidDispose do painel vai detetar que o documento já não existe
		 * e resetar o estado de fechamento para permitir reabrir quando o ficheiro for aberto novamente.
		 */
		const closePreviewOnDocumentClose = vscode.workspace.onDidCloseTextDocument((document) => {
			if (isFileSupported(document)) {
				const config = vscode.workspace.getConfiguration('github-readme-viewer');
				const closeOnFileClose = config.get<boolean>('closeOnFileClose', true);
				
				if (closeOnFileClose) {
					const documentUri = document.uri.toString();
					const panel = activePanels.get(documentUri);
					if (panel) {
						// Fechar preview quando o documento é fechado
						// O onDidDispose do painel vai detetar que o documento não existe mais
						// e resetar o estado corretamente
						panel.dispose();
					}
				}
			}
		});
		context.subscriptions.push(closePreviewOnDocumentClose);

		// ========================================================================
		// FUNCIONALIDADE AUTO-OPEN
		// ========================================================================
		
		/**
		 * Auto-abrir preview quando ficheiros markdown são abertos.
		 * 
		 * Quando ativada (autoOpen = true):
		 * - Abre automaticamente preview quando um ficheiro markdown suportado é aberto
		 * - Verifica ficheiros já abertos quando o VS Code inicia e abre previews para eles
		 * - Respeita fechamento manual: se o utilizador fechar manualmente a preview,
		 *   não a reabre até que o ficheiro seja fechado e reaberto
		 * 
		 * Isto proporciona uma experiência fluida similar a extensões de live preview.
		 */
		const config = vscode.workspace.getConfiguration('github-readme-viewer');
		if (config.get<boolean>('autoOpen', false)) {
			/**
			 * Verifica ficheiros atualmente abertos e abre previews para ficheiros markdown suportados.
			 * É chamada na ativação da extensão para lidar com ficheiros que já estavam abertos
			 * quando o VS Code iniciou.
			 */
			const checkOpenFiles = async () => {
				try {
					const openDocuments = vscode.workspace.textDocuments;
					if (!openDocuments || openDocuments.length === 0) {
			return;
		}

					// Iterar através de todos os documentos abertos
					for (const doc of openDocuments) {
						try {
							// Verificar se o documento é suportado e a preview não foi fechada manualmente
							if (doc && isFileSupported(doc) && !isPreviewClosed(context, doc)) {
								const documentUri = doc.uri.toString();
								if (!activePanels.has(documentUri)) {
									// Pequeno delay entre abrir múltiplas previews (previne sobrecarga do sistema)
									await new Promise(resolve => setTimeout(resolve, 150));
									// Verificar novamente antes de abrir (pode ter mudado durante o delay)
									if (doc && !isPreviewClosed(context, doc) && !activePanels.has(documentUri)) {
										openPreview(doc).catch(() => {
											// Ignorar erros silenciosamente
										});
									}
								}
							}
						} catch (error) {
							// Continuar com o próximo ficheiro se ocorrer erro
							continue;
						}
					}
				} catch (error) {
					// Ignorar erros gerais
				}
			};

			// Verificar ficheiros abertos após um delay maior (garante que VS Code está totalmente pronto)
			setTimeout(() => {
				checkOpenFiles().catch(() => {
					// Ignorar erros
				});
			}, 1000);

			/**
			 * Listener para mudanças de editor - auto-abre preview quando um ficheiro markdown suportado se torna ativo.
			 * Só abre se:
			 * - A preview não foi fechada manualmente
			 * - Não existe já uma preview aberta para este documento
			 * - O documento é suportado (corresponde aos padrões de ficheiro)
			 */
			const autoOpenDisposable = vscode.window.onDidChangeActiveTextEditor(async (editor) => {
				if (editor && isFileSupported(editor.document)) {
					// Verificar se a preview não foi fechada manualmente
					if (!isPreviewClosed(context, editor.document)) {
						// Verificar se já não existe uma preview aberta
						const documentUri = editor.document.uri.toString();
						if (!activePanels.has(documentUri)) {
							// Pequeno delay para evitar abrir múltiplas vezes
							setTimeout(() => {
								// Verificar novamente se não foi fechada manualmente no intervalo
								if (!isPreviewClosed(context, editor.document) && !activePanels.has(documentUri)) {
									openPreview(editor.document).catch(() => {
										// Ignorar erros silenciosamente
									});
								}
							}, 200);
						}
					}
				}
			});
			context.subscriptions.push(autoOpenDisposable);
		}

		// ========================================================================
		// FUNCIONALIDADE DE PROTEÇÃO DE COLUNA DE PREVIEW
		// ========================================================================
		
		/**
		 * Protege a coluna de preview de outros ficheiros.
		 * 
		 * Quando ativada (protectPreviewColumn = true):
		 * - Preview abre na coluna 2 (coluna dedicada para previews)
		 * - Se qualquer outro ficheiro tentar abrir na coluna 2, é automaticamente movido para a coluna 1
		 * - Isto garante que a coluna de preview é reservada exclusivamente para previews
		 * - Proporciona um layout de workspace mais limpo com posicionamento previsível de previews
		 * 
		 * Usa uma flag de proteção e timeout para prevenir loops infinitos ao mover ficheiros.
		 */
		if (config.get<boolean>('protectPreviewColumn', false)) {
			let isProtecting = false; // Flag para prevenir loops infinitos
			let protectTimeout: ReturnType<typeof setTimeout> | undefined;
			
			/**
			 * Protege a coluna 2 movendo ficheiros não-preview para a coluna 1.
			 * Só ativa se:
			 * - O editor existe e não está já a ser protegido
			 * - O editor está na coluna 2
			 * - Existe uma preview na coluna 2
			 * - O ficheiro atual não é o documento da preview em si
			 */
			const protectColumn = async (editor: vscode.TextEditor) => {
				if (!editor || isProtecting || editor.viewColumn !== vscode.ViewColumn.Two) {
					return;
				}
				
				// Verificar se há uma preview na coluna 2
				const hasPreviewInColumnTwo = Array.from(previewViewColumns.values()).some(col => col === vscode.ViewColumn.Two);
				
				if (!hasPreviewInColumnTwo) {
					return; // Não há preview para proteger
				}
				
				// Verificar se o ficheiro atual não é um documento de preview
				const currentDocUri = editor.document.uri.toString();
				const isPreviewDocument = Array.from(activePanels.keys()).some(uri => uri === currentDocUri);
				
				if (!isPreviewDocument) {
					isProtecting = true;
					try {
						// Se for um ficheiro markdown suportado, fechar qualquer preview que possa estar aberta
						// (previne conflitos ao abrir ficheiros markdown na coluna protegida)
						if (isFileSupported(editor.document)) {
							const previewPanel = activePanels.get(currentDocUri);
							if (previewPanel) {
								previewPanel.dispose();
							}
						}
						
						// Mover ficheiro para a coluna 1 (coluna 2 protegida é apenas para previews)
						await vscode.window.showTextDocument(editor.document, {
							viewColumn: vscode.ViewColumn.One,
							preview: false
						});
					} catch (error) {
						// Ignorar erros silenciosamente
					} finally {
						// Resetar flag de proteção após um pequeno delay
						if (protectTimeout) {
							clearTimeout(protectTimeout);
						}
						protectTimeout = setTimeout(() => {
							isProtecting = false;
						}, 300);
					}
				}
			};
			
			/**
			 * Listener para mudanças de editor - protege a coluna 2 quando necessário.
			 * Usa um pequeno delay para evitar múltiplas chamadas rápidas.
			 */
			const protectColumnDisposable = vscode.window.onDidChangeActiveTextEditor(async (editor) => {
				if (editor) {
					// Pequeno delay para evitar múltiplas chamadas
					setTimeout(() => {
						protectColumn(editor).catch(() => {
							// Ignorar erros
						});
					}, 100);
				}
			});
			
			context.subscriptions.push(protectColumnDisposable);
		}

		// ========================================================================
		// REGISTAR COMANDOS PARA LIMPEZA
		// ========================================================================
		
		// Registar todos os comandos para que sejam limpos corretamente quando a extensão desativar
		context.subscriptions.push(openCommand, toggleThemeCommand);
	} catch (error) {
		console.error('Error activating GitHub README Viewer:', error);
		vscode.window.showErrorMessage(`GitHub README Viewer failed to activate: ${error}`);
	}
}

// ============================================================================
// FUNÇÕES DE GERAÇÃO DE HTML
// ============================================================================

/**
 * Gera HTML para preview no browser (modo browser externo).
 * 
 * Esta função cria um ficheiro HTML standalone que pode ser aberto em qualquer browser.
 * Características:
 * - Usa GitHub Markdown CSS do CDN (github-markdown-css)
 * - Suporta temas dark e light
 * - Auto-refresh via meta refresh tag (atualiza quando o ficheiro HTML é modificado)
 * - UI mínima (sem botões, apenas conteúdo)
 * 
 * O ficheiro HTML é criado na pasta .vscode do workspace e atualizado
 * sempre que o ficheiro markdown muda ou é guardado.
 * 
 * @param renderedHtml - O conteúdo HTML renderizado do markdown-it
 * @param rawContent - O conteúdo markdown bruto (não usado atualmente, reservado para funcionalidades futuras)
 * @param isDark - true para usar tema dark, false para tema light
 * @param documentUri - A URI do documento (para rastreamento)
 * @param updateDelay - Delay em milissegundos para atualizações (afeta intervalo de refresh)
 * @returns String HTML completa para a preview no browser
 */
function getBrowserHtml(renderedHtml: string, rawContent: string, isDark: boolean, documentUri: string, updateDelay: number, maxWidth: number | string = 980): string {
	// Selecionar ficheiro CSS baseado no tema (GitHub Markdown CSS do CDN)
	const cssFile = isDark ? 'github-markdown-dark.css' : 'github-markdown-light.css';
	// Usar CDN para CSS do GitHub (não podemos servir ficheiros locais no browser devido a restrições CORS)
	const cssUrl = `https://cdnjs.cloudflare.com/ajax/libs/github-markdown-css/5.8.1/${cssFile}`;
	
	// Calcular max-width CSS
	const maxWidthCss = typeof maxWidth === 'string' && maxWidth.toLowerCase() === 'auto' 
		? 'auto' 
		: typeof maxWidth === 'number' 
			? `${maxWidth}px` 
			: '980px';
	
	// Envolver HTML renderizado em tag article markdown-body com padding e max-width
	const content = `<article class="markdown-body" style="padding: 2rem; max-width: ${maxWidthCss}; margin: 0 auto;">${renderedHtml}</article>`;
	
	// Ajustes CSS específicos do tema para melhor consistência visual
	const themeAdjustments = isDark ? `
		.markdown-body {
			color-scheme: dark;
		}
		.markdown-body pre {
			background-color: #161b22;
		}
		.markdown-body code {
			background-color: rgba(110, 118, 129, 0.4);
		}
	` : `
		.markdown-body {
			color-scheme: light;
		}
	`;

	// Calcular intervalo de auto-refresh baseado no updateDelay
	// Mínimo 200ms para evitar refreshes excessivos
	const refreshInterval = Math.max(updateDelay || 300, 200);

	return /*html*/ `
<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<meta http-equiv="refresh" content="${Math.ceil(refreshInterval / 1000) + 1}">
	<link rel="stylesheet" href="${cssUrl}">
	<title>README Preview</title>
	<style>
		body {
			background-color: ${isDark ? '#0d1117' : '#ffffff'};
			color: ${isDark ? '#c9d1d9' : '#24292f'};
			padding: 0;
			margin: 0;
			font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
		}
		.status {
			position: fixed;
			bottom: 10px;
			right: 10px;
			padding: 4px 8px;
			background-color: rgba(0, 0, 0, 0.5);
			color: white;
			border-radius: 4px;
			font-size: 11px;
			opacity: 0.7;
		}
		${themeAdjustments}
	</style>
</head>
<body>
	<div id="content">${content}</div>
	<div class="status" id="status">Auto-updating</div>
</body>
</html>
	`;
}

/**
 * Gera HTML para preview no painel webview do IDE.
 * 
 * Esta função cria o conteúdo HTML para o painel webview do VS Code.
 * Características:
 * - Usa GitHub Markdown CSS dos node_modules da extensão
 * - Suporta temas dark e light com botão de toggle
 * - Auto-atualiza quando o ficheiro markdown muda
 * - Inclui botões interativos (toggle de tema, botão web se ativado)
 * - Integra com variáveis de tema do VS Code para aparência consistente
 * 
 * O webview pode comunicar com a extensão via API postMessage.
 * 
 * @param renderedHtml - O conteúdo HTML renderizado do markdown-it
 * @param cssUri - A URI para o ficheiro CSS GitHub Markdown (convertida para webview)
 * @param rawContent - O conteúdo markdown bruto (não usado atualmente)
 * @param isDark - true para usar tema dark, false para tema light
 * @param showWebButton - true para mostrar botão "Web" (abre preview no browser)
 * @returns String HTML completa para o painel webview
 */
function getWebviewHtml(renderedHtml: string, cssUri: vscode.Uri, rawContent: string, isDark: boolean, showWebButton: boolean = false, maxWidth: number | string = 980): string {
	// Calcular max-width CSS
	const maxWidthCss = typeof maxWidth === 'string' && maxWidth.toLowerCase() === 'auto' 
		? 'auto' 
		: typeof maxWidth === 'number' 
			? `${maxWidth}px` 
			: '980px';
	
	// Envolver HTML renderizado em tag article markdown-body com padding e max-width
	const content = `<article class="markdown-body" style="padding: 2rem; max-width: ${maxWidthCss}; margin: 0 auto;">${renderedHtml}</article>`;
	
	// Texto do botão baseado no tema atual (mostra opção de tema oposto)
	const buttonText = isDark ? '☀️ Light Mode' : '🌙 Dark Mode';
	
	// Ajustes CSS específicos do tema usando variáveis de tema do VS Code
	// Isto garante que a preview corresponde ao tema atual do VS Code
	const themeAdjustments = isDark ? `
			.markdown-body {
				color-scheme: dark;
			}
			.markdown-body pre {
				background-color: var(--vscode-textBlockQuote-background);
			}
			.markdown-body code {
				background-color: var(--vscode-textCodeBlock-background);
			}
		` : `
			.markdown-body {
				color-scheme: light;
			}
		`;

	return /*html*/ `
	<!DOCTYPE html>
	<html lang="en">
	<head>
		<meta charset="UTF-8">
		<meta name="viewport" content="width=device-width, initial-scale=1.0">
		<link rel="stylesheet" href="${cssUri}">
		<title>README Preview</title>
		<style>
			body {
				background-color: var(--vscode-editor-background);
				color: var(--vscode-editor-foreground);
				padding: 0;
				margin: 0;
			}
			button {
				position: fixed;
				top: 10px;
				right: 10px;
				padding: 6px 12px;
				background-color: var(--vscode-button-background);
				color: var(--vscode-button-foreground);
				border: none;
				border-radius: 6px;
				cursor: pointer;
				z-index: 1000;
				transition: background-color 0.2s ease;
				box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
			}
			button:hover {
				background-color: var(--vscode-button-hoverBackground);
				transform: translateY(-1px);
				box-shadow: 0 4px 6px rgba(0, 0, 0, 0.15);
			}
		button:active {
			transform: translateY(0);
		}
		.web-button {
			right: 140px;
			margin-right: 8px;
		}
		#toggle {
			margin-right: 0;
		}
		${themeAdjustments}
		</style>
	</head>
	<body>
		<button id="toggle" title="Toggle between Dark and Light mode (Ctrl+Shift+T / Alt+T)">${buttonText}</button>
		${showWebButton ? `<button id="web" class="web-button" title="Open preview in browser">🌐 Web</button>` : ''}
		<div id="content">${content}</div>
		<script>
			const vscode = acquireVsCodeApi();
			const toggleButton = document.getElementById('toggle');
			toggleButton.addEventListener('click', () => {
				vscode.postMessage({ command: 'toggleTheme' });
			});
			${showWebButton ? `
			const webButton = document.getElementById('web');
			if (webButton) {
				webButton.addEventListener('click', () => {
					vscode.postMessage({ command: 'openInBrowser' });
				});
			}
			` : ''}
		</script>
	</body>
	</html>
	`;
}

/**
 * Escapa caracteres especiais HTML para prevenir ataques XSS.
 * Converte caracteres potencialmente perigosos para os seus equivalentes de entidade HTML.
 * 
 * @param unsafe - A string a escapar
 * @returns A string escapada segura para output HTML
 */
function escapeHtml(unsafe: string): string {
	return unsafe
		.replace(/&/g, "&amp;")   // & → &amp;
		.replace(/</g, "&lt;")     // < → &lt;
		.replace(/>/g, "&gt;")     // > → &gt;
		.replace(/"/g, "&quot;")   // " → &quot;
		.replace(/'/g, "&#039;");  // ' → &#039;
}

/**
 * Função de desativação da extensão.
 * Chamada quando o VS Code desativa a extensão.
 * Todas as subscriptions registadas em context.subscriptions são automaticamente limpas.
 */
export function deactivate() {}
