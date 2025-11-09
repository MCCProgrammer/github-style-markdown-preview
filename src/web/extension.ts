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
	console.log('GitHub README Viewer is active!');

	// Map para guardar os painéis ativos por documento
	const activePanels = new Map<string, vscode.WebviewPanel>();

	// Função para abrir a preview (reutilizável)
	async function openPreview(document: vscode.TextDocument) {
		const documentUri = document.uri.toString();

		// Verificar se já existe um painel aberto para este ficheiro
		const existingPanel = activePanels.get(documentUri);
		if (existingPanel) {
			existingPanel.reveal();
			return;
		}

		// Carregar configurações
		const config = vscode.workspace.getConfiguration('github-readme-viewer');
		const updateDelay = config.get<number>('updateDelay', 300);

		// Carregar a preferência de tema guardada, ou usar o tema do VS Code como padrão
		const savedThemePreference = loadThemePreference(context, document);
		const vsCodeTheme = vscode.window.activeColorTheme;
		const defaultIsDark = vsCodeTheme.kind === vscode.ColorThemeKind.Dark;
		let isDarkMode: boolean = savedThemePreference !== null ? savedThemePreference : defaultIsDark;
		
		const md = new MarkdownIt();

		// Obter nome do ficheiro para o título
		const fileName = document.fileName.split(/[/\\]/).pop() || 'README.md';
		const panel = vscode.window.createWebviewPanel(
			'githubReadmePreview',
			`${fileName} Preview`,
			vscode.ViewColumn.Beside,
			{
				enableScripts: true,
				retainContextWhenHidden: true,
			}
		);

		// Guardar o painel no map
		activePanels.set(documentUri, panel);

		// Remover do map quando o painel for fechado
		panel.onDidDispose(() => {
			activePanels.delete(documentUri);
			// Marcar que a preview foi fechada manualmente
			setPreviewClosed(context, document, true).catch(() => {
				// Ignorar erros
			});
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

	// Auto-abrir preview se configurado
	const config = vscode.workspace.getConfiguration('github-readme-viewer');
	if (config.get<boolean>('autoOpen', false)) {
		const autoOpenDisposable = vscode.window.onDidChangeActiveTextEditor(async (editor) => {
			if (editor && isFileSupported(editor.document)) {
				// Verificar se a preview não foi fechada manualmente
				if (!isPreviewClosed(context, editor.document)) {
					// Pequeno delay para evitar abrir múltiplas vezes
					setTimeout(() => {
						openPreview(editor.document).catch(() => {
							// Ignorar erros silenciosamente
						});
					}, 100);
				}
			}
		});
		context.subscriptions.push(autoOpenDisposable);
	}

	// Fechar preview quando o ficheiro é fechado
	const closePreviewOnDocumentClose = vscode.workspace.onDidCloseTextDocument((document) => {
		if (isFileSupported(document)) {
			const documentUri = document.uri.toString();
			const panel = activePanels.get(documentUri);
			if (panel) {
				panel.dispose();
			}
		}
	});
	context.subscriptions.push(closePreviewOnDocumentClose);

	// Resetar estado de preview fechada quando o ficheiro é aberto (para permitir reabrir)
	const resetPreviewClosedOnOpen = vscode.workspace.onDidOpenTextDocument((document) => {
		if (isFileSupported(document)) {
			// Resetar o estado quando o ficheiro é aberto novamente
			setPreviewClosed(context, document, false).catch(() => {
				// Ignorar erros
			});
		}
	});
	context.subscriptions.push(resetPreviewClosedOnOpen);

	context.subscriptions.push(openCommand, toggleThemeCommand);
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
		<button id="toggle" title="Toggle between Dark and Light mode (Ctrl+Shift+T)">${buttonText}</button>
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
