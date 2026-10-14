import * as vscode from 'vscode';
import MarkdownIt from 'markdown-it';
// @ts-ignore - markdown-it-emoji has no official TypeScript types
import { full as emoji } from 'markdown-it-emoji';

// ============================================================================
// UTILITY FUNCTIONS - Helpers for state and preference management
// ============================================================================

/**
 * Builds a unique key to store the theme preference of a specific document.
 * Each file keeps its own theme preference (dark/light).
 * 
 * @param document - The document to build the key for
 * @returns unique key in the format "github-style-markdown-preview.theme-mode.{uri}"
 */
function getThemePreferenceKey(document: vscode.TextDocument): string {
	return `github-style-markdown-preview.theme-mode.${document.uri.toString()}`;
}

/**
 * Saves the theme preference (dark/light) for a specific document.
 * The preference is persisted in workspaceState and survives VS Code restarts.
 * 
 * @param context - Extension context, used to access workspaceState
 * @param document - The document to save the preference for
 * @param isDark - true for the dark theme, false for the light theme
 */
async function saveThemePreference(context: vscode.ExtensionContext, document: vscode.TextDocument, isDark: boolean): Promise<void> {
	const key = getThemePreferenceKey(document);
	await context.workspaceState.update(key, isDark);
}

/**
 * Loads the saved theme preference for a document.
 * Returns null when there is no saved preference (the VS Code theme is used instead).
 * 
 * @param context - Extension context, used to access workspaceState
 * @param document - The document to load the preference for
 * @returns true for dark, false for light, or null when there is no saved preference
 */
function loadThemePreference(context: vscode.ExtensionContext, document: vscode.TextDocument): boolean | null {
	const key = getThemePreferenceKey(document);
	const saved = context.workspaceState.get<boolean | undefined>(key, undefined);
	return saved === undefined ? null : saved;
}

/**
 * Builds a unique key to track whether the user closed a preview manually.
 * This stops auto-open from reopening previews the user explicitly closed.
 * 
 * @param document - The document to build the key for
 * @returns unique key in the format "github-style-markdown-preview.preview-closed.{uri}"
 */
function getPreviewClosedKey(document: vscode.TextDocument): string {
	return `github-style-markdown-preview.preview-closed.${document.uri.toString()}`;
}

/**
 * Saves whether a preview was closed manually.
 * When the user closes a preview by hand, this state is saved so that
 * auto-open doesn't reopen it until the file is closed and opened again.
 * 
 * @param context - Extension context, used to access workspaceState
 * @param document - The document to save the state for
 * @param closed - true if it was closed manually, false to allow auto-open
 */
async function setPreviewClosed(context: vscode.ExtensionContext, document: vscode.TextDocument, closed: boolean): Promise<void> {
	const key = getPreviewClosedKey(document);
	await context.workspaceState.update(key, closed);
}

/**
 * Checks whether the preview of a document was closed manually.
 * Used by auto-open to respect the user's actions.
 * 
 * @param context - Extension context, used to access workspaceState
 * @param document - The document to check
 * @returns true if it was closed manually, false otherwise
 */
function isPreviewClosed(context: vscode.ExtensionContext, document: vscode.TextDocument): boolean {
	const key = getPreviewClosedKey(document);
	return context.workspaceState.get<boolean>(key, false);
}

/**
 * Checks whether a document is supported by the extension.
 * A document is supported if:
 * 1. Its languageId is 'markdown'
 * 2. Its file name matches one of the configured patterns (e.g. *.md, README*)
 * 
 * Patterns are converted from glob to regex:
 * - ** → .* (any characters, including path separators)
 * - *  → [^/]* (any characters except path separators)
 * - ?  → . (a single character)
 * 
 * @param document - The document to check
 * @returns true if the document is supported, false otherwise
 */
function isFileSupported(document: vscode.TextDocument): boolean {
	const config = vscode.workspace.getConfiguration('github-style-markdown-preview');
	const supportedPatterns = config.get<string[]>('supportedFiles', ['*.md']);
	
	// Keep only the file name (without the path)
	// Split on both Windows (\\) and Unix (/) path separators
	const fileName = document.fileName.split(/[/\\]/).pop() || '';
	const fsPath = document.uri.fsPath.split(/[/\\]/).pop() || '';
	const testFileName = fileName || fsPath;
	
	// Check whether the file matches the configured patterns
	const matchesPattern = supportedPatterns.some(pattern => {
		// Special case: the "*.md" pattern only accepts files that end exactly in .md
		// So readme.md is accepted, but readme.ola, readme.me, etc. are not
		if (pattern === '*.md') {
			// Check that the file ends exactly in .md (case-insensitive)
			// The regex makes sure it is .md and not .md.something
			return /\.md$/i.test(testFileName);
		}
		
		// Other patterns (e.g. "README*", "*.markdown"): convert the glob to a regex
		// Replace wildcards with temporary placeholders so they aren't escaped
		const placeholders = {
			doubleStar: '__PLACEHOLDER_DOUBLESTAR__',
			singleStar: '__PLACEHOLDER_STAR__',
			question: '__PLACEHOLDER_QUESTION__'
		};
		
		let regexPattern = pattern;
		
		// Handle ** first (matches anything, including path separators)
		regexPattern = regexPattern.replace(/\*\*/g, placeholders.doubleStar);
		
		// Handle * (matches anything except path separators)
		regexPattern = regexPattern.replace(/\*/g, placeholders.singleStar);
		
		// Handle ? (matches a single character)
		regexPattern = regexPattern.replace(/\?/g, placeholders.question);
		
		// Escape regex special characters (except the placeholders)
		// Characters to escape: . + ^ $ { } ( ) | [ ] \
		regexPattern = regexPattern.replace(/[.+^${}()|[\]\\]/g, '\\$&');
		
		// Turn the placeholders back into regex wildcards
		// Only the file name (no path) is tested, so * and ** both become .*
		regexPattern = regexPattern
			.replace(new RegExp(placeholders.doubleStar.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), '.*')
			.replace(new RegExp(placeholders.singleStar.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), '.*')
			.replace(new RegExp(placeholders.question.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), '.');
		
		// Case-insensitive regex
		const regex = new RegExp(`^${regexPattern}$`, 'i');
		
		// Test the file name (without the path)
		return regex.test(testFileName);
	});
	
	// If the file matches a pattern, check that it is Markdown
	// IMPORTANT: with the "*.md" pattern, only .md files are accepted
	if (matchesPattern) {
		// For patterns ending in .md (like "*.md"), check that the file really ends in .md
		// So readme.md is accepted, but readme.ola is not
		const hasMdExtension = /\.md$/i.test(testFileName);
		const patternEndsWithMd = supportedPatterns.some(p => p.endsWith('.md'));
		
		// If a pattern requires .md, the file MUST end in .md
		if (patternEndsWithMd && !hasMdExtension) {
			return false;
		}
		
		// Accept it if the languageId is 'markdown' or the file has the .md extension
		// This supports .md files even when VS Code doesn't
		// recognise them as Markdown automatically
		const isMarkdownLanguage = document.languageId === 'markdown';
		
		return isMarkdownLanguage || hasMdExtension;
	}
	
	return false;
}

