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

	// Função para abrir a preview (reutilizável)
	async function openPreview(document: vscode.TextDocument) {
		const documentUri = document.uri.toString();

		// Verificar se já existe um painel aberto para este ficheiro
		const existingPanel = activePanels.get(documentUri);
		if (existingPanel) {
			existingPanel.reveal();
			// Focar no editor do documento
			const editor = await vscode.window.showTextDocument(document, { preview: false });
			return;
		}

		// Carregar configurações
		const config = vscode.workspace.getConfiguration('github-readme-viewer');
		const updateDelay = config.get<number>('updateDelay', 300);
		const protectPreviewColumn = config.get<boolean>('protectPreviewColumn', false);

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

			panel.webview.html = getWebviewHtml(rendered, githubCssUri, content, isDarkMode);
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

		panel.webview.onDidReceiveMessage(async (msg) => {
			if (msg.command === 'toggleTheme') {
				await toggleTheme();
			}
		});

		// Limpar subscriptions quando o painel for fechado
		panel.onDidDispose(() => {
			changeSubscription.dispose();
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

function getWebviewHtml(renderedHtml: string, cssUri: vscode.Uri, rawContent: string, isDark: boolean): string {
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
			${themeAdjustments}
		</style>
	</head>
	<body>
		<button id="toggle" title="Toggle between Dark and Light mode (Ctrl+Shift+T / Alt+T)">${buttonText}</button>
		<div id="content">${content}</div>
		<script>
			const vscode = acquireVsCodeApi();
			const toggleButton = document.getElementById('toggle');
			toggleButton.addEventListener('click', () => {
				vscode.postMessage({ command: 'toggleTheme' });
			});
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
