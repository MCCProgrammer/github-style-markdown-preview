import * as vscode from 'vscode';
import MarkdownIt from 'markdown-it';

// Função para obter a chave de preferência baseada no ficheiro
function getPreferenceKey(document: vscode.TextDocument): string {
	return `github-readme-viewer.view-mode.${document.uri.toString()}`;
}

// Função para guardar a preferência de vista
async function saveViewPreference(context: vscode.ExtensionContext, document: vscode.TextDocument, mode: 'github' | 'raw'): Promise<void> {
	const key = getPreferenceKey(document);
	await context.workspaceState.update(key, mode);
}

// Função para carregar a preferência de vista
function loadViewPreference(context: vscode.ExtensionContext, document: vscode.TextDocument): 'github' | 'raw' {
	const key = getPreferenceKey(document);
	const saved = context.workspaceState.get<'github' | 'raw'>(key, 'github');
	return saved;
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

		// Carregar a preferência guardada
		let currentMode: 'github' | 'raw' = loadViewPreference(context, document);
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
			const githubCssUri = panel.webview.asWebviewUri(
				vscode.Uri.joinPath(context.extensionUri, 'node_modules', 'github-markdown-css', 'github-markdown-light.css')
			);

			panel.webview.html = getWebviewHtml(rendered, githubCssUri, currentMode, content);
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
			if (msg.command === 'toggleView') {
				currentMode = currentMode === 'github' ? 'raw' : 'github';
				await saveViewPreference(context, document, currentMode);
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

function getWebviewHtml(renderedHtml: string, cssUri: vscode.Uri, mode: 'github' | 'raw', rawContent: string): string {
	const content = mode === 'raw'
		? `<pre style="white-space: pre-wrap; font-family: monospace; padding: 2rem;">${escapeHtml(rawContent)}</pre>`
		: `<article class="markdown-body" style="padding: 2rem;">${renderedHtml}</article>`;
	
	const buttonText = mode === 'github' ? 'Show Raw' : 'Show GitHub';

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
			}
			button:hover {
				background-color: var(--vscode-button-hoverBackground);
			}
		</style>
	</head>
	<body>
		<button id="toggle">${buttonText}</button>
		<div id="content">${content}</div>
		<script>
			const vscode = acquireVsCodeApi();
			const toggleButton = document.getElementById('toggle');
			toggleButton.addEventListener('click', () => {
				vscode.postMessage({ command: 'toggleView' });
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
