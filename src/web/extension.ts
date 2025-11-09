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

export function activate(context: vscode.ExtensionContext) {
	console.log('GitHub README Viewer is active!');

	// Map para guardar os painéis ativos por documento
	const activePanels = new Map<string, vscode.WebviewPanel>();

	// Registar o comando (definido também no package.json)
	const disposable = vscode.commands.registerCommand('github-readme-viewer.openReadme', async () => {
		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			vscode.window.showErrorMessage('Nenhum ficheiro aberto.');
			return;
		}

		const document = editor.document;
		if (!document.fileName.toLowerCase().includes('readme.md')) {
			vscode.window.showErrorMessage('Este comando só funciona com ficheiros README.md');
			return;
		}

		const documentUri = document.uri.toString();

		// Verificar se já existe um painel aberto para este ficheiro
		const existingPanel = activePanels.get(documentUri);
		if (existingPanel) {
			existingPanel.reveal();
			return;
		}

		// Carregar a preferência de tema guardada, ou usar o tema do VS Code como padrão
		const savedThemePreference = loadThemePreference(context, document);
		const vsCodeTheme = vscode.window.activeColorTheme;
		const defaultIsDark = vsCodeTheme.kind === vscode.ColorThemeKind.Dark;
		let isDarkMode: boolean = savedThemePreference !== null ? savedThemePreference : defaultIsDark;
		
		const md = new MarkdownIt();

		const panel = vscode.window.createWebviewPanel(
			'githubReadmePreview',
			'README Preview',
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

		// Debounce para atualizar a preview (evita muitos re-renders durante a digitação)
		let updateTimeout: ReturnType<typeof setTimeout> | undefined;
		const scheduleUpdate = () => {
			if (updateTimeout) {
				clearTimeout(updateTimeout);
			}
			updateTimeout = setTimeout(() => {
				updateWebview();
			}, 300); // Aguarda 300ms após a última mudança
		};

		// Listener para mudanças no documento - atualiza a preview automaticamente
		const changeSubscription = vscode.workspace.onDidChangeTextDocument((e) => {
			if (e.document.uri.toString() === documentUri) {
				scheduleUpdate();
			}
		});

		panel.webview.onDidReceiveMessage(async (msg) => {
			if (msg.command === 'toggleTheme') {
				// Alternar entre dark e light mode
				isDarkMode = !isDarkMode;
				await saveThemePreference(context, document, isDarkMode);
				updateWebview();
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
	});

	context.subscriptions.push(disposable);
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
			}
			button:hover {
				background-color: var(--vscode-button-hoverBackground);
			}
			${themeAdjustments}
		</style>
	</head>
	<body>
		<button id="toggle">${buttonText}</button>
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