// ============================================================================
// EXTENSION ACTIVATION - Main activation function
// ============================================================================

/**
 * Main activation function of the extension.
 * Called when VS Code activates the extension.
 * Registers every command handler, event listener and configuration option.
 * 
 * @param context - Extension context provided by VS Code
 */
export function activate(context: vscode.ExtensionContext) {
	try {
	console.log('GitHub Style Markdown Preview is active!');

		// ========================================================================
		// DATA STRUCTURES FOR MANAGING PREVIEWS
		// ========================================================================
		
		/**
		 * Active webview panels, indexed by document URI.
		 * Used to track which documents have an open preview and to avoid duplicates.
		 * Key: document URI as a string
		 * Value: the webview panel
		 */
		const activePanels = new Map<string, vscode.WebviewPanel>();
		
		/**
		 * View column of each preview.
		 * Tracks the column each preview is shown in (for the protectPreviewColumn feature).
		 * Key: document URI as a string
		 * Value: view column where the preview is shown
		 */
		const previewViewColumns = new Map<string, vscode.ViewColumn>();
		
		/**
		 * Document behind each preview.
		 * Keeps references to the source documents to focus them after opening the preview.
		 * Key: document URI as a string
		 * Value: the text document
		 */
		const previewDocuments = new Map<string, vscode.TextDocument>();

		/**
		 * Previews open in an external browser.
		 * Keeps metadata about each browser preview:
		 * - The document
		 * - The current theme (dark/light)
		 * - The last known content (to detect changes)
		 * - Timestamp of the last update
		 * Key: document URI as a string
		 * Value: browser preview metadata
		 */
		const browserPreviews = new Map<string, { 
			document: vscode.TextDocument; 
			isDarkMode: boolean; 
			lastContent: string;
			lastUpdate: number;
		}>();

		// ========================================================================
		// BROWSER PREVIEW (EXTERNAL BROWSER)
		// ========================================================================
		
		/**
		 * Opens a Markdown preview in an external browser.
		 * 
		 * This function:
		 * 1. Creates a temporary HTML file in the extension's storage
		 * 2. Renders the Markdown with markdown-it
		 * 3. Applies the GitHub CSS (dark or light theme)
		 * 4. Opens the HTML file in the default browser
		 * 5. Sets up listeners that rewrite the HTML when the file changes
		 * 
		 * For file:// URLs (local files), the page picks up changes by reloading
		 * itself periodically.
		 * The HTML file is rewritten when the document changes or is saved (Ctrl+S).
		 * 
		 * @param document - The Markdown document to preview
		 * @param context - Extension context
		 * @param updateDelay - Delay in milliseconds before updating the preview after an edit (debouncing)
		 */
		async function openPreviewInBrowser(document: vscode.TextDocument, context: vscode.ExtensionContext, updateDelay: number) {
			const documentUri = document.uri.toString();
			
			// Close the IDE preview if it is open (only one preview mode at a time)
			const existingPanel = activePanels.get(documentUri);
			if (existingPanel) {
				existingPanel.dispose();
			}
			
			// Check whether there is already a browser preview for this file
			// If there is, drop the old entry so a new preview can be opened
			// (there is no way to know if the browser is still open, so reopening is always allowed)
			if (browserPreviews.has(documentUri)) {
				// Clean up the listeners and resources of the previous preview
				const oldPreview = browserPreviews.get(documentUri);
				if (oldPreview) {
					// Listeners may already have been cleaned up
					// Full clean-up happens when the document is closed
				}
				// Remove the old entry so a new one can be created
				browserPreviews.delete(documentUri);
			}

			// Load the saved theme preference (per file), or default to the current VS Code theme
			const savedThemePreference = loadThemePreference(context, document);
			const vsCodeTheme = vscode.window.activeColorTheme;
			const defaultIsDark = vsCodeTheme.kind === vscode.ColorThemeKind.Dark;
			let isDarkMode = savedThemePreference !== null ? savedThemePreference : defaultIsDark;

			// Load settings
			const config = vscode.workspace.getConfiguration('github-style-markdown-preview');
			const enableEmoji = config.get<boolean>('enableEmoji', true);
			const enableBreaks = config.get<boolean>('enableBreaks', false);
			const maxWidthConfig = config.get<number | string>('maxWidth', 980);
			// Make sure maxWidth is never 0 (default to 980)
			const maxWidth = (typeof maxWidthConfig === 'number' && maxWidthConfig === 0) ? 980 : maxWidthConfig;
			
			// Create the Markdown renderer with these settings
			const md = new MarkdownIt({
				breaks: enableBreaks,
				html: false, // For security, inline HTML is not allowed
				linkify: true, // Turn URLs into links automatically
			});
			
			// Add emoji support if enabled
			if (enableEmoji) {
				// markdown-it-emoji (full) renders every available emoji
				// Supports :smile:, :rocket:, :heart: and all the other GitHub emoji
				md.use(emoji);
			}
			
			const encoder = new TextEncoder();
			
			/**
			 * Rewrites the temporary HTML file with new content and theme.
			 * Called whenever the document changes or is saved.
			 * 
			 * @param tempFile - URI of the temporary HTML file
			 * @param content - The Markdown content to render
			 * @param darkMode - true for the dark theme, false for the light theme
			 */
			const updateHtmlFile = async (tempFile: vscode.Uri, content: string, darkMode: boolean) => {
				const rendered = md.render(content);
				const htmlContent = getBrowserHtml(rendered, content, darkMode, documentUri, updateDelay, maxWidth);
				const data = encoder.encode(htmlContent);
				await vscode.workspace.fs.writeFile(tempFile, data);
			};

			const content = document.getText();
			
			// ========================================================================
			// TEMPORARY FILE STRATEGY
			// ========================================================================
			// Create an HTML file on disk, or fall back to a data URI
			// Files on disk can be updated automatically
			// Data URIs are limited but work when no workspace is open
			
			let tempFile: vscode.Uri | undefined;
			let useDataUri = false;
			
			// Strategy 1: temporary HTML file in the extension's storage (outside the workspace)
			// This avoids filling the workspace with temporary files
			try {
				// Use the extension's storageUri (outside the workspace)
				const storageUri = context.storageUri || context.globalStorageUri;
				if (storageUri) {
					// Create the previews folder if it doesn't exist
					const previewDir = vscode.Uri.joinPath(storageUri, 'previews');
					try {
						await vscode.workspace.fs.createDirectory(previewDir);
					} catch (error) {
						// The folder already exists or failed - carry on anyway
					}
					// Unique timestamp-based name to avoid clashes
					tempFile = vscode.Uri.joinPath(previewDir, `preview-${Date.now()}.html`);
				} else {
					// Fallback: use the workspace if storageUri isn't available
					const workspaceFolders = vscode.workspace.workspaceFolders;
					if (workspaceFolders && workspaceFolders.length > 0) {
						const workspaceFolder = workspaceFolders[0];
						tempFile = vscode.Uri.joinPath(workspaceFolder.uri, '.vscode', `preview-${Date.now()}.html`);
						const vscodeDir = vscode.Uri.joinPath(workspaceFolder.uri, '.vscode');
						try {
							await vscode.workspace.fs.createDirectory(vscodeDir);
						} catch (error) {
							// The folder already exists or failed - carry on anyway
						}
					}
				}
			} catch (error) {
				// If that fails, fall back to the workspace
				const workspaceFolders = vscode.workspace.workspaceFolders;
				if (workspaceFolders && workspaceFolders.length > 0) {
					const workspaceFolder = workspaceFolders[0];
					tempFile = vscode.Uri.joinPath(workspaceFolder.uri, '.vscode', `preview-${Date.now()}.html`);
					const vscodeDir = vscode.Uri.joinPath(workspaceFolder.uri, '.vscode');
					try {
						await vscode.workspace.fs.createDirectory(vscodeDir);
					} catch (err) {
						// Ignore errors
					}
				}
			}
			
			if (!tempFile) {
				// Strategy 2: data URI for small files when no workspace is open
				// Data URIs are limited in size (~2MB) and don't support automatic updates well
				if (content.length < 2 * 1024 * 1024) {
					useDataUri = true;
				} else {
					vscode.window.showErrorMessage('No workspace open. Please open a workspace to use the browser preview.');
					return;
				}
			}
		
			try {
				if (useDataUri) {
					// ========================================================================
					// DATA URI MODE (no workspace available)
					// ========================================================================
					// Open a data URI directly in the browser
					// Limited: no automatic updates, ~2MB size limit
					const rendered = md.render(content);
					const htmlContent = getBrowserHtml(rendered, content, isDarkMode, documentUri, updateDelay, maxWidth);
					const dataUri = `data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`;
					await vscode.env.openExternal(vscode.Uri.parse(dataUri));
					
					// Save the preview data (a data URI can't be updated easily)
					browserPreviews.set(documentUri, {
						document,
						isDarkMode,
						lastContent: content,
						lastUpdate: Date.now()
					});
					
					vscode.window.showInformationMessage('Preview opened in the browser. Note: automatic updates may not work with a data URI. Consider opening a workspace.');
					return;
				}
				
				// ========================================================================
				// WORKSPACE FILE MODE (recommended)
				// ========================================================================
				// Create the initial HTML file
				await updateHtmlFile(tempFile!, content, isDarkMode);
				
				// Open the HTML file in the default browser
				// VS Code turns the URI into a file:// path automatically
				await vscode.env.openExternal(tempFile!);
				
				// Save the preview metadata for tracking and updates
				browserPreviews.set(documentUri, {
					document,
					isDarkMode,
					lastContent: content,
					lastUpdate: Date.now()
				});

				// Keep a reference to the temporary file for future updates
				const savedTempFile = tempFile!;

				// ========================================================================
				// AUTO-UPDATE FOR THE BROWSER PREVIEW
				// ========================================================================
				// Debounced update so the file isn't rewritten on every keystroke
				let updateTimeout: ReturnType<typeof setTimeout> | undefined;
				
				/**
				 * Schedules an update of the HTML file when the document changes.
				 * Debounced so the disk isn't written on every key press.
				 * If updateDelay is 0, updates are instant (no debouncing).
				 */
				const scheduleUpdate = () => {
					if (updateTimeout) {
						clearTimeout(updateTimeout);
					}
					if (updateDelay > 0) {
						// Debounced update: wait until the user stops typing
						updateTimeout = setTimeout(async () => {
							const preview = browserPreviews.get(documentUri);
							if (preview) {
								const currentDoc = vscode.workspace.textDocuments.find(d => d.uri.toString() === documentUri);
								if (currentDoc) {
									const newContent = currentDoc.getText();
									// Only update if the content really changed
									if (newContent !== preview.lastContent) {
										preview.lastContent = newContent;
										preview.lastUpdate = Date.now();
										await updateHtmlFile(savedTempFile, newContent, preview.isDarkMode);
									}
								}
							}
						}, updateDelay);
					} else {
						// Instant update: no debouncing (can be slow with large files)
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
							// Ignore errors silently
						});
					}
				};

				// ========================================================================
				// EVENT LISTENERS FOR BROWSER PREVIEW UPDATES
				// ========================================================================
				
				/**
				 * Document change listener - schedules HTML file updates.
				 * Fires whenever the user types in or edits the Markdown file.
				 */
				const changeSubscription = vscode.workspace.onDidChangeTextDocument((e) => {
					if (e.document.uri.toString() === documentUri) {
						scheduleUpdate();
					}
				});

				/**
				 * Document close listener - cleans up the browser preview.
				 * Removes the preview from the tracking map, disposes the listeners and deletes the temporary HTML file.
				 */
				const closeSubscription = vscode.workspace.onDidCloseTextDocument((doc) => {
					if (doc.uri.toString() === documentUri) {
						browserPreviews.delete(documentUri);
						changeSubscription.dispose();
						closeSubscription.dispose();
						if (updateTimeout) {
							clearTimeout(updateTimeout);
						}
						// Try to delete the temporary HTML file (if one was created)
						if (savedTempFile && !useDataUri) {
							vscode.workspace.fs.delete(savedTempFile).then(() => {
								// File deleted
							}, () => {
								// Ignore deletion errors (the file may have been deleted by hand)
							});
						}
					}
				});

				// Register the subscriptions so they are cleaned up when the extension deactivates
				context.subscriptions.push(changeSubscription, closeSubscription);
			} catch (error) {
				vscode.window.showErrorMessage(`Error opening the preview in the browser: ${error}`);
			}
		}

		// ========================================================================
		// IDE PREVIEW (WEBVIEW PANEL)
		// ========================================================================
		
		/**
		 * Opens a Markdown preview in a VS Code webview panel (IDE preview).
		 * 
		 * This function:
		 * 1. Checks whether this document already has a preview open (if so, just reveals it)
		 * 2. Creates a new GitHub-style webview panel
		 * 3. Renders the Markdown with markdown-it
		 * 4. Applies the user's preferred theme (dark/light) for this file
		 * 5. Sets up listeners that refresh the preview when the file changes
		 * 6. Handles the theme toggle and open-in-browser buttons
		 * 
		 * The preview honours the protectPreviewColumn setting:
		 * - Enabled: the preview opens in column 2 (a column dedicated to previews)
		 * - Disabled: the preview opens beside the editor (ViewColumn.Beside)
		 * 
		 * @param document - The Markdown document to preview
		 */
		async function openPreview(document: vscode.TextDocument) {
			const documentUri = document.uri.toString();

			// Load the extension settings
			const config = vscode.workspace.getConfiguration('github-style-markdown-preview');
			const updateDelay = config.get<number>('updateDelay', 300);
			const protectPreviewColumn = config.get<boolean>('protectPreviewColumn', false);

			// Check whether this document already has a panel open
			// If it does, just reveal it and focus the editor (no duplicates)
			const existingPanel = activePanels.get(documentUri);
			if (existingPanel) {
				existingPanel.reveal();
				// Focus the document's editor after revealing the preview
				const editor = await vscode.window.showTextDocument(document, { preview: false });
				return;
			}

			// Load the saved theme preference for this file, or default to the current VS Code theme
			const savedThemePreference = loadThemePreference(context, document);
			const vsCodeTheme = vscode.window.activeColorTheme;
			const defaultIsDark = vsCodeTheme.kind === vscode.ColorThemeKind.Dark;
			let isDarkMode: boolean = savedThemePreference !== null ? savedThemePreference : defaultIsDark;
			
			// Load the markdown-it settings
			const enableEmoji = config.get<boolean>('enableEmoji', true);
			const enableBreaks = config.get<boolean>('enableBreaks', false);
			const enableMath = config.get<boolean>('enableMath', false);
			const maxWidthConfig = config.get<number | string>('maxWidth', 980);
			// Make sure maxWidth is never 0 (default to 980)
			const maxWidth = (typeof maxWidthConfig === 'number' && maxWidthConfig === 0) ? 980 : maxWidthConfig;
			
			// Create the Markdown renderer with these settings
			const md = new MarkdownIt({
				breaks: enableBreaks,
				html: false, // For security, inline HTML is not allowed
				linkify: true, // Turn URLs into links automatically
			});
			
			// Add emoji support if enabled
			if (enableEmoji) {
				// markdown-it-emoji (full) renders every available emoji
				// Supports :smile:, :rocket:, :heart: and all the other GitHub emoji
				md.use(emoji);
			}
			
			// Math (LaTeX) support, if enabled
			// Math is rendered on the client side (in the webview) with KaTeX,
			// because markdown-it doesn't handle math natively

			// File name for the panel title (e.g. "README.md Preview")
			const fileName = document.fileName.split(/[/\\]/).pop() || 'README.md';
			
			// Choose the view column from the protectPreviewColumn setting
			// When protection is on, use column 2 (a column dedicated to previews)
			// Otherwise open beside the editor (VS Code picks the best position)
			const previewViewColumn = protectPreviewColumn ? vscode.ViewColumn.Two : vscode.ViewColumn.Beside;
			
			// Create the webview panel for the preview
			const panel = vscode.window.createWebviewPanel(
				'githubReadmePreview', // Webview ID (used in when clauses for menus/keybindings)
				`${fileName} Preview`, // Panel title
				previewViewColumn,     // Where to open the panel
				{
					enableScripts: true,              // Allow JavaScript in the webview (needed for the theme toggle)
					retainContextWhenHidden: true,    // Keep the webview state while hidden (faster)
				}
			);

			// Save the panel and its metadata in the tracking maps
			activePanels.set(documentUri, panel);
			previewViewColumns.set(documentUri, previewViewColumn);
			previewDocuments.set(documentUri, document);

			// ========================================================================
			// PANEL DISPOSAL
			// ========================================================================
			/**
			 * Handles the panel being closed (when the user closes the preview).
			 * Tells apart a manual close (document still open) from an automatic one (document closed).
			 * This matters for auto-open: if the user closes the preview by hand,
			 * it isn't reopened until the file is closed and opened again.
			 */
			panel.onDidDispose(() => {
				// Remove it from the tracking maps
				activePanels.delete(documentUri);
				previewViewColumns.delete(documentUri);
				previewDocuments.delete(documentUri);
				
				// Was it closed manually or automatically (because the file was closed)?
				// If the document still exists, it was closed manually
				const documentStillExists = vscode.workspace.textDocuments.some(doc => doc.uri.toString() === documentUri);
				if (documentStillExists) {
					// Manual close: the user closed the preview but the document is still open
					// Mark it as closed so auto-open doesn't reopen it
					setPreviewClosed(context, document, true).catch(() => {
						// Ignore errors
					});
				} else {
					// Automatic close: the document was closed, so its preview closed with it
					// Reset the closed state so it can reopen when the file is opened again
					setPreviewClosed(context, document, false).catch(() => {
						// Ignore errors
					});
				}
			});

			// ========================================================================
			// WEBVIEW CONTENT UPDATES
			// ========================================================================
			
			/**
			 * Updates the webview HTML with the current content of the document.
			 * Called whenever:
			 * - The preview is opened for the first time
			 * - The document content changes (debounced)
			 * - The document is saved (immediate update)
			 * - The theme is toggled
			 * 
			 * Renders the Markdown to HTML, applies the GitHub CSS and adds
			 * the interactive buttons (theme toggle, and the web button if enabled).
			 */
			const updateWebview = () => {
				// Get the current document (it may have changed since the panel was created)
				const currentDocument = vscode.workspace.textDocuments.find(doc => doc.uri.toString() === documentUri);
				if (!currentDocument) {
					return; // The document was already closed, nothing to update
				}

				// Get the document content and render the Markdown to HTML
				const content = currentDocument.getText();
				const rendered = md.render(content);
				
				// Pick the CSS file for the current theme
				const cssFile = isDarkMode ? 'github-markdown-dark.css' : 'github-markdown-light.css';
				
				// Convert the extension URI into a webview URI to load the CSS file
				const githubCssUri = panel.webview.asWebviewUri(
					vscode.Uri.joinPath(context.extensionUri, 'node_modules', 'github-markdown-css', cssFile)
				);

				// Read the settings for buttons and features
				const currentConfig = vscode.workspace.getConfiguration('github-style-markdown-preview');
				const openInBrowser = currentConfig.get<boolean>('openInBrowser', false);
				const enableExport = currentConfig.get<boolean>('enableExport', false);
				const enableMath = currentConfig.get<boolean>('enableMath', false);
				const maxWidthConfig = currentConfig.get<number | string>('maxWidth', 980);
				// Make sure maxWidth is never 0 (default to 980)
				const maxWidth = (typeof maxWidthConfig === 'number' && maxWidthConfig === 0) ? 980 : maxWidthConfig;
				
				// Build and set the webview HTML
				panel.webview.html = getWebviewHtml(rendered, githubCssUri, content, isDarkMode, openInBrowser, enableExport, enableMath, maxWidth, documentUri);
			};

			// ========================================================================
			// THEME TOGGLE
			// ========================================================================
			
			/**
			 * Switches the preview between the dark and light themes.
			 * Saves the preference per file, so each document remembers its theme.
			 * Updates the webview right away to show the new theme.
			 */
			const toggleTheme = async () => {
				isDarkMode = !isDarkMode;
				await saveThemePreference(context, document, isDarkMode);
				updateWebview(); // Refresh the webview with the new theme
			};

			// Store the toggle function on the panel so it can be called from outside (e.g. the command palette)
			(panel as any).toggleTheme = toggleTheme;

			// ========================================================================
			// AUTO-UPDATE FOR THE IDE PREVIEW
			// ========================================================================
			
			/**
			 * Debounced update scheduler for the IDE preview.
			 * Avoids refreshing the webview on every keystroke while the user types.
			 * If updateDelay is 0, updates are instant (no debouncing).
			 */
			let updateTimeout: ReturnType<typeof setTimeout> | undefined;
			const scheduleUpdate = () => {
				if (updateTimeout) {
					clearTimeout(updateTimeout);
				}
				if (updateDelay > 0) {
					// Debounced: wait until the user stops typing
					updateTimeout = setTimeout(() => {
						updateWebview();
					}, updateDelay);
				} else {
					// Instant: update right away (can be slow with large files)
					updateWebview();
				}
			};

			/**
			 * Document change listener - schedules preview updates.
			 * Fires whenever the user types in or edits the Markdown file.
			 */
			const changeSubscription = vscode.workspace.onDidChangeTextDocument((e) => {
				if (e.document.uri.toString() === documentUri) {
					scheduleUpdate();
				}
			});

			/**
			 * Document save listener - updates the preview immediately.
			 * Makes sure the preview is up to date as soon as the file is saved (Ctrl+S).
			 */
			const saveSubscription = vscode.workspace.onDidSaveTextDocument((doc) => {
				if (doc.uri.toString() === documentUri) {
					// Update immediately on save (no debouncing)
					updateWebview();
				}
			});

			// ========================================================================
			// OPEN IN BROWSER BUTTON
			// ========================================================================
			
			/**
			 * Opens the preview in the external browser and closes the IDE panel.
			 * Called when the user clicks the "Web" button in the IDE preview.
			 */
			const openInBrowserAndClose = async () => {
				const config = vscode.workspace.getConfiguration('github-style-markdown-preview');
				const updateDelay = config.get<number>('updateDelay', 300);
				// Close the IDE panel first
				panel.dispose();
				// Wait a moment before opening the browser (so the panel is fully closed)
				setTimeout(async () => {
					await openPreviewInBrowser(document, context, updateDelay);
				}, 100);
			};

			// Store the function on the panel so it can be called from outside
			(panel as any).openInBrowser = openInBrowserAndClose;

			// ========================================================================
			// EXPORT
			// ========================================================================
			
			/**
			 * Exports the preview as HTML.
			 * Lets the user choose where to save the file and its name.
			 */
			const exportPreview = async () => {
				try {
					const currentDoc = vscode.workspace.textDocuments.find(doc => doc.uri.toString() === documentUri);
					if (!currentDoc) {
						vscode.window.showErrorMessage('Document not found for export');
						return;
					}

					// Read the settings to recreate the renderer
					const config = vscode.workspace.getConfiguration('github-style-markdown-preview');
					const enableEmoji = config.get<boolean>('enableEmoji', true);
					const enableBreaks = config.get<boolean>('enableBreaks', false);
					
					// Create a Markdown renderer with the same settings
					const exportMd = new MarkdownIt({
						breaks: enableBreaks,
						html: false,
						linkify: true,
					});
					
					// Add emoji support if enabled
					if (enableEmoji) {
						exportMd.use(emoji);
					}

					// Render the content
					const content = currentDoc.getText();
					const rendered = exportMd.render(content);
					
					// Pick the CSS file for the theme
					const cssFile = isDarkMode ? 'github-markdown-dark.css' : 'github-markdown-light.css';
					const cssUrl = `https://cdnjs.cloudflare.com/ajax/libs/github-markdown-css/5.8.1/${cssFile}`;
					
					// Work out the max-width
					const maxWidthConfig = config.get<number | string>('maxWidth', 980);
					const maxWidth = (typeof maxWidthConfig === 'number' && maxWidthConfig === 0) ? 980 : maxWidthConfig;
					const maxWidthCss = typeof maxWidth === 'string' && maxWidth.toLowerCase() === 'auto' 
						? 'auto' 
						: typeof maxWidth === 'number' 
							? `${maxWidth}px` 
							: '980px';
					
					// If math is enabled, include KaTeX
					const enableMath = config.get<boolean>('enableMath', false);
					const katexCss = enableMath ? '<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">' : '';
					const katexJs = enableMath ? '<script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"></script><script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js"></script>' : '';
					const katexRenderScript = enableMath ? `
					<script>
						document.addEventListener("DOMContentLoaded", function() {
							renderMathInElement(document.body, {
								delimiters: [
									{left: "$$", right: "$$", display: true},
									{left: "\\[", right: "\\]", display: true},
									{left: "$", right: "$", display: false},
									{left: "\\(", right: "\\)", display: false}
								]
							});
						});
					</script>` : '';
					
					// Build the full HTML
					const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<link rel="stylesheet" href="${cssUrl}">
	${katexCss}
	<title>Markdown Export</title>
	<style>
		body {
			background-color: ${isDarkMode ? '#0d1117' : '#ffffff'};
			color: ${isDarkMode ? '#c9d1d9' : '#24292f'};
			padding: 0;
			margin: 0;
			font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
		}
		.markdown-body {
			padding: 2rem;
			max-width: ${maxWidthCss};
			margin: 0 auto;
		}
	</style>
</head>
<body>
	<article class="markdown-body">${rendered}</article>
	${katexJs}
	${katexRenderScript}
</body>
</html>`;

					// Ask the user where to save the file and its name
					const fileName = currentDoc.fileName.split(/[/\\]/).pop()?.replace(/\.md$/i, '') || 'export';
					const uri = await vscode.window.showSaveDialog({
						defaultUri: vscode.Uri.file(`${fileName}.html`),
						filters: {
							'HTML': ['html']
						},
						saveLabel: 'Export'
					});

					if (uri) {
						// Write the file
						const encoder = new TextEncoder();
						await vscode.workspace.fs.writeFile(uri, encoder.encode(htmlContent));
						vscode.window.showInformationMessage(`Preview exported to ${uri.fsPath}`);
					}
				} catch (error) {
					vscode.window.showErrorMessage(`Error exporting preview: ${error}`);
				}
			};

			// Store the function on the panel so it can be called from outside
			(panel as any).exportPreview = exportPreview;

			// ========================================================================
			// WEBVIEW MESSAGES
			// ========================================================================
			
			/**
			 * Handles messages from the webview (from the JavaScript in the preview).
			 * Supports three commands:
			 * - 'toggleTheme': switches between the dark and light themes
			 * - 'openInBrowser': opens the preview in the external browser and closes the IDE panel
			 * - 'exportPreview': exports the preview as HTML
			 */
			panel.webview.onDidReceiveMessage(async (msg) => {
				if (msg.command === 'toggleTheme') {
					await toggleTheme();
				} else if (msg.command === 'openInBrowser') {
					await openInBrowserAndClose();
				} else if (msg.command === 'exportPreview') {
					await exportPreview();
				}
			});

			// ========================================================================
			// CLEAN-UP WHEN THE PANEL CLOSES
			// ========================================================================
			
			/**
			 * Cleans up when the panel is closed.
			 * Disposes the event listeners and clears timeouts to avoid memory leaks.
			 */
			panel.onDidDispose(() => {
				changeSubscription.dispose();
				saveSubscription.dispose();
				if (updateTimeout) {
					clearTimeout(updateTimeout);
				}
			});

			// Initial webview update (show the preview content)
			updateWebview();
			
			// Focus the document's editor after opening the preview (if configured)
			const focusEditorAfterOpen = config.get<boolean>('focusEditorAfterOpen', true);
			if (focusEditorAfterOpen) {
				setTimeout(async () => {
					try {
						const doc = vscode.workspace.textDocuments.find(d => d.uri.toString() === documentUri);
						if (doc) {
							await vscode.window.showTextDocument(doc, { preview: false, viewColumn: vscode.ViewColumn.One });
						}
					} catch (error) {
						// Ignore focus errors
					}
				}, 100);
			}
		}

		// ========================================================================
		// VS CODE COMMANDS
		// ========================================================================
		
		/**
		 * Command: Open Markdown Preview
		 * 
		 * Opens a GitHub-style preview of the active Markdown file.
		 * Can be triggered from:
		 * - Command Palette: "GitHub Style Markdown Preview: Open Markdown Preview"
		 * - Keyboard shortcut: Alt+R (while editing Markdown)
		 * - Editor title button: the Preview icon (while editing Markdown)
		 * 
		 * Honours the openInBrowser setting:
		 * - false: opens the preview in an IDE webview panel
		 * - true: opens the preview in the external browser
		 */
		const openCommand = vscode.commands.registerCommand('github-style-markdown-preview.openMarkDown', async () => {
		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			vscode.window.showErrorMessage('No file is open.');
			return;
		}

		const document = editor.document;
			if (!isFileSupported(document)) {
				// More detailed error message for debugging
				const fileName = document.fileName.split(/[/\\]/).pop() || document.fileName;
				const languageId = document.languageId;
				const config = vscode.workspace.getConfiguration('github-style-markdown-preview');
				const supportedPatterns = config.get<string[]>('supportedFiles', ['*.md']);
				
				console.log(`[GitHub Style Markdown Preview] File not supported:`, {
					fileName,
					languageId,
					supportedPatterns,
					fullPath: document.fileName
				});
				
				vscode.window.showWarningMessage(
					`This command only works with supported Markdown files. ` +
					`File: ${fileName}, Language ID: ${languageId}, Patterns: ${supportedPatterns.join(', ')}`
				);
				return;
			}

			// Reset the closed state when the user opens the preview by hand
			// This lets auto-open work again if the user closed the preview earlier
			await setPreviewClosed(context, document, false);
			await openPreview(document);
		});

		/**
		 * Comando: Toggle Preview Theme
		 * 
		 * Switches the visible preview between the dark and light themes.
		 * Can be triggered from:
		 * - Command Palette: "GitHub Style Markdown Preview: Toggle Preview Theme"
		 * - Keyboard shortcut: Ctrl+Shift+T (while the preview is active)
		 * - Preview button: the theme toggle button in the webview
		 * 
		 * The theme preference is saved per file and persists across VS Code sessions.
		 */
		const toggleThemeCommand = vscode.commands.registerCommand('github-style-markdown-preview.toggleTheme', async () => {
			// Find the visible/active preview panel
			const activePanel = Array.from(activePanels.values()).find(panel => panel.visible);
			if (activePanel && (activePanel as any).toggleTheme) {
				await (activePanel as any).toggleTheme();
			} else {
				vscode.window.showInformationMessage('No active preview. Open a preview first.');
			}
		});

		// ========================================================================
		// DOCUMENT CLOSE HANDLING
		// ========================================================================
		
		/**
		 * Document close listener - closes the matching preview panels.
		 * When a Markdown file is closed, its preview closes too
		 * (if closeOnFileClose is enabled).
		 * The panel's onDidDispose handler sees that the document no longer exists
		 * and resets the closed state so it can reopen when the file is opened again.
		 */
		const closePreviewOnDocumentClose = vscode.workspace.onDidCloseTextDocument((document) => {
			if (isFileSupported(document)) {
				const config = vscode.workspace.getConfiguration('github-style-markdown-preview');
				const closeOnFileClose = config.get<boolean>('closeOnFileClose', true);
				
				if (closeOnFileClose) {
					const documentUri = document.uri.toString();
					const panel = activePanels.get(documentUri);
					if (panel) {
						// Close the preview when its document is closed
						// The panel's onDidDispose sees that the document no longer exists
						// and resets the state correctly
						panel.dispose();
					}
				}
			}
		});
		context.subscriptions.push(closePreviewOnDocumentClose);

		// ========================================================================
		// AUTO-OPEN
		// ========================================================================
		
		/**
		 * Opens the preview automatically when Markdown files are opened.
		 * 
		 * When enabled (autoOpen = true):
		 * - Opens the preview automatically when a supported Markdown file is opened
		 * - Checks the files already open when VS Code starts and opens their previews
		 * - Respects manual closes: if the user closes the preview by hand,
		 *   it isn't reopened until the file is closed and opened again
		 * 
		 * This gives a smooth experience similar to live preview extensions.
		 */
		const config = vscode.workspace.getConfiguration('github-style-markdown-preview');
		if (config.get<boolean>('autoOpen', false)) {
			/**
			 * Checks the files that are open and opens previews for supported Markdown files.
			 * Called on activation to handle files that were already open
			 * when VS Code started.
			 */
			const checkOpenFiles = async () => {
				try {
					const openDocuments = vscode.workspace.textDocuments;
					if (!openDocuments || openDocuments.length === 0) {
			return;
		}

					// Go through every open document
					for (const doc of openDocuments) {
						try {
							// Check that the document is supported and its preview wasn't closed manually
							if (doc && isFileSupported(doc) && !isPreviewClosed(context, doc)) {
								const documentUri = doc.uri.toString();
								if (!activePanels.has(documentUri)) {
									// Short delay between previews (avoids overloading the system)
									await new Promise(resolve => setTimeout(resolve, 150));
									// Check again before opening (things may have changed during the delay)
									if (doc && !isPreviewClosed(context, doc) && !activePanels.has(documentUri)) {
										openPreview(doc).catch(() => {
											// Ignore errors silently
										});
									}
								}
							}
						} catch (error) {
							// Move on to the next file if something fails
							continue;
						}
					}
				} catch (error) {
					// Ignore general errors
				}
			};

			// Check the open files after a longer delay (so VS Code is fully ready)
			setTimeout(() => {
				checkOpenFiles().catch(() => {
					// Ignore errors
				});
			}, 1000);

			/**
			 * Active editor listener - opens the preview when a supported Markdown file becomes active.
			 * Only opens it if:
			 * - The preview wasn't closed manually
			 * - There isn't already a preview open for this document
			 * - The document is supported (matches the file patterns)
			 */
			const autoOpenDisposable = vscode.window.onDidChangeActiveTextEditor(async (editor) => {
				if (editor && isFileSupported(editor.document)) {
					// Check that the preview wasn't closed manually
					if (!isPreviewClosed(context, editor.document)) {
						// Check that there isn't a preview open already
						const documentUri = editor.document.uri.toString();
						if (!activePanels.has(documentUri)) {
							// Short delay to avoid opening it several times
							setTimeout(() => {
								// Check again that it wasn't closed manually in the meantime
								if (!isPreviewClosed(context, editor.document) && !activePanels.has(documentUri)) {
									openPreview(editor.document).catch(() => {
										// Ignore errors silently
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
		// PREVIEW COLUMN PROTECTION
		// ========================================================================
		
		/**
		 * Keeps other files out of the preview column.
		 * 
		 * When enabled (protectPreviewColumn = true):
		 * - The preview opens in column 2 (a column dedicated to previews)
		 * - Any other file that opens in column 2 is moved to column 1 automatically
		 * - So the preview column is reserved for previews only
		 * - This keeps the layout tidy, with previews always in a predictable place
		 * 
		 * Uses a guard flag and a timeout to avoid infinite loops while moving files.
		 */
		if (config.get<boolean>('protectPreviewColumn', false)) {
			let isProtecting = false; // Guard flag to avoid infinite loops
			let protectTimeout: ReturnType<typeof setTimeout> | undefined;
			
			/**
			 * Protects column 2 by moving non-preview files to column 1.
			 * Only acts if:
			 * - The editor exists and isn't already being handled
			 * - The editor is in column 2
			 * - There is a preview in column 2
			 * - The current file isn't the preview's own document
			 */
			const protectColumn = async (editor: vscode.TextEditor) => {
				if (!editor || isProtecting || editor.viewColumn !== vscode.ViewColumn.Two) {
					return;
				}
				
				// Is there a preview in column 2?
				const hasPreviewInColumnTwo = Array.from(previewViewColumns.values()).some(col => col === vscode.ViewColumn.Two);
				
				if (!hasPreviewInColumnTwo) {
					return; // No preview to protect
				}
				
				// Check that the current file isn't a preview document
				const currentDocUri = editor.document.uri.toString();
				const isPreviewDocument = Array.from(activePanels.keys()).some(uri => uri === currentDocUri);
				
				// If a supported Markdown file opens in column 2, close it there
				// and move it to column 1 (the preview is already in column 2)
				if (isFileSupported(editor.document)) {
					isProtecting = true;
					try {
						// Close the current editor in column 2
						await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
						
						// Move the file to column 1 (the protected column 2 is for previews only)
						await vscode.window.showTextDocument(editor.document, {
							viewColumn: vscode.ViewColumn.One,
							preview: false
						});
					} catch (error) {
						// Ignore errors silently
					} finally {
						// Reset the guard flag after a short delay
						if (protectTimeout) {
							clearTimeout(protectTimeout);
						}
						protectTimeout = setTimeout(() => {
							isProtecting = false;
						}, 300);
					}
					return;
				}
				
				if (!isPreviewDocument) {
					isProtecting = true;
					try {
						// Move the file to column 1 (the protected column 2 is for previews only)
						await vscode.window.showTextDocument(editor.document, {
							viewColumn: vscode.ViewColumn.One,
							preview: false
						});
					} catch (error) {
						// Ignore errors silently
					} finally {
						// Reset the guard flag after a short delay
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
			 * Active editor listener - protects column 2 when needed.
			 * Uses a short delay to avoid several quick calls.
			 */
			const protectColumnDisposable = vscode.window.onDidChangeActiveTextEditor(async (editor) => {
				if (editor) {
					// Short delay to avoid several calls
					setTimeout(() => {
						protectColumn(editor).catch(() => {
							// Ignore errors
						});
					}, 100);
				}
			});
			
			context.subscriptions.push(protectColumnDisposable);
		}

		// ========================================================================
		// STATUS BAR ITEM - Status bar button to open the preview
		// ========================================================================
		
		/**
		 * Creates a status bar button (like Live Server's) to open the preview.
		 * The button appears when a Markdown file is open and active.
		 */
		const statusBarItem = vscode.window.createStatusBarItem(
			vscode.StatusBarAlignment.Right,
			100 // Priority (lower number = further right)
		);
		
		statusBarItem.command = 'github-style-markdown-preview.openMarkDown';
		statusBarItem.tooltip = 'Open Markdown Preview (Ctrl+Alt+P)';
		statusBarItem.text = '$(preview) Markdown Preview';
		
		/**
		 * Shows or hides the status bar button depending on the active editor.
		 * The button only appears when a supported Markdown file is open.
		 */
		const updateStatusBar = () => {
			const editor = vscode.window.activeTextEditor;
			if (editor && isFileSupported(editor.document)) {
				statusBarItem.show();
			} else {
				statusBarItem.hide();
			}
		};
		
		// Update when the active editor changes
		const statusBarDisposable = vscode.window.onDidChangeActiveTextEditor(() => {
			updateStatusBar();
		});
		
		// Initial update
		updateStatusBar();
		
		// ========================================================================
		// REGISTER COMMANDS FOR CLEAN-UP
		// ========================================================================
		
		// Register every command and subscription so they are cleaned up when the extension deactivates
		context.subscriptions.push(openCommand, toggleThemeCommand, statusBarItem, statusBarDisposable);
	} catch (error) {
		console.error('Error activating GitHub Style Markdown Preview:', error);
		vscode.window.showErrorMessage(`GitHub Style Markdown Preview failed to activate: ${error}`);
	}
}

// ============================================================================
// HTML GENERATION
// ============================================================================

/**
 * Builds the HTML for the browser preview (external browser mode).
 * 
 * Creates a standalone HTML file that can be opened in any browser.
 * Features:
 * - Uses the GitHub Markdown CSS from a CDN (github-markdown-css)
 * - Supports dark and light themes
 * - Auto-refresh with a meta refresh tag (reloads when the HTML file changes)
 * - Minimal UI (no buttons, only the content)
 * 
 * The HTML file is stored in the extension's storage and rewritten
 * whenever the Markdown file changes or is saved.
 * 
 * @param renderedHtml - HTML rendered by markdown-it
 * @param rawContent - The raw Markdown (currently unused, kept for future features)
 * @param isDark - true for the dark theme, false for the light theme
 * @param documentUri - The document URI (for tracking)
 * @param updateDelay - Update delay in milliseconds (affects the refresh interval)
 * @returns Complete HTML for the browser preview
 */
function getBrowserHtml(renderedHtml: string, rawContent: string, isDark: boolean, documentUri: string, updateDelay: number, maxWidth: number | string = 980): string {
	// Pick the CSS file for the theme (GitHub Markdown CSS from a CDN)
	const cssFile = isDark ? 'github-markdown-dark.css' : 'github-markdown-light.css';
	// Use a CDN for the GitHub CSS (local files can't be served to the browser because of CORS)
	const cssUrl = `https://cdnjs.cloudflare.com/ajax/libs/github-markdown-css/5.8.1/${cssFile}`;
	
	// Work out the CSS max-width
	const maxWidthCss = typeof maxWidth === 'string' && maxWidth.toLowerCase() === 'auto' 
		? 'auto' 
		: typeof maxWidth === 'number' 
			? `${maxWidth}px` 
			: '980px';
	
	// Wrap the rendered HTML in a markdown-body article with padding and max-width
	const content = `<article class="markdown-body" style="padding: 2rem; max-width: ${maxWidthCss}; margin: 0 auto;">${renderedHtml}</article>`;
	
	// Theme-specific CSS tweaks for a consistent look
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

	// Work out the auto-refresh interval from updateDelay
	// At least 200ms to avoid refreshing too often
	const refreshInterval = Math.max(updateDelay || 300, 200);

	return /*html*/ `
<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<meta http-equiv="refresh" content="${Math.ceil(refreshInterval / 1000) + 1}">
	<link rel="stylesheet" href="${cssUrl}">
	<title>Markdown Preview</title>
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
 * Builds the HTML for the IDE webview panel.
 * 
 * Creates the HTML content of the VS Code webview panel.
 * Features:
 * - Uses the GitHub Markdown CSS from the extension's node_modules
 * - Supports dark and light themes, with a toggle button
 * - Updates automatically when the Markdown file changes
 * - Includes interactive buttons (theme toggle, and the web button if enabled)
 * - Uses VS Code theme variables for a consistent look
 * 
 * The webview talks to the extension through the postMessage API.
 * 
 * @param renderedHtml - HTML rendered by markdown-it
 * @param cssUri - URI of the GitHub Markdown CSS file (converted for the webview)
 * @param rawContent - The raw Markdown (currently unused)
 * @param isDark - true for the dark theme, false for the light theme
 * @param showWebButton - true to show the "Web" button (opens the preview in the browser)
 * @returns Complete HTML for the webview panel
 */
function getWebviewHtml(renderedHtml: string, cssUri: vscode.Uri, rawContent: string, isDark: boolean, showWebButton: boolean = false, enableExport: boolean = false, enableMath: boolean = false, maxWidth: number | string = 980, documentUri: string = ''): string {
	// Work out the CSS max-width
	const maxWidthCss = typeof maxWidth === 'string' && maxWidth.toLowerCase() === 'auto' 
		? 'auto' 
		: typeof maxWidth === 'number' 
			? `${maxWidth}px` 
			: '980px';
	
	// Wrap the rendered HTML in a markdown-body article with padding and max-width
	const content = `<article class="markdown-body" style="padding: 2rem; max-width: ${maxWidthCss}; margin: 0 auto;">${renderedHtml}</article>`;
	
	// Button label for the current theme (offers the opposite theme)
	const buttonText = isDark ? '☀️ Light Mode' : '🌙 Dark Mode';
	
	// Work out the button positions
	let buttonRight = 10;
	const buttons = [];
	if (showWebButton) {
		buttons.push(`<button id="web" class="web-button" title="Open preview in browser">🌐 Web</button>`);
		buttonRight += 140;
	}
	buttons.push(`<button id="toggle" title="Toggle between Dark and Light mode (Ctrl+Shift+T / Alt+T)">${buttonText}</button>`);
	if (enableExport) {
		buttons.push(`<button id="export" class="export-button" title="Export preview as HTML">💾 Export</button>`);
	}
	
	// Include KaTeX if math is enabled
	const katexCss = enableMath ? '<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">' : '';
	const katexJs = enableMath ? '<script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"></script><script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js"></script>' : '';
	const katexRenderScript = enableMath ? `
		<script>
			document.addEventListener("DOMContentLoaded", function() {
				if (typeof renderMathInElement !== 'undefined') {
					renderMathInElement(document.getElementById('content'), {
						delimiters: [
							{left: "$$", right: "$$", display: true},
							{left: "\\\\[", right: "\\\\]", display: true},
							{left: "$", right: "$", display: false},
							{left: "\\\\(", right: "\\\\)", display: false}
						],
						throwOnError: false
					});
				}
			});
		</script>` : '';
	
	// Theme-specific CSS tweaks using VS Code theme variables
	// So the preview matches the current VS Code theme
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
		${katexCss}
		<title>Markdown Preview</title>
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
			.export-button {
				top: auto;
				bottom: 10px;
				right: 10px;
			}
			.web-button {
				right: ${buttonRight}px;
			}
			#toggle {
				right: 10px;
			}
			${themeAdjustments}
		</style>
	</head>
	<body>
		${buttons.join('\n\t\t')}
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
			${enableExport ? `
			const exportButton = document.getElementById('export');
			if (exportButton) {
				exportButton.addEventListener('click', () => {
					vscode.postMessage({ command: 'exportPreview' });
				});
			}
			` : ''}
		</script>
		${katexJs}
		${katexRenderScript}
	</body>
	</html>
	`;
}

/**
 * Escapes HTML special characters to prevent XSS.
 * Replaces potentially dangerous characters with their HTML entities.
 * 
 * @param unsafe - The string to escape
 * @returns The escaped string, safe for HTML output
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
 * Extension deactivation function.
 * Called when VS Code deactivates the extension.
 * Every subscription registered in context.subscriptions is cleaned up automatically.
 */
export function deactivate() {}
