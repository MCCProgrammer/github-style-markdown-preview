import * as vscode from 'vscode';
import MarkdownIt from 'markdown-it';

// Função para obter a chave de preferência de tema baseada no ficheiro
function getThemePreferenceKey(document: vscode.TextDocument): string {
	return `github-readme-viewer.theme-mode.${document.uri.toString()}`;
}

// Função para guardar a preferência de tema
async function saveThemePreference(context: vscode.ExtensionContext, document: vscode.TextDocument, isDark: boolean): Promise<void> {
	const key = getThemePreferenceKey(document);
	await context.workspaceState.update(key, isDark);
}

// Função para carregar a preferência de tema (retorna null se não houver preferência guardada)
function loadThemePreference(context: vscode.ExtensionContext, document: vscode.TextDocument): boolean | null {
	const key = getThemePreferenceKey(document);
	const saved = context.workspaceState.get<boolean | undefined>(key, undefined);
	return saved === undefined ? null : saved;
}

// Função para obter a chave de preferência de preview fechada manualmente
function getPreviewClosedKey(document: vscode.TextDocument): string {
	return `github-readme-viewer.preview-closed.${document.uri.toString()}`;
}

// Função para guardar estado de preview fechada manualmente
async function setPreviewClosed(context: vscode.ExtensionContext, document: vscode.TextDocument, closed: boolean): Promise<void> {
	const key = getPreviewClosedKey(document);
	await context.workspaceState.update(key, closed);
}

// Função para verificar se a preview foi fechada manualmente
function isPreviewClosed(context: vscode.ExtensionContext, document: vscode.TextDocument): boolean {
	const key = getPreviewClosedKey(document);
	return context.workspaceState.get<boolean>(key, false);
}

// Função para verificar se um ficheiro é suportado
function isFileSupported(document: vscode.TextDocument): boolean {
	const config = vscode.workspace.getConfiguration('github-readme-viewer');
	const supportedPatterns = config.get<string[]>('supportedFiles', ['*.md']);
	const fileName = document.fileName;
	
	// Se o documento não for markdown, não é suportado
	if (document.languageId !== 'markdown') {
		return false;
	}
	
	// Verificar se corresponde a algum padrão
	return supportedPatterns.some(pattern => {
		// Converter padrão glob simples para regex
		const regexPattern = pattern
			.replace(/\*\*/g, '.*')
			.replace(/\*/g, '[^/]*')
			.replace(/\?/g, '.');
		const regex = new RegExp(`^${regexPattern}$`, 'i');
		return regex.test(fileName) || regex.test(document.uri.fsPath);
	});
}

