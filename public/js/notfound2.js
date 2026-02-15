document.addEventListener('DOMContentLoaded', () => {
    const editorWrapper = document.getElementById('editor-wrapper');
    const editorRoot = document.getElementById('monaco-editor-root');
    const vscodeBtn = document.getElementById('vscode-btn');
    
    let monacoInstanceMain = null;
    let isEditorOpen = false;
    let activeFileMain = null;
    let openFiles = []; 
    let fileSystem = { root: { children: {} } };
    let models = {};
    let unsavedFiles = new Set();
    let sidebarWidth = 220;
    let isResizingSidebar = false;
    let initPromise = null;
    let autoSaveTimeouts = {};
    let isCleaningContent = false;

    const languageMap = {
        'abap': 'abap', 'asc': 'abap',
        'apex': 'apex', 'cls': 'apex',
        'azcli': 'azcli',
        'bat': 'bat', 'cmd': 'bat',
        'bicep': 'bicep',
        'cameligo': 'cameligo', 'mligo': 'cameligo',
        'clojure': 'clojure', 'clj': 'clojure', 'cljs': 'clojure',
        'coffee': 'coffeescript', 'coffeescript': 'coffeescript',
        'c': 'c', 'h': 'c',
        'cpp': 'cpp', 'cc': 'cpp', 'cxx': 'cpp', 'hpp': 'cpp', 'hh': 'cpp', 'hxx': 'cpp',
        'csharp': 'csharp', 'cs': 'csharp', 'csx': 'csharp', 'net': 'csharp',
        'csp': 'csp',
        'css': 'css',
        'cypher': 'cypher', 'cyp': 'cypher',
        'dart': 'dart',
        'dockerfile': 'dockerfile', 'docker': 'dockerfile',
        'ecl': 'ecl',
        'elixir': 'elixir', 'ex': 'elixir', 'exs': 'elixir',
        'flow9': 'flow9', 'flow': 'flow9',
        'fsharp': 'fsharp', 'fs': 'fsharp', 'fsi': 'fsharp', 'fsx': 'fsharp', 'fsscript': 'fsharp',
        'freemarker2': 'freemarker2', 'ftl': 'freemarker2',
        'go': 'go', 'golang': 'go',
        'graphql': 'graphql', 'gql': 'graphql',
        'handlebars': 'handlebars', 'hbs': 'handlebars',
        'hcl': 'hcl', 'tf': 'hcl',
        'html': 'html', 'htm': 'html', 'xhtml': 'html', 'ejs': 'html',
        'ini': 'ini', 'properties': 'ini', 'cfg': 'ini', 'conf': 'ini',
        'java': 'java', 'jav': 'java', 'jsp': 'java',
        'javascript': 'javascript', 'js': 'javascript', 'es6': 'javascript', 'mjs': 'javascript', 'cjs': 'javascript', 'jsx': 'javascript',
        'julia': 'julia', 'jl': 'julia',
        'kotlin': 'kotlin', 'kt': 'kotlin', 'kts': 'kotlin',
        'less': 'less',
        'lexon': 'lexon',
        'lua': 'lua',
        'liquid': 'liquid',
        'm3': 'm3',
        'markdown': 'markdown', 'md': 'markdown', 'mkd': 'markdown',
        'mips': 'mips',
        'msdax': 'msdax', 'dax': 'msdax',
        'mysql': 'mysql',
        'objective-c': 'objective-c', 'm': 'objective-c', 'mm': 'objective-c', 'objc': 'objective-c',
        'pascal': 'pascal', 'pas': 'pascal', 'p': 'pascal',
        'pascaligo': 'pascaligo', 'ligo': 'pascaligo',
        'perl': 'perl', 'pl': 'perl', 'pm': 'perl',
        'pgsql': 'pgsql', 'postgres': 'pgsql',
        'php': 'php', 'php4': 'php', 'php5': 'php', 'phtml': 'php', 'ctp': 'php',
        'pla': 'pla',
        'postiats': 'postiats', 'dats': 'postiats', 'sats': 'postiats',
        'powerquery': 'powerquery', 'pq': 'powerquery',
        'powershell': 'powershell', 'ps1': 'powershell', 'psm1': 'powershell', 'psd1': 'powershell',
        'protobuf': 'protobuf', 'proto': 'protobuf',
        'pug': 'pug', 'jade': 'pug',
        'python': 'python', 'py': 'python', 'rpy': 'python', 'pyw': 'python', 'cpy': 'python', 'gyp': 'python', 'gypi': 'python',
        'qsharp': 'qsharp', 'qs': 'qsharp',
        'r': 'r', 'rhistory': 'r', 'rmd': 'r',
        'razor': 'razor', 'cshtml': 'razor', 'vbhtml': 'razor',
        'redis': 'redis',
        'redshift': 'redshift',
        'restructuredtext': 'restructuredtext', 'rst': 'restructuredtext',
        'ruby': 'ruby', 'rb': 'ruby', 'rbx': 'ruby', 'rjs': 'ruby', 'gemspec': 'ruby',
        'rust': 'rust', 'rs': 'rust', 'rlib': 'rust',
        'sb': 'sb',
        'scala': 'scala', 'sc': 'scala',
        'scheme': 'scheme', 'scm': 'scheme', 'ss': 'scheme',
        'scss': 'scss',
        'shell': 'shell', 'sh': 'shell', 'bash': 'shell', 'zsh': 'shell', 'fish': 'shell', 'ksh': 'shell',
        'sol': 'sol', 'solidity': 'sol',
        'sparql': 'sparql', 'rq': 'sparql',
        'sql': 'sql',
        'st': 'st',
        'swift': 'swift',
        'systemverilog': 'systemverilog', 'sv': 'systemverilog', 'svh': 'systemverilog',
        'tcl': 'tcl',
        'twig': 'twig',
        'typescript': 'typescript', 'ts': 'typescript', 'tsx': 'typescript',
        'vb': 'vb', 'vbnet': 'vb',
        'verilog': 'verilog', 'v': 'verilog', 'vh': 'verilog',
        'xml': 'xml', 'xaml': 'xml', 'dtd': 'xml', 'ascx': 'xml', 'csproj': 'xml', 'config': 'xml', 'wxi': 'xml', 'wxl': 'xml', 'wxs': 'xml', 'svg': 'xml',
        'yaml': 'yaml', 'yml': 'yaml',
        'json': 'json', 'lock': 'json',
        'txt': 'plaintext', 'plaintext': 'plaintext'
    };

    require.config({ paths: { 'vs': 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.44.0/min/vs' } });

    window.toggleCodeEditor = function() {
        if (window.innerWidth < 768) {
            window.showNavbarAlert('Editor tidak tersedia di mobile', 'info');
            return Promise.resolve();
        }

        isEditorOpen = !isEditorOpen;
        document.body.classList.toggle('vscode-active', isEditorOpen);

        if (vscodeBtn) {
            if (isEditorOpen) {
                vscodeBtn.classList.remove('bg-purple-900/10', 'text-purple-400', 'border-purple-800/30');
                vscodeBtn.classList.add('bg-purple-600', 'text-white', 'border-purple-400', 'shadow-[0_0_15px_rgba(147,51,234,0.5)]');
                window.showNavbarAlert('VS Code Diaktifkan', 'success');
            } else {
                vscodeBtn.classList.remove('bg-purple-600', 'text-white', 'border-purple-400', 'shadow-[0_0_15px_rgba(147,51,234,0.5)]');
                vscodeBtn.classList.add('bg-purple-900/10', 'text-purple-400', 'border-purple-800/30');
                window.showNavbarAlert('VS Code Dimatikan', 'info');
            }
        }

        if (isEditorOpen) {
            if (!initPromise) {
                initPromise = new Promise((resolve) => {
                    requestAnimationFrame(() => {
                        initCodeEditor().then(resolve);
                    });
                });
            }
            return initPromise.then(() => {
                const load = loadProjectFiles();
                if (monacoInstanceMain) {
                    setTimeout(() => monacoInstanceMain.layout(), 50);
                    setTimeout(() => monacoInstanceMain.layout(), 300);
                }
                return load;
            });
        } else {
            return Promise.resolve();
        }
    };

    window.sendToVSCode = async function(btn) {
        if (!isEditorOpen) await window.toggleCodeEditor();
        
        const encodedCode = btn.getAttribute('data-code');
        const langRaw = btn.getAttribute('data-lang') || 'plaintext';
        let code = decodeURIComponent(encodedCode);
        
        if (code) {
            code = code.replace(/^```[a-zA-Z0-9#+]*\n?/g, '').replace(/```\s*$/g, '');
        }
        
        let ext = 'txt';
        const normalizedLang = langRaw.toLowerCase();
        
        for (const [key, value] of Object.entries(languageMap)) {
            if (value === normalizedLang) {
                ext = key;
                break;
            }
        }
        
        const timestamp = Date.now();
        const filename = `AI_Code_${timestamp}.${ext}`;
        
        try {
            await saveFile(filename, code, normalizedLang);
            await loadProjectFiles();
            
            setTimeout(() => {
                const node = fileSystem.root.children[filename];
                if (node) {
                    openFile(filename, node.content, node.language);
                    window.showNavbarAlert(`File ${filename} dibuat`, 'success');
                }
            }, 100);
        } catch (e) {
            window.showNavbarAlert('Gagal membuat file otomatis', 'error');
        }
    };

    async function initCodeEditor() {
        if (editorWrapper) {
            const children = Array.from(editorWrapper.children);
            children.forEach(child => {
                if (child.id !== 'monaco-editor-root' && 
                   (child.innerText.includes('VS Code Editor') || child.querySelector('button'))) {
                    child.style.display = 'none';
                }
            });
            editorRoot.style.height = '100%';
        }

        if (monacoInstanceMain) {
            monacoInstanceMain.dispose();
            models = {};
        }
        
        editorRoot.innerHTML = '';

        const container = document.createElement('div');
        container.className = 'w-full h-full flex flex-col bg-black overflow-hidden select-none';
        
        container.innerHTML = `
            <div class="flex items-center justify-between bg-[#0a0a12] border-b border-[#333] h-[35px] px-0 flex-shrink-0">
                <div class="flex items-center h-full overflow-x-auto scrollbar-hide" id="editor-tabs"></div>
                <div class="flex items-center gap-2 px-3 bg-[#0a0a12] z-10 shadow-[-10px_0_10px_rgba(0,0,0,0.5)] border-l border-[#222]">
                    <button id="run-code-btn" onclick="window.runCode()" class="text-purple-400 hover:text-white hover:bg-purple-900/60 px-3 py-1 rounded text-[10px] font-bold flex items-center gap-1.5 transition-all border border-purple-900/30" title="Run Code (Ctrl+Enter)">
                        <i class="fas fa-play"></i> RUN
                    </button>
                    <button onclick="window.toggleExplorer()" class="text-gray-500 hover:text-white hover:bg-[#333] px-2 py-1 rounded transition-colors" title="Toggle Explorer">
                        <i class="fas fa-bars"></i>
                    </button>
                    <button onclick="window.toggleCodeEditor()" class="text-gray-500 hover:text-white hover:bg-[#333] px-2.5 py-1 rounded transition-colors ml-1" title="Close Editor">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>

            <div class="flex-1 flex overflow-hidden relative w-full h-full bg-black">
                <div class="flex-shrink-0 flex flex-col bg-[#050508] border-r border-[#333] relative group" id="file-explorer-sidebar" style="width: ${sidebarWidth}px;">
                    <div style="padding: 10px; font-weight: 800; color: #6b7280; font-size: 10px; letter-spacing: 1px; text-transform: uppercase; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #1a1a1a;">
                        <span>EXPLORER</span>
                        <div class="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onclick="window.showCreateModal()" class="hover:text-purple-400 text-gray-600 transition-colors" title="New File"><i class="fas fa-plus"></i></button>
                            <button onclick="window.refreshFiles()" class="hover:text-purple-400 text-gray-600 transition-colors" title="Refresh"><i class="fas fa-sync-alt"></i></button>
                        </div>
                    </div>
                    <div class="flex-1 overflow-y-auto scrollbar-hide p-1 relative" id="file-tree-root">
                        <div id="drag-overlay" class="absolute inset-0 bg-purple-900/20 border-2 border-dashed border-purple-500 hidden items-center justify-center pointer-events-none z-50">
                            <span class="text-purple-300 font-bold text-xs">Drop files here</span>
                        </div>
                    </div>
                    <div class="absolute right-0 top-0 bottom-0 w-[4px] cursor-col-resize hover:bg-purple-600 transition-colors z-20" id="sidebar-resizer"></div>
                </div>
                
                <div class="flex-1 flex flex-col relative h-full min-w-0 bg-black">
                    <div id="breadcrumbs" class="h-[20px] bg-[#0a0a12] border-b border-[#333] flex items-center px-4 text-[10px] text-gray-500 font-mono select-none"></div>
                    <div class="flex-1 relative w-full h-full flex">
                        <div id="monaco-container-main" class="flex-1 h-full relative"></div>
                    </div>
                </div>
            </div>

            <div id="editor-status-bar" class="h-[22px] bg-[#0a0a12] border-t border-[#333] text-gray-400 text-[10px] flex items-center px-3 justify-between select-none flex-shrink-0 z-20 font-mono">
                <div class="flex gap-4">
                    <span class="flex items-center gap-1.5"><i class="fas fa-code-branch text-purple-500"></i> main</span>
                    <span id="cursor-info">Ln 1, Col 1</span>
                </div>
                <div class="flex gap-4">
                    <span id="lang-display" class="cursor-pointer hover:text-white uppercase">PLAINTEXT</span>
                    <span>UTF-8</span>
                    <span id="save-status"><i class="fas fa-check"></i> Saved</span>
                </div>
            </div>
        `;
        editorRoot.appendChild(container);

        setupResizer();
        setupDragAndDrop();

        return new Promise((resolve) => {
            require(['vs/editor/editor.main'], function() {
                monaco.editor.defineTheme('dardcor-dark', {
                    base: 'vs-dark',
                    inherit: true,
                    rules: [
                        { background: '000000' },
                        { token: '', foreground: 'd4d4d4' },
                        { token: 'comment', foreground: '6a9955' },
                        { token: 'string', foreground: 'ce9178' },
                        { token: 'keyword', foreground: 'c586c0', fontStyle: 'bold' },
                        { token: 'number', foreground: 'b5cea8' },
                        { token: 'regexp', foreground: 'd16969' },
                        { token: 'operator', foreground: 'd4d4d4' },
                        { token: 'namespace', foreground: '4ec9b0' },
                        { token: 'type', foreground: '4ec9b0' },
                        { token: 'struct', foreground: '4ec9b0' },
                        { token: 'class', foreground: '4ec9b0' },
                        { token: 'interface', foreground: '4ec9b0' },
                        { token: 'enum', foreground: '4ec9b0' },
                        { token: 'type.identifier', foreground: '4ec9b0' },
                        { token: 'function', foreground: 'dcdcaa' },
                        { token: 'member', foreground: 'dcdcaa' },
                        { token: 'macro', foreground: 'c586c0' },
                        { token: 'variable', foreground: '9cdcfe' },
                        { token: 'variable.predefined', foreground: '4ec9b0' },
                        { token: 'variable.parameter', foreground: '9cdcfe' },
                        { token: 'identifier', foreground: '9cdcfe' },
                        { token: 'property', foreground: '9cdcfe' },
                        { token: 'enumMember', foreground: '4fc1ff' },
                        { token: 'constant', foreground: '4fc1ff' },
                        { token: 'delimiter', foreground: 'd4d4d4' },
                        { token: 'delimiter.parenthesis', foreground: 'ffd700' },
                        { token: 'delimiter.bracket', foreground: 'ffd700' },
                        { token: 'delimiter.square', foreground: 'ffd700' },
                        { token: 'tag', foreground: '569cd6' },
                        { token: 'attribute.name', foreground: '9cdcfe' },
                        { token: 'attribute.value', foreground: 'ce9178' }
                    ],
                    colors: {
                        'editor.background': '#000000',
                        'editor.foreground': '#d4d4d4',
                        'editor.lineHighlightBackground': '#111111',
                        'editorCursor.foreground': '#a855f7',
                        'editorWhitespace.foreground': '#333333',
                        'editorGutter.background': '#000000',
                        'editorLineNumber.foreground': '#444444',
                        'editorLineNumber.activeForeground': '#a855f7',
                        'editorIndentGuide.background': '#222222',
                        'editorIndentGuide.activeBackground': '#444444',
                        'editor.selectionBackground': '#264f78',
                        'editor.inactiveSelectionBackground': '#264f7880'
                    }
                });

                const options = {
                    value: '',
                    language: 'plaintext',
                    theme: 'dardcor-dark',
                    automaticLayout: true,
                    fontSize: 13,
                    lineHeight: 18,
                    fontFamily: "'JetBrains Mono', 'Consolas', 'Courier New', monospace",
                    fontLigatures: true,
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    padding: { top: 10, bottom: 10 },
                    lineNumbers: 'on',
                    lineNumbersMinChars: 3,
                    lineDecorationsWidth: 10,
                    glyphMargin: false,
                    folding: true,
                    renderIndentGuides: true,
                    wordWrap: 'off',
                    stickyScroll: { enabled: true },
                    smoothScrolling: true,
                    cursorBlinking: 'smooth',
                    scrollbar: {
                        vertical: 'auto',
                        horizontal: 'auto',
                        useShadows: true,
                        verticalScrollbarSize: 10,
                        horizontalScrollbarSize: 10
                    },
                    formatOnPaste: true,
                    formatOnType: true,
                    semanticHighlighting: { enabled: true }
                };

                monacoInstanceMain = monaco.editor.create(document.getElementById('monaco-container-main'), options);

                monacoInstanceMain.onDidChangeModelContent((e) => {
                    const model = monacoInstanceMain.getModel();
                    const currentFile = activeFileMain;
                    
                    if (model && !isCleaningContent) {
                        isCleaningContent = true;
                        let value = model.getValue();
                        let hasChanges = false;
                        
                        const firstLineMatch = value.match(/^```([a-zA-Z0-9#+]+)?\n?/);
                        if (firstLineMatch) {
                            const detectedLangTag = firstLineMatch[1];
                            value = value.replace(/^```([a-zA-Z0-9#+]+)?\n?/, '');
                            hasChanges = true;

                            if (detectedLangTag) {
                                let monacoLang = languageMap[detectedLangTag.toLowerCase()] || detectedLangTag.toLowerCase();
                                const currentLang = model.getLanguageId();
                                if (currentLang !== monacoLang) {
                                    monaco.editor.setModelLanguage(model, monacoLang);
                                    const displayEl = document.getElementById('lang-display');
                                    if (displayEl) displayEl.innerText = monacoLang.toUpperCase();
                                }
                            }
                        }

                        if (value.match(/`+$/)) {
                            value = value.replace(/```+$/g, '').replace(/``+$/g, '').replace(/`+$/g, '');
                            hasChanges = true;
                        } else if (value.match(/\n```+\s*$/)) {
                            value = value.replace(/\n```+\s*$/g, '');
                            hasChanges = true;
                        }

                        if (hasChanges) {
                            const pos = monacoInstanceMain.getPosition();
                            model.setValue(value);
                            if(pos) monacoInstanceMain.setPosition(pos);
                        }
                        
                        isCleaningContent = false;
                    }

                    if (currentFile && !e.isFlush && !isCleaningContent) {
                        unsavedFiles.add(currentFile);
                        updateTabStatus(currentFile);
                        updateStatusBar(false);
                        
                        const backupData = { content: model.getValue(), timestamp: Date.now() };
                        localStorage.setItem(`dardcor_backup_${currentFile}`, JSON.stringify(backupData));

                        if (autoSaveTimeouts[currentFile]) clearTimeout(autoSaveTimeouts[currentFile]);
                        autoSaveTimeouts[currentFile] = setTimeout(() => {
                            if (models[currentFile]) {
                                saveFile(currentFile, models[currentFile].getValue(), models[currentFile].getLanguageId(), true);
                                saveToHistory(currentFile, models[currentFile].getValue());
                            }
                        }, 1000);
                    }
                });

                monacoInstanceMain.onDidChangeCursorPosition((e) => {
                    document.getElementById('cursor-info').innerText = `Ln ${e.position.lineNumber}, Col ${e.position.column}`;
                });

                monacoInstanceMain.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
                    const currentFile = activeFileMain;
                    if (currentFile) {
                        updateFileContent(currentFile, monacoInstanceMain.getValue());
                        saveToHistory(currentFile, monacoInstanceMain.getValue());
                    }
                });

                monacoInstanceMain.addCommand(monaco.KeyMod.Shift | monaco.KeyMod.Alt | monaco.KeyCode.KeyF, () => {
                    monacoInstanceMain.getAction('editor.action.formatDocument').run();
                });

                monacoInstanceMain.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
                    window.runCode();
                });

                resolve();
            });
        });
    }

    function getFilenameFromModel(model) {
        return Object.keys(models).find(key => models[key] === model);
    }

    function setupResizer() {
        const resizer = document.getElementById('sidebar-resizer');
        const sidebar = document.getElementById('file-explorer-sidebar');
        if (!resizer || !sidebar) return;

        resizer.addEventListener('mousedown', (e) => {
            isResizingSidebar = true;
            document.body.style.cursor = 'col-resize';
            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (!isResizingSidebar) return;
            let newWidth = e.clientX - sidebar.getBoundingClientRect().left;
            if (newWidth < 150) newWidth = 150;
            if (newWidth > 400) newWidth = 400;
            sidebarWidth = newWidth;
            sidebar.style.width = `${newWidth}px`;
            if (monacoInstanceMain) monacoInstanceMain.layout();
        });

        document.addEventListener('mouseup', () => {
            if (isResizingSidebar) {
                isResizingSidebar = false;
                document.body.style.cursor = 'default';
            }
        });
    }

    function setupDragAndDrop() {
        const sidebar = document.getElementById('file-explorer-sidebar');
        const overlay = document.getElementById('drag-overlay');

        sidebar.addEventListener('dragover', (e) => {
            e.preventDefault();
            overlay.classList.remove('hidden');
            overlay.classList.add('flex');
        });

        sidebar.addEventListener('dragleave', (e) => {
            e.preventDefault();
            overlay.classList.add('hidden');
            overlay.classList.remove('flex');
        });

        sidebar.addEventListener('drop', (e) => {
            e.preventDefault();
            overlay.classList.add('hidden');
            overlay.classList.remove('flex');

            if (e.dataTransfer.items) {
                [...e.dataTransfer.items].forEach((item) => {
                    if (item.kind === 'file') {
                        const file = item.getAsFile();
                        const reader = new FileReader();
                        reader.onload = (event) => {
                            const ext = file.name.split('.').pop();
                            const lang = languageMap[ext] || 'plaintext';
                            let content = event.target.result;
                            if (content && typeof content === 'string') {
                                content = content.replace(/^```[a-zA-Z0-9#+]*\n?/g, '').replace(/```\s*$/g, '');
                            }
                            saveFile(file.name, content, lang).then(() => {
                                loadProjectFiles();
                            });
                        };
                        reader.readAsText(file);
                    }
                });
            }
        });
    }

    async function loadProjectFiles() {
        try {
            const res = await fetch('/api/project/files');
            if (res.status === 401) return;
            const data = await res.json();
            if (data.success) {
                fileSystem.root.children = {};
                data.files.forEach(f => {
                    fileSystem.root.children[f.name] = {
                        type: f.is_folder ? 'folder' : 'file',
                        name: f.name,
                        content: f.content || '',
                        language: f.language || 'plaintext',
                        updated_at: f.updated_at
                    };
                    const localBackup = localStorage.getItem(`dardcor_backup_${f.name}`);
                    if (localBackup) {
                        try {
                            const parsed = JSON.parse(localBackup);
                            if (parsed.timestamp > new Date(f.updated_at).getTime()) {
                                fileSystem.root.children[f.name].content = parsed.content;
                                unsavedFiles.add(f.name);
                            }
                        } catch(e) {}
                    }
                });
                renderFileTree();
                renderTabs();
            }
        } catch (e) {}
    }

    function renderFileTree() {
        const rootEl = document.getElementById('file-tree-root');
        if (!rootEl) return;
        const dragOverlay = document.getElementById('drag-overlay');
        rootEl.innerHTML = '';
        rootEl.appendChild(dragOverlay);
        
        const files = Object.values(fileSystem.root.children).sort((a, b) => {
            if (a.type === b.type) return a.name.localeCompare(b.name);
            return a.type === 'folder' ? -1 : 1;
        });

        if (files.length === 0) {
            const emptyMsg = document.createElement('div');
            emptyMsg.className = 'text-center text-gray-700 text-[9px] mt-4 italic';
            emptyMsg.innerText = 'No files';
            rootEl.appendChild(emptyMsg);
        }

        const buildTree = (container, fileList, level = 0) => {
            fileList.forEach(node => {
                const el = document.createElement('div');
                const isActive = activeFileMain === node.name;
                const isUnsaved = unsavedFiles.has(node.name);
                const iconClass = getFileIcon(node.name);
                
                el.className = `flex items-center gap-2 px-3 py-1.5 cursor-pointer text-xs mb-0.5 border-l-[3px] select-none transition-all group relative ${isActive ? 'bg-[#151515] text-white border-purple-600' : 'text-gray-500 border-transparent hover:bg-[#111] hover:text-gray-300'}`;
                el.style.paddingLeft = `${12 + (level * 10)}px`;
                el.innerHTML = `
                    <i class="${iconClass} text-[11px] w-4 text-center"></i> 
                    <span class="truncate flex-1 font-mono text-[11px]">${node.name}</span>
                    ${isUnsaved ? '<div class="w-1.5 h-1.5 rounded-full bg-purple-500 ml-1 shadow-[0_0_5px_#a855f7]"></div>' : ''}
                `;
                
                el.onclick = () => openFile(node.name, node.content, node.language);
                el.oncontextmenu = (e) => showContextMenu(e, node.name);
                
                container.appendChild(el);
            });
        };

        buildTree(rootEl, files);
        
        rootEl.oncontextmenu = (e) => {
            if (e.target === rootEl) showGlobalContextMenu(e);
        };
    }

    function renderBreadcrumbs(filename) {
        const breadcrumbs = document.getElementById('breadcrumbs');
        if(breadcrumbs) {
            breadcrumbs.innerHTML = `<span class="text-purple-500 font-bold">root</span> <span class="mx-1 text-gray-600">/</span> <span class="text-gray-300">${filename}</span>`;
        }
    }

    function saveToHistory(filename, content) {
        let history = JSON.parse(localStorage.getItem(`dardcor_hist_${filename}`) || '[]');
        if (history.length > 0 && history[0].content === content) return;
        history.unshift({ timestamp: Date.now(), content: content });
        if (history.length > 20) history.pop();
        localStorage.setItem(`dardcor_hist_${filename}`, JSON.stringify(history));
    }

    window.openFile = function(filename, content, lang) {
        if (!monacoInstanceMain) return;

        if (activeFileMain && activeFileMain !== filename && unsavedFiles.has(activeFileMain)) {
             const prevModel = models[activeFileMain];
             if(prevModel) saveFile(activeFileMain, prevModel.getValue(), prevModel.getLanguageId(), true);
        }

        if (typeof content === 'string') {
            content = content.replace(/^```[a-zA-Z0-9#+]*\n?/g, '').replace(/```\s*$/, '');
        }

        const ext = filename.split('.').pop();
        const detectedLang = lang || languageMap[ext] || 'plaintext';

        if (!models[filename]) {
            models[filename] = monaco.editor.createModel(content || '', detectedLang);
        } else {
            if (content) {
                const currentVal = models[filename].getValue();
                if (currentVal !== content) models[filename].setValue(content);
            }
            monaco.editor.setModelLanguage(models[filename], detectedLang);
        }

        if (!fileSystem.root.children[filename]) {
            fileSystem.root.children[filename] = { 
                type: 'file', 
                name: filename, 
                content: content || '', 
                language: detectedLang, 
                updated_at: new Date().toISOString() 
            };
            saveFile(filename, content || '', detectedLang, true);
        }

        if (!openFiles.includes(filename)) {
            openFiles.push(filename);
        }

        activeFileMain = filename;
        monacoInstanceMain.setModel(models[filename]);
        monacoInstanceMain.focus();
        
        const langId = models[filename].getLanguageId();
        const displayEl = document.getElementById('lang-display');
        if (displayEl) displayEl.innerText = langId.toUpperCase();
        
        renderBreadcrumbs(filename);
        updateStatusBar(unsavedFiles.has(filename) ? false : true);
        renderTabs();
        renderFileTree();
    };

    function renderTabs() {
        const tabsContainer = document.getElementById('editor-tabs');
        if (!tabsContainer) return;
        tabsContainer.innerHTML = '';
        
        openFiles.forEach(filename => {
            const isActive = filename === activeFileMain;
            const isUnsaved = unsavedFiles.has(filename);
            const iconClass = getFileIcon(filename);
            
            const tab = document.createElement('div');
            tab.className = `flex-shrink-0 h-full flex items-center gap-2 px-3 border-r border-[#333] cursor-pointer select-none text-[11px] min-w-[120px] max-w-[180px] group relative ${isActive ? 'bg-black text-white border-t-[2px] border-t-purple-600' : 'bg-[#0a0a12] text-gray-500 border-t-[2px] border-t-transparent hover:bg-[#111]'}`;
            
            tab.innerHTML = `
                <i class="${iconClass} text-[10px] opacity-70"></i>
                <span class="truncate flex-1 font-medium font-mono">${filename}</span>
                <div class="close-icon-wrapper w-4 h-4 flex items-center justify-center rounded hover:bg-white/10 ml-1">
                    ${isUnsaved 
                        ? `<div class="w-1.5 h-1.5 rounded-full bg-white group-hover:hidden"></div><i class="fas fa-times text-[9px] hidden group-hover:block" onclick="window.closeFile(event, '${filename}')"></i>` 
                        : `<i class="fas fa-times text-[9px] opacity-0 group-hover:opacity-100 text-gray-400 hover:text-white" onclick="window.closeFile(event, '${filename}')"></i>`
                    }
                </div>
            `;
            
            tab.onclick = (e) => {
                if(!e.target.classList.contains('fa-times')) {
                    const node = fileSystem.root.children[filename];
                    if (node) openFile(filename, node.content, node.language);
                }
            };
            
            tab.oncontextmenu = (e) => showContextMenu(e, filename);
            tabsContainer.appendChild(tab);
        });
    }

    window.closeFile = function(e, filename) {
        if (e) e.stopPropagation();
        if (unsavedFiles.has(filename)) {
            showDialog('confirm', 'Tutup File?', `File "${filename}" belum disimpan. Perubahan akan hilang.`, () => {
                forceCloseFile(filename);
            });
        } else {
            forceCloseFile(filename);
        }
    };

    function forceCloseFile(filename) {
        unsavedFiles.delete(filename);
        localStorage.removeItem(`dardcor_backup_${filename}`);
        openFiles = openFiles.filter(f => f !== filename);
        if (models[filename]) {
            models[filename].dispose();
            delete models[filename];
        }
        if (activeFileMain === filename) {
            if (openFiles.length > 0) {
                const lastFile = openFiles[openFiles.length - 1];
                const node = fileSystem.root.children[lastFile];
                openFile(lastFile, node.content, node.language);
            } else {
                activeFileMain = null;
                monacoInstanceMain.setModel(monaco.editor.createModel('', 'plaintext'));
                document.getElementById('lang-display').innerText = 'PLAINTEXT';
                updateStatusBar(true);
            }
        }
        renderTabs();
        renderFileTree();
    }

    function updateTabStatus(filename) {
        renderTabs();
        renderFileTree();
    }

    function updateStatusBar(saved) {
        const el = document.getElementById('save-status');
        if (el) {
            el.innerHTML = saved ? '<i class="fas fa-check"></i> Saved' : '<i class="fas fa-circle text-[6px] text-purple-500 shadow-[0_0_5px_#a855f7]"></i> Unsaved';
            el.className = saved ? 'text-gray-500 text-[10px]' : 'text-purple-400 font-bold text-[10px]';
        }
    }

    async function saveFile(name, content, language, silent = false) {
        if (typeof content === 'string') {
            content = content.replace(/^```[a-zA-Z0-9#+]*\n?/g, '').replace(/```\s*$/, '');
        }
        try {
            fileSystem.root.children[name] = { type: 'file', name, content, language, updated_at: new Date().toISOString() };
            await fetch('/api/project/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, content, language, path: 'root' })
            });
            unsavedFiles.delete(name);
            localStorage.removeItem(`dardcor_backup_${name}`);
            updateStatusBar(true);
            renderTabs();
            renderFileTree();
            if (!silent) window.showNavbarAlert('File disimpan', 'success');
        } catch (e) {
            if (!silent) window.showNavbarAlert('Gagal menyimpan file', 'error');
        }
    }

    function updateFileContent(name, content) {
        if (fileSystem.root.children[name]) {
            fileSystem.root.children[name].content = content;
            const node = fileSystem.root.children[name];
            saveFile(name, content, node.language);
        }
    }

    window.runCode = function() {
        if (!activeFileMain) {
            window.showNavbarAlert('Buka file terlebih dahulu', 'info');
            return;
        }
        
        const node = fileSystem.root.children[activeFileMain];
        if (!node) return;

        const runBtn = document.getElementById('run-code-btn');
        const originalBtnContent = runBtn.innerHTML;
        
        runBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> RUNNING...';
        runBtn.disabled = true;
        runBtn.classList.add('opacity-50', 'cursor-not-allowed');

        const restoreBtn = () => {
            setTimeout(() => {
                runBtn.innerHTML = originalBtnContent;
                runBtn.disabled = false;
                runBtn.classList.remove('opacity-50', 'cursor-not-allowed');
            }, 800);
        };

        let codeToRun = monacoInstanceMain.getValue();
        const lang = node.language;

        if (lang === 'html' || lang === 'php') {
            const overlay = document.getElementById('diagram-overlay');
            const frame = document.getElementById('diagram-frame');
            
            let finalHtml = codeToRun;
            
            const cssFiles = Object.values(fileSystem.root.children).filter(f => f.name.endsWith('.css'));
            let cssBlock = '';
            cssFiles.forEach(css => { cssBlock += `<style>\n${css.content}\n</style>\n`; });
            
            const jsFiles = Object.values(fileSystem.root.children).filter(f => f.name.endsWith('.js'));
            let jsBlock = '';
            jsFiles.forEach(js => { jsBlock += `<script>\n${js.content}\n</script>\n`; });

            const doc = new DOMParser().parseFromString(finalHtml, 'text/html');
            
            if (cssBlock) {
                const head = doc.head || doc.createElement('head');
                if (!doc.head) doc.documentElement.insertBefore(head, doc.body);
                head.insertAdjacentHTML('beforeend', cssBlock);
            }
            
            if (jsBlock) {
                const body = doc.body || doc.createElement('body');
                if (!doc.body) doc.documentElement.appendChild(body);
                body.insertAdjacentHTML('beforeend', jsBlock);
            }

            const blob = new Blob([doc.documentElement.outerHTML], { type: 'text/html' });
            if (frame) {
                frame.src = URL.createObjectURL(blob);
                if (overlay) overlay.classList.remove('hidden');
            }
        } else if (lang === 'javascript') {
            try {
                new Function(codeToRun)();
                window.showNavbarAlert('JS Executed (Check Console)', 'success');
            } catch (e) {
                window.showNavbarAlert('JS Runtime Error', 'error');
                console.error(e);
            }
        } else {
            window.showNavbarAlert('Preview hanya tersedia untuk HTML/JS', 'info');
        }
        
        restoreBtn();
    };

    window.toggleExplorer = function() {
        const sidebar = document.getElementById('file-explorer-sidebar');
        if (sidebar) {
            sidebar.classList.toggle('hidden');
            if (monacoInstanceMain) setTimeout(() => monacoInstanceMain.layout(), 50);
        }
    };

    window.refreshFiles = function() {
        loadProjectFiles();
        window.showNavbarAlert('File list refreshed', 'success');
    };

    function createModalHTML() {
        if(document.getElementById('editor-modal-container')) return;
        const div = document.createElement('div');
        div.id = 'editor-modal-container';
        div.className = 'fixed inset-0 z-[10000] hidden items-center justify-center bg-black/90 backdrop-blur-sm';
        div.innerHTML = `
            <div class="bg-[#0a0a12] border border-[#333] rounded-xl shadow-2xl w-[350px] overflow-hidden transform scale-95 transition-all" id="editor-modal-content">
                <div class="px-4 py-3 border-b border-[#333] flex justify-between items-center bg-[#0a0a12]">
                    <h3 class="text-xs font-bold text-gray-300 uppercase tracking-wider" id="editor-modal-title">Title</h3>
                    <button onclick="window.closeEditorModal()" class="text-gray-500 hover:text-white transition-colors"><i class="fas fa-times"></i></button>
                </div>
                <div class="p-5">
                    <div id="editor-modal-body" class="text-xs text-gray-400 mb-4 leading-relaxed"></div>
                    <input id="editor-modal-input" class="w-full bg-[#000] border border-[#333] text-white px-3 py-2.5 rounded-lg text-xs focus:border-purple-600 outline-none hidden placeholder-gray-600 font-mono" autocomplete="off">
                </div>
                <div class="px-4 py-3 bg-[#0a0a12] border-t border-[#333] flex justify-end gap-2">
                    <button onclick="window.closeEditorModal()" class="px-3 py-1.5 text-xs text-gray-400 hover:text-white hover:bg-[#222] rounded transition-colors">Cancel</button>
                    <button id="editor-modal-confirm" class="px-4 py-1.5 text-xs bg-purple-900/50 text-purple-300 border border-purple-700/50 hover:bg-purple-800 hover:text-white rounded transition-all font-bold shadow-lg">Confirm</button>
                </div>
            </div>
        `;
        document.body.appendChild(div);
    }

    window.closeEditorModal = function() {
        const container = document.getElementById('editor-modal-container');
        if (container) container.classList.add('hidden');
    };

    function showDialog(type, title, messageOrValue, callback) {
        createModalHTML();
        const container = document.getElementById('editor-modal-container');
        const titleEl = document.getElementById('editor-modal-title');
        const bodyEl = document.getElementById('editor-modal-body');
        const inputEl = document.getElementById('editor-modal-input');
        const confirmBtn = document.getElementById('editor-modal-confirm');

        titleEl.innerText = title;
        container.classList.remove('hidden');
        container.classList.add('flex');
        
        const newBtn = confirmBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(newBtn, confirmBtn);

        if (type === 'prompt') {
            bodyEl.innerText = "";
            inputEl.value = messageOrValue;
            inputEl.classList.remove('hidden');
            inputEl.focus();
            inputEl.select();
            newBtn.onclick = () => {
                if (inputEl.value.trim()) {
                    callback(inputEl.value.trim());
                    window.closeEditorModal();
                }
            };
            inputEl.onkeydown = (e) => { if(e.key === 'Enter') newBtn.click(); };
        } else {
            bodyEl.innerText = messageOrValue;
            inputEl.classList.add('hidden');
            newBtn.onclick = () => {
                callback();
                window.closeEditorModal();
            };
        }
    }

    window.showCreateModal = function() {
        showDialog('prompt', 'NEW FILE', '', (name) => {
            if (fileSystem.root.children[name]) {
                window.showNavbarAlert('File sudah ada', 'error');
                return;
            }
            if (!/^[a-zA-Z0-9._-]+$/.test(name)) {
                window.showNavbarAlert('Karakter tidak valid', 'error');
                return;
            }
            const ext = name.split('.').pop();
            const lang = languageMap[ext] || 'plaintext';
            saveFile(name, '', lang).then(() => {
                loadProjectFiles();
                setTimeout(() => openFile(name, '', lang), 200);
            });
        });
    };

    window.renameFileUI = function(oldName) {
        showDialog('prompt', 'RENAME FILE', oldName, async (newName) => {
            if (newName === oldName) return;
            if (fileSystem.root.children[newName]) {
                window.showNavbarAlert('Nama file sudah ada', 'error');
                return;
            }
            const node = fileSystem.root.children[oldName];
            await saveFile(newName, node.content, node.language);
            await deleteFileInternal(oldName);
            if (activeFileMain === oldName) activeFileMain = newName;
            const idx = openFiles.indexOf(oldName);
            if (idx !== -1) openFiles[idx] = newName;
            loadProjectFiles();
        });
    };

    window.deleteFileUI = function(name) {
        showDialog('confirm', 'DELETE FILE', `Hapus permanen file "${name}"?`, () => {
            deleteFileInternal(name);
        });
    };

    window.downloadFileUI = function(name) {
        const node = fileSystem.root.children[name];
        if (!node) return;
        const blob = new Blob([node.content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    window.showHistoryUI = function(filename) {
        const history = JSON.parse(localStorage.getItem(`dardcor_hist_${filename}`) || '[]');
        if (history.length === 0) {
            window.showNavbarAlert('No history available', 'info');
            return;
        }
        
        let msg = '<div class="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-2">';
        history.forEach((h, i) => {
            const date = new Date(h.timestamp).toLocaleString();
            msg += `<div class="p-2 border border-[#333] rounded hover:bg-[#222] cursor-pointer flex justify-between items-center" onclick="window.restoreHistory('${filename}', ${i})">
                <span class="text-[10px] text-gray-400">${date}</span>
                <span class="text-[9px] bg-purple-900/40 text-purple-300 px-1 rounded">Restore</span>
            </div>`;
        });
        msg += '</div>';
        
        createModalHTML();
        const container = document.getElementById('editor-modal-container');
        const titleEl = document.getElementById('editor-modal-title');
        const bodyEl = document.getElementById('editor-modal-body');
        const inputEl = document.getElementById('editor-modal-input');
        const confirmBtn = document.getElementById('editor-modal-confirm');

        titleEl.innerText = `HISTORY: ${filename}`;
        bodyEl.innerHTML = msg;
        inputEl.classList.add('hidden');
        confirmBtn.classList.add('hidden');
        container.classList.remove('hidden');
        container.classList.add('flex');
    };

    window.restoreHistory = function(filename, index) {
        const history = JSON.parse(localStorage.getItem(`dardcor_hist_${filename}`) || '[]');
        if (history[index]) {
            const content = history[index].content;
            if (models[filename]) {
                models[filename].setValue(content);
                updateFileContent(filename, content);
                window.showNavbarAlert('Version restored', 'success');
                window.closeEditorModal();
            }
        }
    };

    async function deleteFileInternal(name) {
        try {
            delete fileSystem.root.children[name];
            await fetch('/api/project/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, path: 'root' })
            });
            if (openFiles.includes(name)) window.closeFile(null, name);
            if (models[name]) { models[name].dispose(); delete models[name]; }
            unsavedFiles.delete(name);
            localStorage.removeItem(`dardcor_backup_${name}`);
            renderFileTree();
            window.showNavbarAlert('File berhasil dihapus', 'success');
        } catch (e) {
            window.showNavbarAlert('Gagal menghapus file', 'error');
        }
    }

    function showContextMenu(e, filename) {
        e.preventDefault();
        e.stopPropagation();
        const oldMenu = document.querySelector('.context-menu');
        if (oldMenu) oldMenu.remove();

        let top = e.clientY;
        let left = e.clientX;
        
        if (top + 150 > window.innerHeight) top = window.innerHeight - 160;

        const menu = document.createElement('div');
        menu.className = 'context-menu fixed bg-[#0a0a12] border border-[#333] rounded-lg shadow-2xl py-1.5 z-[99999] min-w-[140px]';
        menu.style.left = `${left}px`;
        menu.style.top = `${top}px`;
        
        menu.innerHTML = `
            <div class="px-3 py-2 text-[11px] text-gray-300 hover:bg-purple-900/40 hover:text-white cursor-pointer flex items-center gap-2.5 transition-colors" onclick="window.renameFileUI('${filename}'); this.parentElement.remove()">
                <i class="fas fa-edit w-3 text-center"></i> Rename
            </div>
            <div class="px-3 py-2 text-[11px] text-gray-300 hover:bg-purple-900/40 hover:text-white cursor-pointer flex items-center gap-2.5 transition-colors" onclick="window.showHistoryUI('${filename}'); this.parentElement.remove()">
                <i class="fas fa-history w-3 text-center"></i> History
            </div>
            <div class="px-3 py-2 text-[11px] text-gray-300 hover:bg-purple-900/40 hover:text-white cursor-pointer flex items-center gap-2.5 transition-colors" onclick="window.downloadFileUI('${filename}'); this.parentElement.remove()">
                <i class="fas fa-download w-3 text-center"></i> Download
            </div>
            <div class="h-[1px] bg-[#333] my-1 mx-2"></div>
            <div class="px-3 py-2 text-[11px] text-red-400 hover:bg-red-900/20 hover:text-red-300 cursor-pointer flex items-center gap-2.5 transition-colors" onclick="window.deleteFileUI('${filename}'); this.parentElement.remove()">
                <i class="fas fa-trash w-3 text-center"></i> Delete
            </div>
        `;
        document.body.appendChild(menu);
        
        const closeMenu = () => { if(menu.parentElement) menu.remove(); document.removeEventListener('click', closeMenu); };
        setTimeout(() => document.addEventListener('click', closeMenu), 10);
    }

    function showGlobalContextMenu(e) {
        e.preventDefault();
        const oldMenu = document.querySelector('.context-menu');
        if (oldMenu) oldMenu.remove();

        const menu = document.createElement('div');
        menu.className = 'context-menu fixed bg-[#0a0a12] border border-[#333] rounded-lg shadow-2xl py-1.5 z-[99999] min-w-[140px]';
        menu.style.left = `${e.clientX}px`;
        menu.style.top = `${e.clientY}px`;
        
        menu.innerHTML = `
            <div class="px-3 py-2 text-[11px] text-gray-300 hover:bg-purple-900/40 hover:text-white cursor-pointer flex items-center gap-2.5 transition-colors" onclick="window.showCreateModal(); this.parentElement.remove()">
                <i class="fas fa-file-plus w-3 text-center"></i> New File
            </div>
            <div class="px-3 py-2 text-[11px] text-gray-300 hover:bg-purple-900/40 hover:text-white cursor-pointer flex items-center gap-2.5 transition-colors" onclick="window.refreshFiles(); this.parentElement.remove()">
                <i class="fas fa-sync w-3 text-center"></i> Refresh
            </div>
        `;
        document.body.appendChild(menu);
        
        const closeMenu = () => { if(menu.parentElement) menu.remove(); document.removeEventListener('click', closeMenu); };
        setTimeout(() => document.addEventListener('click', closeMenu), 10);
    }

    function getFileIcon(filename) {
        const ext = filename.split('.').pop().toLowerCase();
        if (ext === 'js') return 'fab fa-js text-yellow-400';
        if (ext === 'jsx') return 'fab fa-react text-blue-400';
        if (ext === 'ts' || ext === 'tsx') return 'fab fa-js text-blue-500';
        if (ext === 'html' || ext === 'ejs') return 'fab fa-html5 text-orange-600';
        if (ext === 'css') return 'fab fa-css3-alt text-blue-500';
        if (ext === 'json') return 'fas fa-code text-yellow-200';
        if (ext === 'py') return 'fab fa-python text-blue-300';
        if (ext === 'php') return 'fab fa-php text-purple-400';
        if (ext === 'java') return 'fab fa-java text-red-500';
        if (ext === 'sql') return 'fas fa-database text-pink-400';
        if (ext === 'md') return 'fab fa-markdown text-white';
        if (['png', 'jpg', 'jpeg', 'gif', 'svg'].includes(ext)) return 'fas fa-image text-green-400';
        if (['zip', 'rar', '7z', 'tar'].includes(ext)) return 'fas fa-file-archive text-yellow-600';
        return 'fas fa-file text-gray-500';
    }

    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            if (isEditorOpen && activeFileMain) {
                const content = monacoInstanceMain.getValue();
                updateFileContent(activeFileMain, content);
                saveToHistory(activeFileMain, content);
                window.showNavbarAlert('File disimpan', 'success');
            }
        }
    });
});