export function activate(context: vscode.ExtensionContext) {
	try {
		console.log('GitHub README Viewer is active!');

		// Map para guardar os painéis ativos por documento
		const activePanels = new Map<string, vscode.WebviewPanel>();
		// Map para guardar a view column de cada preview
		const previewViewColumns = new Map<string, vscode.ViewColumn>();
		// Guardar referência ao documento original para focar depois
		const previewDocuments = new Map<string, vscode.TextDocument>();

	// Map para guardar dados de preview no browser (para browser mode)
	const browserPreviews = new Map<string, { 
		document: vscode.TextDocument; 
		isDarkMode: boolean; 
		lastContent: string;
		lastUpdate: number;
	}>();

	// Função para abrir preview no browser
	async function openPreviewInBrowser(document: vscode.TextDocument, context: vscode.ExtensionContext, updateDelay: number) {
		const documentUri = document.uri.toString();
		
		// Fechar preview do IDE se estiver aberta
		const existingPanel = activePanels.get(documentUri);
		if (existingPanel) {
			existingPanel.dispose();
		}
		
		// Verificar se já existe uma preview no browser para este ficheiro
		// Mas permitir reabrir se o utilizador quiser (pode ter fechado o browser)
		const existingPreview = browserPreviews.get(documentUri);
		if (existingPreview) {
			// Verificar se o ficheiro temporário ainda existe
			// Se não existir, limpar o tracking e permitir abrir novamente
			try {
				// Tentar ler o ficheiro para verificar se ainda existe
				// Se falhar, assume que foi fechado e limpa o tracking
			} catch (error) {
				// Ficheiro não existe, limpar tracking
				browserPreviews.delete(documentUri);
			}
			
			// Se ainda existe, perguntar ao utilizador se quer reabrir
			// Por agora, vamos sempre permitir reabrir (o browser pode ter sido fechado)
			browserPreviews.delete(documentUri); // Limpar tracking antigo
			// Continuar para abrir nova preview
		}

		// Carregar preferência de tema
		const savedThemePreference = loadThemePreference(context, document);
		const vsCodeTheme = vscode.window.activeColorTheme;
		const defaultIsDark = vsCodeTheme.kind === vscode.ColorThemeKind.Dark;
		let isDarkMode = savedThemePreference !== null ? savedThemePreference : defaultIsDark;

		const md = new MarkdownIt();
		const encoder = new TextEncoder();
		
		// Função para atualizar o ficheiro HTML
		const updateHtmlFile = async (tempFile: vscode.Uri, content: string, darkMode: boolean, lastModified: number) => {
			const rendered = md.render(content);
			const htmlContent = getBrowserHtml(rendered, content, darkMode, documentUri, updateDelay, lastModified);
			const data = encoder.encode(htmlContent);
			await vscode.workspace.fs.writeFile(tempFile, data);
		};

		const content = document.getText();
		
		// Tentar criar ficheiro no workspace ou usar data URI
		let tempFile: vscode.Uri | undefined;
		let useDataUri = false;
		
		// Primeiro, tentar criar no workspace (se disponível)
		const workspaceFolders = vscode.workspace.workspaceFolders;
		if (workspaceFolders && workspaceFolders.length > 0) {
			// Criar ficheiro no primeiro workspace
			const workspaceFolder = workspaceFolders[0];
			tempFile = vscode.Uri.joinPath(workspaceFolder.uri, '.vscode', `preview-${Date.now()}.html`);
			
			// Criar diretório .vscode se não existir
			const vscodeDir = vscode.Uri.joinPath(workspaceFolder.uri, '.vscode');
			try {
				await vscode.workspace.fs.createDirectory(vscodeDir);
			} catch (error) {
				// Diretório já existe ou erro - continuar
			}
		} else {
			// Sem workspace, usar data URI para ficheiros pequenos (< 2MB)
			if (content.length < 2 * 1024 * 1024) {
				useDataUri = true;
			} else {
				vscode.window.showErrorMessage('Sem workspace aberto. Por favor, abra um workspace para usar a preview no browser.');
				return;
			}
		}
		
		try {
			if (useDataUri) {
				// Usar data URI para abrir diretamente no browser
				const rendered = md.render(content);
				const lastModified = Date.now();
				const htmlContent = getBrowserHtml(rendered, content, isDarkMode, documentUri, updateDelay, lastModified);
				const dataUri = `data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`;
				await vscode.env.openExternal(vscode.Uri.parse(dataUri));
				
				// Guardar dados da preview (mas não podemos atualizar data URI facilmente)
				browserPreviews.set(documentUri, {
					document,
					isDarkMode,
					lastContent: content,
					lastUpdate: lastModified
				});
				
				vscode.window.showInformationMessage('Preview aberta no browser. Nota: Atualizações automáticas podem não funcionar com data URI. Considere abrir um workspace.');
				return;
			}
			
			// Criar HTML inicial
			const lastModified = Date.now();
			await updateHtmlFile(tempFile!, content, isDarkMode, lastModified);
			
			// Converter URI do VS Code para caminho local se possível
			// Tentar abrir diretamente - VS Code deve converter automaticamente
			await vscode.env.openExternal(tempFile!);
			
			// Guardar dados da preview
			browserPreviews.set(documentUri, {
				document,
				isDarkMode,
				lastContent: content,
				lastUpdate: lastModified
			});

			// Guardar referência ao ficheiro temporário
			const savedTempFile = tempFile!;

			// Debounce para atualizações (com proteção contra múltiplas escritas simultâneas)
			let updateTimeout: ReturnType<typeof setTimeout> | undefined;
			let isWritingFile = false;
			let lastWrittenContent = content;
			let lastWrittenTimestamp = Date.now();
			
			const scheduleUpdate = () => {
				if (updateTimeout) {
					clearTimeout(updateTimeout);
				}
				
				// Usar um delay mínimo para evitar escritas muito frequentes
				const minDelay = Math.max(updateDelay, 200); // Mínimo 200ms entre escritas
				
				updateTimeout = setTimeout(async () => {
					// Proteção contra escritas simultâneas
					if (isWritingFile) {
						// Se já está a escrever, reagendar
						scheduleUpdate();
						return;
					}
					
					const preview = browserPreviews.get(documentUri);
					if (preview) {
						const currentDoc = vscode.workspace.textDocuments.find(d => d.uri.toString() === documentUri);
						if (currentDoc) {
							const newContent = currentDoc.getText();
							
							// Só atualizar se o conteúdo realmente mudou
							if (newContent !== preview.lastContent && newContent !== lastWrittenContent) {
								// Verificar se passou tempo suficiente desde a última escrita
								const timeSinceLastWrite = Date.now() - lastWrittenTimestamp;
								if (timeSinceLastWrite < minDelay) {
									// Reagendar para mais tarde
									updateTimeout = setTimeout(() => scheduleUpdate(), minDelay - timeSinceLastWrite);
									return;
								}
								
								isWritingFile = true;
								try {
									preview.lastContent = newContent;
									const newLastModified = Date.now();
									preview.lastUpdate = newLastModified;
									lastWrittenContent = newContent;
									lastWrittenTimestamp = newLastModified;
									
									await updateHtmlFile(savedTempFile, newContent, preview.isDarkMode, newLastModified);
								} catch (error) {
									console.error('Error updating HTML file:', error);
								} finally {
									isWritingFile = false;
								}
							}
						}
					}
				}, minDelay);
			};

			// Listener para atualizar quando o documento muda
			const changeSubscription = vscode.workspace.onDidChangeTextDocument((e) => {
				if (e.document.uri.toString() === documentUri) {
					scheduleUpdate();
				}
			});

			// Listener para atualizar quando o documento é guardado (força atualização imediata)
			const saveSubscription = vscode.workspace.onDidSaveTextDocument(async (doc) => {
				if (doc.uri.toString() === documentUri) {
					const preview = browserPreviews.get(documentUri);
					if (preview) {
						const newContent = doc.getText();
						if (newContent !== preview.lastContent) {
							preview.lastContent = newContent;
							const newLastModified = Date.now();
							preview.lastUpdate = newLastModified;
							try {
								// Atualizar o ficheiro HTML
								await updateHtmlFile(savedTempFile, newContent, preview.isDarkMode, newLastModified);
								
								// Para ficheiros file://, não podemos notificar o browser diretamente
								// O script no HTML irá detectar a mudança através do timestamp
								// e recarregar a página automaticamente
							} catch (error) {
								console.error('Error updating HTML file on save:', error);
							}
						}
					}
				}
			});

			// Limpar quando o documento é fechado
			const closeSubscription = vscode.workspace.onDidCloseTextDocument((doc) => {
				if (doc.uri.toString() === documentUri) {
					browserPreviews.delete(documentUri);
					changeSubscription.dispose();
					saveSubscription.dispose();
					closeSubscription.dispose();
					if (updateTimeout) {
						clearTimeout(updateTimeout);
					}
					// Tentar apagar o ficheiro temporário (se foi criado)
					if (savedTempFile && !useDataUri) {
						vscode.workspace.fs.delete(savedTempFile).then(() => {
							// Ficheiro apagado
						}, () => {
							// Ignorar erros ao apagar
						});
					}
				}
			});

			context.subscriptions.push(changeSubscription, saveSubscription, closeSubscription);
		} catch (error) {
			vscode.window.showErrorMessage(`Erro ao abrir preview no browser: ${error}`);
		}
	}

	// Função para abrir a preview (reutilizável)
	async function openPreview(document: vscode.TextDocument) {
		const documentUri = document.uri.toString();

		// Carregar configurações
		const config = vscode.workspace.getConfiguration('github-readme-viewer');
		const updateDelay = config.get<number>('updateDelay', 300);
		const protectPreviewColumn = config.get<boolean>('protectPreviewColumn', false);

		// Verificar se já existe um painel aberto para este ficheiro
		const existingPanel = activePanels.get(documentUri);
		if (existingPanel) {
			existingPanel.reveal();
			// Focar no editor do documento
			const editor = await vscode.window.showTextDocument(document, { preview: false });
			return;
		}

		// Carregar a preferência de tema guardada, ou usar o tema do VS Code como padrão
		const savedThemePreference = loadThemePreference(context, document);
		const vsCodeTheme = vscode.window.activeColorTheme;
		const defaultIsDark = vsCodeTheme.kind === vscode.ColorThemeKind.Dark;
		let isDarkMode: boolean = savedThemePreference !== null ? savedThemePreference : defaultIsDark;
		
		const md = new MarkdownIt();

		// Obter nome do ficheiro para o título
		const fileName = document.fileName.split(/[/\\]/).pop() || 'README.md';
		
		// Obter view column configurada ou usar Beside
		const previewViewColumn = protectPreviewColumn ? vscode.ViewColumn.Two : vscode.ViewColumn.Beside;
		
		const panel = vscode.window.createWebviewPanel(
			'githubReadmePreview',
			`${fileName} Preview`,
			previewViewColumn,
			{
				enableScripts: true,
				retainContextWhenHidden: true,
			}
		);

		// Guardar o painel no map
		activePanels.set(documentUri, panel);
		previewViewColumns.set(documentUri, previewViewColumn);
		previewDocuments.set(documentUri, document);

		// Remover do map quando o painel for fechado
		panel.onDidDispose(() => {
			activePanels.delete(documentUri);
			previewViewColumns.delete(documentUri);
			previewDocuments.delete(documentUri);
			
			// Verificar se foi fechamento manual ou por causa do ficheiro
			// Se o documento ainda existe, foi fechamento manual
			const documentStillExists = vscode.workspace.textDocuments.some(doc => doc.uri.toString() === documentUri);
			if (documentStillExists) {
				// Foi fechamento manual da preview (o documento ainda está aberto)
				setPreviewClosed(context, document, true).catch(() => {
					// Ignorar erros
				});
			} else {
				// Foi fechamento por causa do ficheiro (o documento foi fechado)
				// Resetar estado para permitir reabrir quando o ficheiro for aberto novamente
				setPreviewClosed(context, document, false).catch(() => {
					// Ignorar erros
				});
			}
		});

		const updateWebview = () => {
			// Obter o documento atualizado (pode ter mudado)
			const currentDocument = vscode.workspace.textDocuments.find(doc => doc.uri.toString() === documentUri);
			if (!currentDocument) {
				return; // Documento já foi fechado
			}

			const content = currentDocument.getText();
			const rendered = md.render(content);
			
			// Usar o tema escolhido pelo utilizador
			const cssFile = isDarkMode ? 'github-markdown-dark.css' : 'github-markdown-light.css';
			
			const githubCssUri = panel.webview.asWebviewUri(
				vscode.Uri.joinPath(context.extensionUri, 'node_modules', 'github-markdown-css', cssFile)
			);

			// Verificar se openInBrowser está ativo para mostrar o botão Web
			const config = vscode.workspace.getConfiguration('github-readme-viewer');
			const openInBrowser = config.get<boolean>('openInBrowser', false);
			panel.webview.html = getWebviewHtml(rendered, githubCssUri, content, isDarkMode, openInBrowser);
		};

		// Função para alternar tema (exportada para comando externo)
		const toggleTheme = async () => {
			isDarkMode = !isDarkMode;
			await saveThemePreference(context, document, isDarkMode);
			updateWebview();
		};

		// Guardar função de toggle no contexto do painel para acesso externo
		(panel as any).toggleTheme = toggleTheme;

		// Debounce para atualizar a preview (usa delay configurável)
		let updateTimeout: ReturnType<typeof setTimeout> | undefined;
		const scheduleUpdate = () => {
			if (updateTimeout) {
				clearTimeout(updateTimeout);
			}
			if (updateDelay > 0) {
				updateTimeout = setTimeout(() => {
					updateWebview();
				}, updateDelay);
			} else {
				updateWebview();
			}
		};

		// Listener para mudanças no documento - atualiza a preview automaticamente
		const changeSubscription = vscode.workspace.onDidChangeTextDocument((e) => {
			if (e.document.uri.toString() === documentUri) {
				scheduleUpdate();
			}
		});

		// Atualizar imediatamente quando o ficheiro é guardado
		const saveSubscription = vscode.workspace.onDidSaveTextDocument((doc) => {
			if (doc.uri.toString() === documentUri) {
				// Atualizar imediatamente quando guarda (sem debounce)
				updateWebview();
			}
		});

		// Função para abrir no browser e fechar o painel
		const openInBrowserAndClose = async () => {
			const config = vscode.workspace.getConfiguration('github-readme-viewer');
			const updateDelay = config.get<number>('updateDelay', 300);
			// Fechar o painel primeiro
			panel.dispose();
			// Aguardar um pouco antes de abrir no browser
			setTimeout(async () => {
				await openPreviewInBrowser(document, context, updateDelay);
			}, 100);
		};

		// Guardar função no contexto do painel
		(panel as any).openInBrowser = openInBrowserAndClose;

		panel.webview.onDidReceiveMessage(async (msg) => {
			console.log('Received message in webview:', msg);
			if (msg.command === 'toggleTheme') {
				console.log('Toggling theme...');
				await toggleTheme();
			} else if (msg.command === 'openInBrowser') {
				console.log('Opening in browser...');
				await openInBrowserAndClose();
			}
		});

		// Limpar subscriptions quando o painel for fechado
		panel.onDidDispose(() => {
			changeSubscription.dispose();
			saveSubscription.dispose();
			if (updateTimeout) {
				clearTimeout(updateTimeout);
			}
		});

		updateWebview();
		
		// Focar no editor do documento após abrir a preview
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

	// Registar o comando para abrir preview
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
		await setPreviewClosed(context, document, false);
		await openPreview(document);
	});

	// Registar o comando para toggle theme
	const toggleThemeCommand = vscode.commands.registerCommand('github-readme-viewer.toggleTheme', async () => {
		// Encontrar o painel ativo
		const activePanel = Array.from(activePanels.values()).find(panel => panel.visible);
		if (activePanel && (activePanel as any).toggleTheme) {
			await (activePanel as any).toggleTheme();
		} else {
			vscode.window.showInformationMessage('Nenhuma preview ativa. Abra uma preview primeiro.');
		}
	});

	// Fechar preview quando o ficheiro é fechado
	const closePreviewOnDocumentClose = vscode.workspace.onDidCloseTextDocument((document) => {
		if (isFileSupported(document)) {
			const documentUri = document.uri.toString();
			const panel = activePanels.get(documentUri);
			if (panel) {
				// Fechar a preview quando o ficheiro é fechado
				// O onDidDispose do painel vai detectar que o documento não existe mais
				// e resetar o estado corretamente
				panel.dispose();
			}
		}
	});
	context.subscriptions.push(closePreviewOnDocumentClose);

	// Auto-abrir preview se configurado (depois do listener de fechar ficheiro)
	const config = vscode.workspace.getConfiguration('github-readme-viewer');
	if (config.get<boolean>('autoOpen', false)) {
		// Verificar ficheiros já abertos quando a extensão inicia
		const checkOpenFiles = async () => {
			try {
				const openDocuments = vscode.workspace.textDocuments;
				if (!openDocuments || openDocuments.length === 0) {
					return;
				}
				
				for (const doc of openDocuments) {
					try {
						if (doc && isFileSupported(doc) && !isPreviewClosed(context, doc)) {
							const documentUri = doc.uri.toString();
							if (!activePanels.has(documentUri)) {
								// Pequeno delay para cada ficheiro
								await new Promise(resolve => setTimeout(resolve, 150));
								// Verificar novamente antes de abrir
								if (doc && !isPreviewClosed(context, doc) && !activePanels.has(documentUri)) {
									openPreview(doc).catch(() => {
										// Ignorar erros silenciosamente
									});
								}
							}
						}
					} catch (error) {
						// Continuar com o próximo ficheiro se houver erro
						continue;
					}
				}
			} catch (error) {
				// Ignorar erros gerais
			}
		};

		// Verificar ficheiros abertos após um delay maior (para garantir que VS Code está totalmente pronto)
		setTimeout(() => {
			checkOpenFiles().catch(() => {
				// Ignorar erros
			});
		}, 1000);

		// Listener para novos ficheiros abertos
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

	// Proteger view column da preview de outros ficheiros (se configurado)
	if (config.get<boolean>('protectPreviewColumn', false)) {
		let isProtecting = false; // Flag para evitar loops
		let protectTimeout: ReturnType<typeof setTimeout> | undefined;
		
		const protectColumn = async (editor: vscode.TextEditor) => {
			if (!editor || isProtecting || editor.viewColumn !== vscode.ViewColumn.Two) {
				return;
			}
			
			// Verificar se há uma preview na column Two
			const hasPreviewInColumnTwo = Array.from(previewViewColumns.values()).some(col => col === vscode.ViewColumn.Two);
			
			if (!hasPreviewInColumnTwo) {
				return;
			}
			
			// Se o ficheiro atual não é o documento da preview
			const currentDocUri = editor.document.uri.toString();
			const isPreviewDocument = Array.from(activePanels.keys()).some(uri => uri === currentDocUri);
			
			if (!isPreviewDocument) {
				isProtecting = true;
				try {
					// Se for um ficheiro markdown suportado, fechar qualquer preview que possa estar aberta
					if (isFileSupported(editor.document)) {
						const previewPanel = activePanels.get(currentDocUri);
						if (previewPanel) {
							previewPanel.dispose();
						}
					}
					
					// Mover o ficheiro para a primeira column
					await vscode.window.showTextDocument(editor.document, {
						viewColumn: vscode.ViewColumn.One,
						preview: false
					});
				} catch (error) {
					// Ignorar erros silenciosamente
				} finally {
					// Resetar flag após um pequeno delay
					if (protectTimeout) {
						clearTimeout(protectTimeout);
					}
					protectTimeout = setTimeout(() => {
						isProtecting = false;
					}, 300);
				}
			}
		};
		
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

		context.subscriptions.push(openCommand, toggleThemeCommand);
	} catch (error) {
		console.error('Error activating GitHub README Viewer:', error);
		vscode.window.showErrorMessage(`GitHub README Viewer failed to activate: ${error}`);
	}
}

// Função para gerar HTML para o browser (com hot reload estilo Vite)
function getBrowserHtml(renderedHtml: string, rawContent: string, isDark: boolean, documentUri: string, updateDelay: number, lastModified: number): string {
	const cssFile = isDark ? 'github-markdown-dark.css' : 'github-markdown-light.css';
	// Usar CDN para o CSS do GitHub (já que não podemos servir ficheiros locais no browser)
	const cssUrl = `https://cdnjs.cloudflare.com/ajax/libs/github-markdown-css/5.8.1/${cssFile}`;
	
	const content = `<article class="markdown-body" style="padding: 2rem;">${renderedHtml}</article>`;
	
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

	// Polling interval baseado no updateDelay (mínimo 500ms para não sobrecarregar)
	const pollInterval = Math.max(updateDelay || 300, 500);

	return /*html*/ `
<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
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
			display: none;
		}
		.status.updating {
			display: block;
			background-color: rgba(40, 167, 69, 0.8);
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

function getWebviewHtml(renderedHtml: string, cssUri: vscode.Uri, rawContent: string, isDark: boolean, showWebButton: boolean = false): string {
	const content = `<article class="markdown-body" style="padding: 2rem;">${renderedHtml}</article>`;
	
	// Texto do botão baseado no tema atual
	const buttonText = isDark ? '☀️ Light Mode' : '🌙 Dark Mode';
	
	// Ajustar cores do markdown-body para corresponder melhor ao tema
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
				position: fixed !important;
				top: 10px !important;
				right: 10px !important;
				padding: 6px 12px;
				background-color: var(--vscode-button-background);
				color: var(--vscode-button-foreground);
				border: none;
				border-radius: 6px;
				cursor: pointer;
				z-index: 9999 !important;
				transition: background-color 0.2s ease;
				box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
				pointer-events: auto !important;
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
		}
		#toggle {
			right: 10px;
		}
		${themeAdjustments}
		</style>
	</head>
	<body>
		<button id="toggle" title="Toggle between Dark and Light mode (Ctrl+Shift+T / Alt+T)">${buttonText}</button>
		${showWebButton ? `<button id="web" class="web-button" title="Open preview in browser">🌐 Web</button>` : ''}
		<div id="content">${content}</div>
		<script>
			(function() {
				try {
					const vscode = acquireVsCodeApi();
					
					// Função para configurar os botões
					function setupButtons() {
						// Adicionar listener ao botão de toggle theme
						const toggleButton = document.getElementById('toggle');
						if (toggleButton) {
							// Remover listeners anteriores clonando o botão
							const newToggle = toggleButton.cloneNode(true);
							toggleButton.parentNode?.replaceChild(newToggle, toggleButton);
							
							const btn = document.getElementById('toggle');
							if (btn) {
								// Usar onclick e addEventListener para máxima compatibilidade
								btn.onclick = function(e) {
									e.preventDefault();
									e.stopPropagation();
									e.stopImmediatePropagation();
									console.log('Toggle theme button clicked - sending message');
									try {
										vscode.postMessage({ command: 'toggleTheme' });
										console.log('Message sent successfully');
									} catch (err) {
										console.error('Error posting message:', err);
									}
									return false;
								};
								// Também adicionar como event listener
								btn.addEventListener('click', function(e) {
									e.preventDefault();
									e.stopPropagation();
									e.stopImmediatePropagation();
									console.log('Toggle theme button clicked (addEventListener)');
									vscode.postMessage({ command: 'toggleTheme' });
									return false;
								}, true);
							}
						}
						
						${showWebButton ? `
						// Adicionar listener ao botão Web
						const webButton = document.getElementById('web');
						if (webButton) {
							// Remover listeners anteriores clonando o botão
							const newWebBtn = webButton.cloneNode(true);
							webButton.parentNode?.replaceChild(newWebBtn, webButton);
							
							const wbtn = document.getElementById('web');
							if (wbtn) {
								wbtn.onclick = function(e) {
									e.preventDefault();
									e.stopPropagation();
									e.stopImmediatePropagation();
									console.log('Web button clicked - sending message');
									vscode.postMessage({ command: 'openInBrowser' });
									return false;
								};
								// Também adicionar como event listener
								wbtn.addEventListener('click', function(e) {
									e.preventDefault();
									e.stopPropagation();
									e.stopImmediatePropagation();
									console.log('Web button clicked (addEventListener)');
									vscode.postMessage({ command: 'openInBrowser' });
									return false;
								}, true);
							}
						}
						` : ''}
					}
					
					// Configurar quando o DOM estiver pronto
					if (document.readyState === 'loading') {
						document.addEventListener('DOMContentLoaded', setupButtons);
					} else {
						setupButtons();
					}
					
					// Configurar novamente após um pequeno delay para garantir
					setTimeout(setupButtons, 50);
				} catch (error) {
					console.error('Error initializing webview script:', error);
				}
			})();
		</script>
	</body>
	</html>
	`;
}

function escapeHtml(unsafe: string): string {
	return unsafe
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#039;");
}

export function deactivate() {}
