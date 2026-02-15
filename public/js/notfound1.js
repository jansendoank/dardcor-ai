document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        document.documentElement.classList.remove('no-transition');
    }, 300);

    const serverData = window.SERVER_DATA || {};
    let currentToolType = 'basic';
    let currentUtterance = null;
    let chatToEdit = null;
    let chatToDelete = null;
    let selectedFiles = [];
    let isSending = false;
    let abortController = null;
    let isChatLoading = false;
    let userIsScrolling = false;
    let loadingTimeout = null;
    let isSearchEnabled = false;
    let recognition = null;

    const chatContainer = document.getElementById('chat-container');
    const messageInput = document.getElementById('message-input');
    const messageList = document.getElementById('message-list');
    const fileInput = document.getElementById('file-upload');
    const fileUploadBtn = document.getElementById('file-upload-btn');
    const filePreviewContainer = document.getElementById('file-preview-container');
    const dropZone = document.getElementById('drop-zone');
    const sendBtn = document.getElementById('send-btn');
    const sendIcon = document.getElementById('send-icon');
    const micBtn = document.getElementById('mic-btn');
    const searchBtn = document.getElementById('search-btn');

    document.addEventListener('click', (e) => {
        const link = e.target.closest('a');
        if (link) {
            const href = link.getAttribute('href');
            if (href && href.startsWith('/dardcorchat/dardcor-ai/')) {
                const parts = href.split('/');
                const id = parts[parts.length - 1];
                if (id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
                    e.preventDefault();
                    window.loadChat(id);
                }
            }
        }

        const menu = document.getElementById('tools-menu');
        const btn = document.getElementById('tools-btn');
        if (menu && !menu.classList.contains('hidden')) {
            if (btn && btn.contains(e.target)) return;
            if (!menu.contains(e.target)) {
                menu.classList.add('hidden');
                menu.classList.remove('flex');
            }
        }
    });

    window.checkAuth = function(response) {
        if (response.status === 401) {
            window.location.reload();
            return false;
        }
        return true;
    };

    function escapeHtml(text) {
        if (!text || typeof text !== 'string') return '';
        return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    }

    function parseMessageContent(text) {
        if (!text) return {
            answer: ''
        };
        const safeText = String(text).replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
        let cleanText = safeText;
        while (cleanText.includes('<think>') || cleanText.includes('</think>')) {
            cleanText = cleanText.replace(/<think>[\s\S]*?<\/think>/gi, '');
            cleanText = cleanText.replace(/<think>/gi, '');
            cleanText = cleanText.replace(/<\/think>/gi, '');
        }
        cleanText = cleanText.trim();
        return {
            answer: cleanText
        };
    }

    let dardcorLinkCache = [];

    function forceDardcorLinks(text) {
        if (!text) return "";
        dardcorLinkCache = [];

        text = text.replace(/(?<!\!)\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g, (match, title, url) => {
            const id = `DARDCORLINKTOKEN${dardcorLinkCache.length}END`;
            dardcorLinkCache.push({
                url: url.trim(),
                title: title.trim()
            });
            return id;
        });

        text = text.replace(/(https?:\/\/[^\s<)"'`]+)/g, (match) => {
            if (match.includes('DARDCORLINKTOKEN')) return match;
            const id = `DARDCORLINKTOKEN${dardcorLinkCache.length}END`;
            dardcorLinkCache.push({
                url: match.trim(),
                title: match.trim()
            });
            return id;
        });

        return text;
    }

    function restoreDardcorLinks(html) {
        if (!html) return "";
        return html.replace(/DARDCORLINKTOKEN(\d+)END/g, (match, index) => {
            const data = dardcorLinkCache[parseInt(index)];
            if (!data) return match;
            return `<a href="${data.url}" target="_blank" rel="noopener noreferrer" class="text-purple-400 hover:text-purple-300 font-bold underline decoration-purple-400/50 hover:decoration-purple-300 transition-all break-all inline-flex items-center gap-1">${data.title} <i class="fas fa-external-link-alt text-[8px] ml-0.5 opacity-70"></i></a>`;
        });
    }

    function balanceMarkdown(text) {
        if (!text) return "";
        const codeBlockCount = (text.match(/```/g) || []).length;
        if (codeBlockCount % 2 !== 0) text += "\n```";
        return text;
    }

    function safeMarkdownParse(text) {
        try {
            if (!text || typeof text !== 'string') return '';

            const strictEscapeForLeak = (str) => {
                if (!str) return '';
                return str.replace(/<script/gi, '&lt;script')
                    .replace(/<\/script>/gi, '&lt;/script&gt;')
                    .replace(/<iframe/gi, '&lt;iframe')
                    .replace(/<\/iframe>/gi, '&lt;/iframe&gt;')
                    .replace(/<object/gi, '&lt;object')
                    .replace(/<\/object>/gi, '&lt;/object&gt;')
                    .replace(/<embed/gi, '&lt;embed');
            };

            let processed = balanceMarkdown(text);
            if (window.protectCode) processed = window.protectCode(processed);
            if (window.forceTableStructure) processed = window.forceTableStructure(processed);
            processed = forceDardcorLinks(processed);
            processed = strictEscapeForLeak(processed);
            if (window.protectMath) processed = window.protectMath(processed);
            if (window.restoreCode) processed = window.restoreCode(processed);

            if (typeof marked !== 'undefined') {
                let html = marked.parse(processed, { async: false });
                
                if (typeof html === 'object' || html instanceof Promise) {
                    return escapeHtml(text);
                }

                if (typeof html !== 'string') {
                    html = String(html || '');
                }

                html = html.replace(/<table/g, '<div class="table-wrapper"><table');
                html = html.replace(/<\/table>/g, '</table></div>');
                
                if (window.recoverBrokenTables) html = window.recoverBrokenTables(html);
                
                html = restoreDardcorLinks(html);
                if (window.restoreMath) html = window.restoreMath(html);
                
                return html;
            }
            return escapeHtml(text);
        } catch (e) {
            console.error("Markdown Error:", e);
            return escapeHtml(text);
        }
    }

    function injectEditButtonsOnLoad() {
        const userBubbles = document.querySelectorAll('.message-bubble-container');
        userBubbles.forEach(container => {
            if (container.classList.contains('justify-end')) {
                let actionDiv = container.querySelector('.flex.items-center.gap-3');
                if (!actionDiv) {
                    actionDiv = document.createElement('div');
                    actionDiv.className = "flex items-center gap-3 mt-1 px-1 select-none opacity-50 group-hover:opacity-100 transition-opacity";
                    const flexCol = container.querySelector('.flex.flex-col');
                    if (flexCol) flexCol.appendChild(actionDiv);
                }
                if (actionDiv) {
                    let editBtn = actionDiv.querySelector('button[title="Edit Pesan"]');
                    let copyBtn = actionDiv.querySelector('button[title="Salin Pesan"]');
                    if (!editBtn) {
                        editBtn = document.createElement('button');
                        editBtn.onclick = function() {
                            window.editMessage(this);
                        };
                        editBtn.className = "text-[10px] font-medium bg-transparent border-none p-0 text-gray-500 hover:text-white flex items-center gap-1.5 transition-colors";
                        editBtn.title = "Edit Pesan";
                        editBtn.innerHTML = '<i class="fas fa-edit"></i> Edit';
                    }
                    if (!copyBtn) {
                        copyBtn = document.createElement('button');
                        copyBtn.onclick = function() {
                            window.copyMessageBubble(this);
                        };
                        copyBtn.className = "text-[10px] font-medium bg-transparent border-none p-0 text-gray-500 hover:text-white flex items-center gap-1.5 transition-colors";
                        copyBtn.title = "Salin Pesan";
                        copyBtn.innerHTML = '<i class="fas fa-copy"></i> Salin';
                    }
                    actionDiv.prepend(copyBtn);
                    actionDiv.prepend(editBtn);
                }
            }
        });
    }

    setTimeout(injectEditButtonsOnLoad, 500);

    if (typeof marked !== 'undefined') {
        const renderer = new marked.Renderer();

        renderer.link = function(href, title, text) {
            return `<a href="${href}" target="_blank" class="text-purple-400 hover:text-purple-300 hover:underline break-all font-bold inline-flex items-center gap-1">${text} <i class="fas fa-external-link-alt text-[8px] ml-0.5 opacity-70"></i></a>`;
        };

        if (window.renderCodeTerminal) {
            renderer.code = window.renderCodeTerminal;
        }

        renderer.html = function(html) {
            if (html.trim() === '<br>') return '<br>';
            if (html.trim() === '<hr>') return '<hr>';
            if (html.trim().startsWith('<img')) return html;
            return renderer.code(html, 'html');
        };

        renderer.image = function(href, title, text) {
            return `<img src="${href}" alt="${text}" style="border-radius: 8px; max-width: 100%; height: auto; display: block;">`;
        };

        marked.setOptions({
            renderer: renderer,
            gfm: true,
            breaks: true,
            sanitize: false
        });
    }

    function resetChatState() {
        if (loadingTimeout) clearTimeout(loadingTimeout);
        isChatLoading = false;
        if (isSending && abortController) {
            abortController.abort();
            isSending = false;
            abortController = null;
            if (sendIcon) sendIcon.classList.replace('fa-stop', 'fa-paper-plane');
            const indicator = document.getElementById('loading-indicator');
            if (indicator) indicator.remove();
        }
        selectedFiles.forEach(f => {
            if (f instanceof File && f.type.startsWith('image/')) {
                URL.revokeObjectURL(f);
            }
        });
        selectedFiles = [];
        updateFilePreviews();
        if (messageInput) {
            messageInput.value = '';
            messageInput.style.height = 'auto';
        }
    }

    const refreshBtn = document.getElementById('refresh-chat-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const icon = document.getElementById('refresh-icon');
            if (icon) icon.classList.add('fa-spin');
            setTimeout(() => window.location.reload(), 300);
        });
    }

    function getFileIconClass(mimetype, filename) {
        if (!mimetype) mimetype = "";
        if (!filename) filename = "";
        mimetype = mimetype.toLowerCase();
        filename = filename.toLowerCase();
        if (mimetype.includes('pdf')) return 'fa-file-pdf text-red-400';
        if (mimetype.includes('word') || mimetype.includes('document')) return 'fa-file-word text-blue-400';
        if (mimetype.includes('excel') || mimetype.includes('sheet') || mimetype.includes('csv')) return 'fa-file-excel text-green-400';
        if (mimetype.includes('presentation') || mimetype.includes('powerpoint') || mimetype.includes('ppt') || filename.endsWith('.pptx') || filename.endsWith('.ppt')) return 'fa-file-powerpoint text-orange-400';
        if (mimetype.includes('zip') || mimetype.includes('compressed') || mimetype.includes('tar') || mimetype.includes('rar') || mimetype.includes('7z')) return 'fa-file-archive text-yellow-500';
        if (mimetype.includes('code') || mimetype.includes('javascript') || mimetype.includes('json') || filename.match(/\.(js|jsx|ts|tsx|html|css|py|php|java|cpp|c|h|json|xml|sql|ejs|rb|go|rs|swift|kt|sh|bat|pl|yml|yaml|ini|env|md)$/i)) return 'fa-file-code text-purple-400';
        if (mimetype.includes('video')) return 'fa-file-video text-pink-400';
        if (mimetype.includes('audio')) return 'fa-file-audio text-purple-400';
        if (mimetype.includes('text') || filename.endsWith('.txt')) return 'fa-file-alt text-gray-300';
        return 'fa-file text-gray-400';
    }

    function updateFilePreviews() {
        if (!filePreviewContainer) return;
        filePreviewContainer.innerHTML = '';
        if (selectedFiles.length === 0) {
            filePreviewContainer.classList.add('hidden');
            return;
        }
        filePreviewContainer.classList.remove('hidden');
        selectedFiles.forEach((file, index) => {
            const div = document.createElement('div');
            div.className = "relative group w-16 h-16 rounded-lg overflow-hidden border border-purple-900/40 bg-[#0e0e14]";
            if (file.type.startsWith('image/')) {
                const img = document.createElement('img');
                const objUrl = URL.createObjectURL(file);
                img.src = objUrl;
                img.onload = () => URL.revokeObjectURL(objUrl);
                img.className = "w-full h-full object-cover";
                div.appendChild(img);
            } else {
                const iconClass = getFileIconClass(file.type, file.name);
                div.innerHTML = `<div class="w-full h-full flex flex-col items-center justify-center p-1 text-center"><i class="fas ${iconClass} text-xl mb-1"></i><span class="text-[8px] text-gray-400 truncate w-full">${escapeHtml(file.name.slice(-6))}</span></div>`;
            }
            const removeBtn = document.createElement('button');
            removeBtn.className = "absolute top-0 right-0 bg-red-600/90 text-white w-5 h-5 flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition-opacity rounded-bl-md z-10 cursor-pointer";
            removeBtn.innerHTML = '<i class="fas fa-times"></i>';
            removeBtn.onclick = (e) => {
                e.stopPropagation();
                selectedFiles.splice(index, 1);
                updateFilePreviews();
            };
            div.appendChild(removeBtn);
            filePreviewContainer.appendChild(div);
        });
    }

    function handleFiles(files) {
        if (!files || files.length === 0) return;
        if (selectedFiles.length >= 10) {
            window.showNavbarAlert('Maksimal 10 file', 'error');
            return;
        }
        const remainingSlots = 10 - selectedFiles.length;
        const toAdd = Array.from(files).slice(0, remainingSlots);
        toAdd.forEach(file => {
            if (file.size <= 50 * 1024 * 1024) selectedFiles.push(file);
        });
        updateFilePreviews();
        if (files.length > remainingSlots) {
            window.showNavbarAlert('Hanya 10 file yang diizinkan', 'info');
        }
    }

    if (fileUploadBtn && fileInput) {
        fileUploadBtn.onclick = null;
        fileUploadBtn.addEventListener('click', (e) => {
            e.preventDefault();
            fileInput.click();
        });
        fileInput.addEventListener('change', (e) => {
            handleFiles(e.target.files);
            fileInput.value = '';
        });
    }
    if (messageInput) {
        messageInput.addEventListener('paste', (e) => {
            const items = (e.clipboardData || e.originalEvent.clipboardData).items;
            const files = [];
            for (let i = 0; i < items.length; i++)
                if (items[i].kind === 'file') files.push(items[i].getAsFile());
            if (files.length > 0) {
                e.preventDefault();
                handleFiles(files);
            }
        });
    }

    window.addEventListener('dragover', (e) => {
        e.preventDefault();
        if (dropZone) {
            dropZone.classList.remove('hidden');
            dropZone.classList.add('flex');
        }
    });
    window.addEventListener('dragleave', (e) => {
        if (e.relatedTarget === null || e.relatedTarget === document.documentElement) {
            if (dropZone) {
                dropZone.classList.add('hidden');
                dropZone.classList.remove('flex');
            }
        }
    });
    window.addEventListener('drop', (e) => {
        e.preventDefault();
        if (dropZone) {
            dropZone.classList.add('hidden');
            dropZone.classList.remove('flex');
        }
        handleFiles(e.dataTransfer.files);
    });

    if (searchBtn) {
        searchBtn.addEventListener('click', (e) => {
            e.preventDefault();
            isSearchEnabled = !isSearchEnabled;
            if (isSearchEnabled) {
                searchBtn.classList.remove('bg-purple-900/10', 'text-purple-400', 'border-purple-800/30');
                searchBtn.classList.add('bg-purple-600', 'text-white', 'border-purple-400', 'shadow-[0_0_15px_rgba(147,51,234,0.5)]');
                window.showNavbarAlert('Web Search Diaktifkan', 'success');
            } else {
                searchBtn.classList.add('bg-purple-900/10', 'text-purple-400', 'border-purple-800/30');
                searchBtn.classList.remove('bg-purple-600', 'text-white', 'border-purple-400', 'shadow-[0_0_15px_rgba(147,51,234,0.5)]');
                window.showNavbarAlert('Web Search Dinonaktifkan', 'info');
            }
        });
    }

    if (micBtn) {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            recognition = new SpeechRecognition();
            recognition.lang = 'id-ID';
            recognition.continuous = false;
            recognition.interimResults = false;
            recognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                if (messageInput) {
                    messageInput.value += (messageInput.value ? ' ' : '') + transcript;
                    messageInput.style.height = 'auto';
                    messageInput.style.height = Math.min(messageInput.scrollHeight, 120) + 'px';
                }
                micBtn.classList.remove('text-red-500', 'animate-pulse');
                micBtn.classList.add('text-purple-500/40');
            };
            recognition.onerror = () => {
                micBtn.classList.remove('text-red-500', 'animate-pulse');
                micBtn.classList.add('text-purple-500/40');
                window.showNavbarAlert('Gagal mengenali suara', 'error');
            };
            recognition.onend = () => {
                micBtn.classList.remove('text-red-500', 'animate-pulse');
                micBtn.classList.add('text-purple-500/40');
            };
            micBtn.addEventListener('click', (e) => {
                e.preventDefault();
                if (micBtn.classList.contains('text-red-500')) {
                    recognition.stop();
                } else {
                    recognition.start();
                    micBtn.classList.remove('text-purple-500/40');
                    micBtn.classList.add('text-red-500', 'animate-pulse');
                }
            });
        } else {
            micBtn.style.display = 'none';
        }
    }

    if (messageInput) {
        messageInput.addEventListener('keydown', (e) => {
            if (e.isComposing || e.keyCode === 229) return;
            const isMobile = window.innerWidth < 768;
            if (e.key === 'Enter' && !e.shiftKey && !isMobile) {
                e.preventDefault();
                e.stopPropagation();
                sendMessage();
            }
        });
        messageInput.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = Math.min(this.scrollHeight, 120) + 'px';
        });
    }

    if (sendBtn) sendBtn.addEventListener('click', (e) => {
        e.preventDefault();
        sendMessage();
    });

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.options-btn')) {
            document.querySelectorAll('[id^="menu-"]').forEach(el => el.classList.add('hidden'));
        }
    });

    if (chatContainer) {
        chatContainer.addEventListener('scroll', () => {
            const threshold = 50;
            const distance = chatContainer.scrollHeight - chatContainer.scrollTop - chatContainer.clientHeight;
            userIsScrolling = distance > threshold;
        });
    }

    window.showNavbarAlert = function(message, type = 'info') {
        const alertBox = document.getElementById('navbar-alert');
        const alertText = document.getElementById('navbar-alert-text');
        const alertIcon = document.getElementById('navbar-alert-icon');
        if (alertBox && alertText && alertIcon) {
            alertText.innerText = message;
            alertBox.classList.remove('opacity-0', 'pointer-events-none', 'scale-90');
            alertBox.classList.add('opacity-100', 'scale-100');
            if (type === 'success') {
                alertBox.className = "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 px-4 py-1.5 bg-green-900/80 border border-green-500/30 rounded-full shadow-lg flex items-center gap-2 transition-all duration-300 opacity-100 transform scale-100 z-[10000]";
                alertIcon.className = "fas fa-check-circle text-green-400 text-xs";
            } else if (type === 'error') {
                alertBox.className = "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 px-4 py-1.5 bg-red-900/80 border border-red-500/30 rounded-full shadow-lg flex items-center gap-2 transition-all duration-300 opacity-100 transform scale-100 z-[10000]";
                alertIcon.className = "fas fa-exclamation-circle text-red-400 text-xs";
            } else {
                alertBox.className = "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 px-4 py-1.5 bg-[#1c1c2e] border border-purple-900/30 rounded-full shadow-lg flex items-center gap-2 transition-all duration-300 opacity-100 transform scale-100 z-[10000]";
                alertIcon.className = "fas fa-info-circle text-purple-400 text-xs";
            }
            setTimeout(() => {
                alertBox.classList.add('opacity-0', 'pointer-events-none', 'scale-90');
                alertBox.classList.remove('opacity-100', 'scale-100');
            }, 3000);
        }
    };

    window.copyMessageBubble = function(btn) {
        const container = btn.closest('.message-bubble-container');
        const textDiv = container.querySelector('.markdown-body') || container.querySelector('.user-text');
        if (textDiv) {
            navigator.clipboard.writeText(textDiv.innerText).then(() => {
                const icon = btn.querySelector('i');
                const originalClass = icon.className;
                icon.className = 'fas fa-check text-green-400';
                setTimeout(() => {
                    icon.className = originalClass;
                }, 2000);
            });
        }
    };

    window.editMessage = function(btn) {
        const container = btn.closest('.message-bubble-container');
        const textDiv = container.querySelector('.user-text');
        if (textDiv && messageInput) {
            messageInput.value = textDiv.innerText;
            messageInput.style.height = 'auto';
            messageInput.style.height = Math.min(messageInput.scrollHeight, 120) + 'px';
            messageInput.focus();
        }
    };

    window.speakMessage = function(btn) {
        const container = btn.closest('.message-bubble-container');
        const textDiv = container.querySelector('.markdown-body') || container.querySelector('.user-text');
        if (textDiv) {
            const text = textDiv.innerText;
            if (currentUtterance) {
                window.speechSynthesis.cancel();
                currentUtterance = null;
            }
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'id-ID';
            window.speechSynthesis.speak(utterance);
            currentUtterance = utterance;
        }
    };

    window.updateActiveChatUI = function(id) {
        const historyItems = document.querySelectorAll('.chat-item');
        historyItems.forEach(el => {
            el.classList.remove('bg-[#202336]', 'text-white', 'border-purple-900', 'border-l-2');
            el.classList.add('text-gray-400', 'border-l-2', 'border-transparent', 'hover:bg-white/5');
            const btn = el.querySelector('.options-btn');
            if (btn) {
                btn.classList.remove('opacity-100');
                btn.classList.add('opacity-0', 'group-hover:opacity-100');
            }
        });

        const newChatStatic = document.getElementById('current-new-chat-item');
        const activeEl = document.getElementById(`chat-item-${id}`);
        const isNew = (!id || id === 'new');

        if (isNew) {
            if (newChatStatic) {
                newChatStatic.classList.add('bg-[#202336]', 'text-white', 'border-purple-900');
                newChatStatic.classList.remove('text-gray-400', 'hover:bg-white/5', 'border-transparent');
            }
        } else {
            if (newChatStatic) {
                newChatStatic.classList.remove('bg-[#202336]', 'text-white');
                newChatStatic.classList.add('text-gray-400', 'hover:bg-white/5', 'border-purple-900');
                newChatStatic.classList.remove('border-transparent');
            }

            if (activeEl) {
                activeEl.classList.remove('text-gray-400', 'border-transparent', 'hover:bg-white/5');
                activeEl.classList.add('bg-[#202336]', 'text-white', 'border-purple-900', 'border-l-2');
                activeEl.style.display = 'flex';
                const btn = activeEl.querySelector('.options-btn');
                if (btn) {
                    btn.classList.remove('opacity-0', 'group-hover:opacity-100');
                    btn.classList.add('opacity-100');
                }
            }
        }
        document.querySelectorAll('[id^="menu-"]').forEach(el => el.classList.add('hidden'));
    };

    function renderEmptyState() {
        if (chatContainer) {
            chatContainer.style.overflow = 'hidden';
            chatContainer.scrollTop = 0;
        }
        if (!messageList) return;
        
        messageList.style.height = '100%';
        messageList.className = "w-full max-w-3xl mx-auto flex flex-col items-center justify-center p-4";
        
        messageList.innerHTML = `<div id="empty-state" class="flex flex-col items-center justify-center w-full h-full relative z-10"><div class="relative w-48 h-48 md:w-56 md:h-56 flex items-center justify-center mb-6 md:mb-8 perspective-[1000px]"><div class="absolute inset-0 bg-purple-900/20 rounded-full blur-3xl animate-pulse"></div><div class="absolute w-[110%] h-[110%] rounded-full border border-purple-500/60 shadow-[0_0_15px_rgba(168,85,247,0.3)] animate-orbit-1 border-t-transparent border-l-transparent"></div><div class="absolute w-[110%] h-[110%] rounded-full border border-fuchsia-500/50 shadow-[0_0_15px_rgba(217,70,239,0.3)] animate-orbit-2 border-b-transparent border-r-transparent"></div><div class="absolute w-[110%] h-[110%] rounded-full border border-violet-500/50 animate-orbit-3 border-t-transparent border-r-transparent"></div><div class="absolute w-[110%] h-[110%] rounded-full border border-indigo-500/40 animate-orbit-4 border-b-transparent border-l-transparent"></div><div class="absolute w-[110%] h-[110%] rounded-full border border-pink-500/40 animate-orbit-5 border-l-transparent border-r-transparent"></div><div class="absolute w-[110%] h-[110%] rounded-full border border-cyan-500/40 animate-orbit-6 border-t-transparent border-b-transparent"></div><div class="w-24 h-24 md:w-28 md:h-28 rounded-full overflow-hidden border-2 border-purple-400/20 bg-[#050508] relative z-10 shadow-[0_0_40px_rgba(147,51,234,0.3)]"><div class="absolute inset-0 bg-gradient-to-b from-purple-900/30 via-transparent to-black z-10"></div><img src="/logo.png" alt="Logo" class="relative w-full h-full object-cover opacity-90"></div></div><h2 class="text-3xl md:text-5xl font-bold mb-2 text-center text-transparent bg-clip-text bg-gradient-to-r from-purple-200 via-white to-purple-400 drop-shadow-[0_0_10px_rgba(168,85,247,0.5)]">Dardcor AI</h2><p class="text-sm md:text-base text-purple-300/60 text-center max-w-xs md:max-w-md px-4 leading-relaxed font-light tracking-wide">Apa yang bisa saya bantu?</p></div>`;
    }

    window.createNewChat = async function() {
        if (abortController) abortController.abort();
        resetChatState();
        renderEmptyState();
        window.history.pushState(null, '', '/dardcorchat/dardcor-ai');
        window.updateActiveChatUI('new');
        try {
            const res = await fetch('/dardcorchat/ai/new-chat', {
                method: 'POST'
            });
            if (!checkAuth(res)) return;
            const data = await res.json();
            if (data.success) {
                const newId = data.redirectUrl.split('/').pop();
                serverData.currentConversationId = newId;
                window.history.replaceState({
                    id: newId
                }, '', `/dardcorchat/dardcor-ai/${newId}`);
            }
        } catch (e) {
            console.error(e);
            window.showNavbarAlert('Gagal membuat chat baru', 'error');
        }
    };

    window.loadChat = async function(id) {
        if (isChatLoading) resetChatState();
        isChatLoading = true;

        loadingTimeout = setTimeout(() => {
            isChatLoading = false;
        }, 5000);

        window.closeSidebarIfMobile();
        serverData.currentConversationId = id;

        try {
            const res = await fetch(`/api/chat/${id}`);
            if (!checkAuth(res)) return;
            if (!res.ok) throw new Error('Network error');
            const data = await res.json();

            if (data.success) {
                window.updateActiveChatUI(id);
                const duplicateItem = document.getElementById(`chat-item-${id}`);
                if (duplicateItem) duplicateItem.style.display = 'flex';

                if (!data.history || data.history.length === 0) {
                    renderEmptyState();
                    window.history.pushState({
                        id: id
                    }, '', `/dardcorchat/dardcor-ai/${id}`);
                } else {
                    if (chatContainer) chatContainer.style.overflow = '';
                    messageList.style.height = ''; 
                    messageList.innerHTML = '';
                    messageList.className = "w-full max-w-3xl mx-auto flex flex-col gap-6 pt-4 pb-4";

                    const fragment = document.createDocumentFragment();
                    data.history.forEach(msg => {
                        const el = createMessageElementSync(msg.role, msg.message, msg.file_metadata);
                        fragment.appendChild(el);
                    });
                    messageList.appendChild(fragment);

                    window.history.pushState({
                        id: id
                    }, '', `/dardcorchat/dardcor-ai/${id}`);

                    requestAnimationFrame(() => {
                        initHighlight();
                        scrollToBottom(true);
                    });
                }
            } else {
                window.history.pushState(null, '', '/dardcorchat/dardcor-ai');
                renderEmptyState();
                window.updateActiveChatUI('new');
            }
        } catch (e) {
            window.history.pushState(null, '', '/dardcorchat/dardcor-ai');
            renderEmptyState();
            window.updateActiveChatUI('new');
        } finally {
            clearTimeout(loadingTimeout);
            isChatLoading = false;
        }
    };

    function createMessageElementSync(role, text, files = []) {
        const div = document.createElement('div');
        div.className = `flex w-full ${role === 'user' ? 'justify-end' : 'justify-start'} message-bubble-container group min-w-0`;

        let fileHtml = '';
        if (files && files.length > 0) {
            const justify = role === 'user' ? 'justify-end' : 'justify-start';
            fileHtml = `<div class="flex flex-wrap gap-2 mb-2 ${justify} w-full">`;
            files.forEach(f => {
                const mimetype = (f.type || f.mimetype || '').toLowerCase();
                const filename = f.name || f.filename || 'Unknown File';
                if (mimetype.startsWith('image/')) {
                    const imgUrl = f instanceof File ? URL.createObjectURL(f) : (f.url || f.path);
                    if (imgUrl) fileHtml += `<div class="relative rounded-lg overflow-hidden border border-purple-900/30 shadow-lg group transition-transform hover:scale-105 bg-[#0e0e14] min-w-[100px] min-h-[100px] cursor-pointer" onclick="window.open('${imgUrl}', '_blank')"><img src="${imgUrl}" class="max-w-[200px] max-h-[200px] object-cover block"></div>`;
                } else {
                    const iconClass = getFileIconClass(mimetype, filename);
                    const fileUrl = f.url || '#';
                    fileHtml += `<div class="text-[10px] flex items-center gap-2 bg-[#0e0e14] px-3 py-1.5 rounded-lg border border-purple-900/30 text-gray-300 max-w-full shadow-sm cursor-pointer hover:bg-purple-900/20 hover:border-purple-500/50 transition-colors" onclick="window.open('${fileUrl}', '_blank')"><i class="fas ${iconClass}"></i> <span class="truncate">${escapeHtml(filename)}</span></div>`;
                }
            });
            fileHtml += `</div>`;
        }

        const bubbleClass = role === 'user' ? 'bg-transparent border border-purple-600/50 text-white rounded-br-sm shadow-[0_0_15px_rgba(147,51,234,0.15)]' : 'bg-transparent text-gray-200 rounded-bl-sm border-none';

        let contentHtml = '';
        if (role === 'user') {
            const safeText = escapeHtml(text).replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" class="text-purple-800 hover:text-purple-600 font-bold underline decoration-purple-800/50 hover:decoration-purple-600 transition-all break-all inline-flex items-center gap-1" style="text-decoration: underline !important; color: #a855f7;">$1</a>');
            contentHtml = `<div class="whitespace-pre-wrap break-words user-text" style="overflow-wrap: break-word; word-break: break-word;">${safeText}</div>`;
        } else {
            const parsed = parseMessageContent(text);
            const identityHtml = `
        <div class="unified-header" style="cursor: default;">
            <div class="header-content-wrapper static-mode">
                <div class="logo-stack">
                    <img src="/logo.png" class="main-logo">
                </div>
                <span class="bot-name-display">Dardcor AI</span>
            </div>
        </div>
        `;
            contentHtml = identityHtml;
            contentHtml += `<div class="chat-content-box relative rounded-2xl px-5 py-3.5 shadow-md text-sm ${bubbleClass} w-fit min-w-0 max-w-full overflow-hidden leading-7" style="overflow-wrap: break-word; word-break: break-word; contain: content;">
            <div class="markdown-body w-full max-w-full overflow-hidden break-words" style="overflow-wrap: break-word; word-break: break-word;">${safeMarkdownParse(parsed.answer)}</div>
        </div>`;
        }

        let actions = '';
        if (role === 'user') {
            actions = `<div class="flex items-center gap-3 mt-1 px-1 select-none opacity-50 group-hover:opacity-100 transition-opacity"><button onclick="window.editMessage(this)" class="text-[10px] font-medium bg-transparent border-none p-0 text-gray-500 hover:text-white flex items-center gap-1.5 transition-colors" title="Edit Pesan"><i class="fas fa-edit"></i> Edit</button><button onclick="window.copyMessageBubble(this)" class="text-[10px] font-medium bg-transparent border-none p-0 text-gray-500 hover:text-white flex items-center gap-1.5 transition-colors" title="Salin Pesan"><i class="fas fa-copy"></i> Salin</button></div>`;
        } else {
            actions = `<div class="flex items-center gap-3 mt-1 px-1 select-none opacity-50 group-hover:opacity-100 transition-opacity"><button onclick="window.copyMessageBubble(this)" class="text-[10px] font-medium bg-transparent border-none p-0 text-gray-500 hover:text-white flex items-center gap-1.5 transition-colors" title="Salin"><i class="fas fa-copy"></i> Salin</button><button onclick="window.speakMessage(this)" class="text-[10px] font-medium bg-transparent border-none p-0 text-gray-500 hover:text-white flex items-center gap-1.5 transition-colors" title="Dengarkan"><i class="fas fa-volume-up"></i> Dengar</button></div>`;
        }

        if (role === 'user') {
            div.innerHTML = `<div class="flex flex-col items-end w-full max-w-full min-w-0">${fileHtml}<div class="chat-content-box relative rounded-2xl px-5 py-3.5 shadow-md text-sm ${bubbleClass} w-fit min-w-0 max-w-full overflow-hidden leading-7" style="overflow-wrap: break-word; word-break: break-word;">${contentHtml}</div>${actions}</div>`;
        } else {
            div.innerHTML = `<div class="flex flex-col items-start w-full max-w-full min-w-0">${fileHtml}${contentHtml}${actions}</div>`;
        }

        return div;
    }

    async function sendMessage() {
        if (isSending) {
            if (abortController) {
                abortController.abort();
                abortController = null;
                isSending = false;
                if (sendIcon) sendIcon.classList.replace('fa-stop', 'fa-paper-plane');
                document.getElementById('loading-indicator')?.remove();
            }
            return;
        }
        const msg = messageInput ? messageInput.value.trim() : '';
        if (!msg && selectedFiles.length === 0) return;

        if (chatContainer) chatContainer.style.overflow = '';

        isSending = true;
        abortController = new AbortController();
        if (sendIcon) sendIcon.classList.replace('fa-paper-plane', 'fa-stop');
        if (messageInput) {
            messageInput.blur();
            messageInput.value = '';
            messageInput.style.height = 'auto';
        }
        if (filePreviewContainer) filePreviewContainer.classList.add('hidden');

        if (document.getElementById('empty-state')) {
            messageList.innerHTML = '';
            messageList.className = "w-full max-w-3xl mx-auto flex flex-col gap-6 pt-4 pb-4";
            messageList.style.height = ''; 
        }

        const filesToSend = [...selectedFiles];
        selectedFiles = [];
        updateFilePreviews();
        if (fileInput) fileInput.value = '';

        const userDiv = createMessageElementSync('user', msg, filesToSend);
        messageList.appendChild(userDiv);

        const loaderDiv = document.createElement('div');
        loaderDiv.id = 'loading-indicator';
        loaderDiv.className = "flex w-full justify-start message-bubble-container group min-w-0";

        loaderDiv.innerHTML = `
    <div class="flex flex-col items-start w-full max-w-full min-w-0">
        <div id="dynamic-header">
            <div class="unified-header">
                <div class="header-content-wrapper static-mode">
                    <div class="logo-stack">
                        <div class="spinner-ring active"></div>
                        <img src="/logo.png" class="main-logo">
                    </div>
                    <span class="bot-name-display">Dardcor AI Thinking...</span>
                </div>
            </div>
        </div>
        <div id="main-content-container" class="chat-content-box relative rounded-2xl px-5 py-3.5 shadow-md text-sm bg-transparent text-gray-200 rounded-bl-sm border-none w-fit min-w-0 max-w-full overflow-hidden leading-7 hidden" style="overflow-wrap: break-word; word-break: break-word; contain: content;">
            <div class="markdown-body w-full max-w-full overflow-hidden break-words" style="overflow-wrap: break-word; word-break: break-word;"></div>
        </div>
        <div class="flex items-center gap-3 mt-1 px-1 select-none opacity-50 group-hover:opacity-100 transition-opacity hidden">
            <button onclick="window.copyMessageBubble(this)" class="text-[10px] font-medium bg-transparent border-none p-0 text-gray-500 hover:text-white flex items-center gap-1.5 transition-colors" title="Salin"><i class="fas fa-copy"></i> Salin</button>
            <button onclick="window.speakMessage(this)" class="text-[10px] font-medium bg-transparent border-none p-0 text-gray-500 hover:text-white flex items-center gap-1.5 transition-colors" title="Dengarkan"><i class="fas fa-volume-up"></i> Dengar</button>
        </div>
    </div>`;

        if (messageList) messageList.appendChild(loaderDiv);
        scrollToBottom(true);

        const headerContainer = loaderDiv.querySelector('#dynamic-header');
        const mainContainer = loaderDiv.querySelector('#main-content-container');
        const botContent = loaderDiv.querySelector('.markdown-body');

        const fd = new FormData();
        fd.append('message', msg);
        fd.append('conversationId', serverData.currentConversationId || '');
        fd.append('toolType', currentToolType);
        fd.append('useWebSearch', isSearchEnabled);
        filesToSend.forEach(f => fd.append('file_attachment', f));

        let accumulatedAnswer = "";
        let displayedText = "";
        let typeQueue = [];
        let isTyping = false;
        let isNetworkDone = false;
        let pendingLangDetection = false;
        let currentEditorFileCreated = false;
        let lastRenderTime = 0;
        let previousPartCount = 1;
        let sentCodeLength = 0;

        function processTypeQueue() {
            if (typeQueue.length === 0) {
                isTyping = false;
                if (isNetworkDone) {
                    isSending = false;
                    abortController = null;
                    if (sendIcon) sendIcon.classList.replace('fa-stop', 'fa-paper-plane');
                    botContent.innerHTML = safeMarkdownParse(displayedText);
                    initHighlight(botContent);
                    const actionBtns = loaderDiv.querySelector('.flex.items-center.gap-3.mt-1');
                    if (actionBtns) actionBtns.classList.remove('hidden');
                }
                return;
            }
            isTyping = true;

            const take = 20;
            let chunk = "";
            for (let i = 0; i < take && typeQueue.length > 0; i++) {
                chunk += typeQueue.shift();
            }

            displayedText += chunk;

            const isVscodeActive = document.body.classList.contains('vscode-active');

            if (isVscodeActive) {
                const parts = displayedText.split('```');
                const currentPartCount = parts.length;
                const isInsideCode = currentPartCount % 2 === 0;

                if (currentPartCount > previousPartCount && isInsideCode) {
                    pendingLangDetection = true;
                    sentCodeLength = 0;
                    currentEditorFileCreated = false;
                }

                if (isInsideCode) {
                    const currentBlockContent = parts[currentPartCount - 1];

                    if (pendingLangDetection) {
                        const firstNewLine = currentBlockContent.indexOf('\n');
                        if (firstNewLine !== -1) {
                            const langRaw = currentBlockContent.substring(0, firstNewLine).trim();
                            let lang = langRaw || 'plaintext';

                            const monacoMap = {
                                'js': 'javascript',
                                'ts': 'typescript',
                                'py': 'python',
                                'cs': 'csharp',
                                'c#': 'csharp',
                                'cpp': 'cpp',
                                'c++': 'cpp',
                                'sh': 'shell',
                                'bash': 'shell',
                                'zsh': 'shell',
                                'ps1': 'powershell',
                                'kt': 'kotlin',
                                'rb': 'ruby',
                                'rs': 'rust',
                                'go': 'go',
                                'php': 'php',
                                'java': 'java',
                                'html': 'html',
                                'css': 'css',
                                'json': 'json',
                                'sql': 'sql',
                                'xml': 'xml',
                                'yaml': 'yaml',
                                'yml': 'yaml'
                            };

                            if (monacoMap[lang.toLowerCase()]) {
                                lang = monacoMap[lang.toLowerCase()];
                            }

                            const extMap = {
                                'js': 'js',
                                'javascript': 'js',
                                'ts': 'ts',
                                'typescript': 'ts',
                                'py': 'py',
                                'python': 'py',
                                'html': 'html',
                                'css': 'css',
                                'java': 'java',
                                'cpp': 'cpp',
                                'c': 'c',
                                'cs': 'cs',
                                'csharp': 'cs',
                                'php': 'php',
                                'json': 'json',
                                'sql': 'sql',
                                'go': 'go',
                                'rs': 'rs'
                            };
                            const ext = extMap[lang.toLowerCase()] || 'txt';
                            const filename = `auto_code_${Date.now()}.${ext}`;

                            if (window.openFile) {
                                window.openFile(filename, '', lang);
                                window.showNavbarAlert(`File ${filename} dibuat`, 'success');
                                currentEditorFileCreated = true;
                            }
                            pendingLangDetection = false;
                            sentCodeLength = firstNewLine + 1;

                            if (currentBlockContent.length > sentCodeLength) {
                                const initialContent = currentBlockContent.substring(sentCodeLength);
                                if (currentEditorFileCreated && window.monaco && window.monaco.editor) {
                                    const editors = window.monaco.editor.getEditors();
                                    if (editors.length > 0) {
                                        try {
                                            const editor = editors[0];
                                            const model = editor.getModel();
                                            if (model) {
                                                const lastLine = model.getLineCount();
                                                const lastCol = model.getLineMaxColumn(lastLine);
                                                model.applyEdits([{
                                                    range: new window.monaco.Range(lastLine, lastCol, lastLine, lastCol),
                                                    text: initialContent
                                                }]);
                                                editor.revealLine(lastLine);
                                            }
                                        } catch (e) {}
                                    }
                                }
                                sentCodeLength = currentBlockContent.length;
                            }
                        }
                    } else {
                        if (currentBlockContent.length > sentCodeLength) {
                            const delta = currentBlockContent.substring(sentCodeLength);
                            if (currentEditorFileCreated && window.monaco && window.monaco.editor) {
                                const editors = window.monaco.editor.getEditors();
                                if (editors.length > 0) {
                                    try {
                                        const editor = editors[0];
                                        const model = editor.getModel();
                                        if (model) {
                                            const lastLine = model.getLineCount();
                                            const lastCol = model.getLineMaxColumn(lastLine);
                                            model.applyEdits([{
                                                range: new window.monaco.Range(lastLine, lastCol, lastLine, lastCol),
                                                text: delta
                                            }]);
                                            editor.revealLine(lastLine);
                                        }
                                    } catch (e) {}
                                }
                            }
                            sentCodeLength = currentBlockContent.length;
                        }
                    }
                } else if (currentPartCount > previousPartCount && !isInsideCode) {
                    const closedBlockContent = parts[currentPartCount - 2];
                    if (closedBlockContent.length > sentCodeLength) {
                        const delta = closedBlockContent.substring(sentCodeLength);
                        if (currentEditorFileCreated && window.monaco && window.monaco.editor) {
                            const editors = window.monaco.editor.getEditors();
                            if (editors.length > 0) {
                                try {
                                    const editor = editors[0];
                                    const model = editor.getModel();
                                    if (model) {
                                        const lastLine = model.getLineCount();
                                        const lastCol = model.getLineMaxColumn(lastLine);
                                        model.applyEdits([{
                                            range: new window.monaco.Range(lastLine, lastCol, lastLine, lastCol),
                                            text: delta
                                        }]);
                                        editor.revealLine(lastLine);
                                    }
                                } catch (e) {}
                            }
                        }
                    }
                    sentCodeLength = 0;
                }

                previousPartCount = currentPartCount;
            }

            if (mainContainer && botContent) {
                mainContainer.classList.remove('hidden');
                const now = Date.now();
                if (now - lastRenderTime > 20 || typeQueue.length === 0) {
                    let tempFormatted = displayedText;
                    
                    if (!isNetworkDone) {
                        const lines = tempFormatted.split('\n');
                        const lastLine = lines[lines.length - 1].trim();
                        if (lastLine.startsWith('|') || (lines.length > 1 && lines[lines.length-2].trim().includes('|'))) {
                            if (!lastLine.endsWith('|') || !lastLine.includes('|')) {
                                lines.pop();
                                tempFormatted = lines.join('\n');
                            }
                        }
                    }

                    const codeBlockCount = (tempFormatted.match(/```/g) || []).length;
                    if (codeBlockCount % 2 !== 0) tempFormatted += "\n```";

                    botContent.innerHTML = safeMarkdownParse(tempFormatted);
                    initHighlight(botContent);

                    if (chatContainer && !userIsScrolling) {
                        chatContainer.scrollTop = chatContainer.scrollHeight;
                    }

                    lastRenderTime = now;
                }
            }

            requestAnimationFrame(processTypeQueue);
        }

        try {
            const response = await fetch('/dardcorchat/ai/chat-stream', {
                method: 'POST',
                body: fd,
                signal: abortController.signal
            });
            if (!checkAuth(response)) return;
            if (!response.ok) throw new Error("Server Error");

            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            let buffer = "";

            while (true) {
                const {
                    done,
                    value
                } = await reader.read();
                if (done) {
                    isNetworkDone = true;
                    if (!isTyping && typeQueue.length === 0) {
                        isSending = false;
                        abortController = null;
                        if (sendIcon) sendIcon.classList.replace('fa-stop', 'fa-paper-plane');
                        initHighlight(botContent);
                        const actionBtns = loaderDiv.querySelector('.flex.items-center.gap-3.mt-1');
                        if (actionBtns) actionBtns.classList.remove('hidden');
                    }
                    break;
                }
                buffer += decoder.decode(value, {
                    stream: true
                });
                const chunks = buffer.split('\n\n');
                buffer = chunks.pop() || '';

                for (const chunkBlock of chunks) {
                    if (!chunkBlock.trim()) continue;
                    const lines = chunkBlock.split('\n');
                    let eventType = 'message';
                    let data = null;

                    for (const line of lines) {
                        if (line.startsWith('event: ')) {
                            eventType = line.substring(7).trim();
                        } else if (line.startsWith('data: ')) {
                            try {
                                data = JSON.parse(line.substring(6));
                            } catch (e) {}
                        }
                    }

                    if (data) {
                        if (eventType === 'message') {
                            if (data.chunk) {
                                accumulatedAnswer += data.chunk;
                                const chars = data.chunk.split('');
                                typeQueue.push(...chars);

                                const staticHeader = headerContainer.querySelector('.unified-header');
                                if (staticHeader) {
                                    const spinner = staticHeader.querySelector('.spinner-ring');
                                    const nameDisplay = staticHeader.querySelector('.bot-name-display');
                                    if (spinner) spinner.classList.remove('active');
                                    if (nameDisplay) {
                                        nameDisplay.innerText = "Dardcor AI";
                                        nameDisplay.classList.remove('animate-pulse');
                                    }
                                }

                                if (!isTyping) processTypeQueue();
                            }
                        } else if (eventType === 'error') {
                            window.showNavbarAlert(data.error || 'Error', 'error');
                        }
                    }
                }
            }

            const currentItem = document.getElementById(`chat-item-${serverData.currentConversationId}`);
            if (currentItem) {
                currentItem.style.display = 'flex';
                window.updateActiveChatUI(serverData.currentConversationId);
            }

            if (accumulatedAnswer) {
                let finalCheck = accumulatedAnswer;
                const finalCodeBlockCount = (finalCheck.match(/```/g) || []).length;
                if (finalCodeBlockCount % 2 !== 0) finalCheck += "\n```";

                if (mainContainer && botContent) {
                    botContent.innerHTML = safeMarkdownParse(finalCheck);
                    initHighlight(botContent);
                }
            }

        } catch (e) {
            if (e.name === 'AbortError') return;
            document.getElementById('loading-indicator')?.remove();

            if (accumulatedAnswer && accumulatedAnswer.trim().length > 0) {
                isSending = false;
                abortController = null;
                if (sendIcon) sendIcon.classList.replace('fa-stop', 'fa-paper-plane');

                let finalCheck = accumulatedAnswer;
                const finalCodeBlockCount = (finalCheck.match(/```/g) || []).length;
                if (finalCodeBlockCount % 2 !== 0) finalCheck += "\n```";

                if (mainContainer && botContent) {
                    mainContainer.classList.remove('hidden');
                    botContent.innerHTML = safeMarkdownParse(finalCheck);
                    initHighlight(botContent);
                    const actionBtns = loaderDiv.querySelector('.flex.items-center.gap-3.mt-1');
                    if (actionBtns) actionBtns.classList.remove('hidden');
                }
                return;
            }

            window.showNavbarAlert('Gagal mengirim pesan', 'error');
        }
    }

    function scrollToBottom(force = false) {
        if (!chatContainer) return;
        const threshold = 50;
        const distance = chatContainer.scrollHeight - chatContainer.scrollTop - chatContainer.clientHeight;
        const isNearBottom = distance <= threshold;
        if (force || isNearBottom) chatContainer.scrollTo({
            top: chatContainer.scrollHeight,
            behavior: force ? 'auto' : 'smooth'
        });
    }

    function initHighlight(scope) {
        if (typeof hljs === 'undefined') return;
        const root = scope || document;
        const codes = root.querySelectorAll('pre code');
        if (codes.length > 0) {
            codes.forEach(el => {
                if (!el.dataset.highlighted) {
                    hljs.highlightElement(el);
                    el.dataset.highlighted = "true";
                }
            });
        }

        if (window.applyMathRendering) {
            window.applyMathRendering(scope);
        }
    }

    const observer = new MutationObserver((mutations) => {
        if (isSending) return;
        let shouldHighlight = false;
        mutations.forEach((mutation) => {
            if (mutation.addedNodes.length > 0 || mutation.type === 'characterData') {
                shouldHighlight = true;
            }
        });
        if (shouldHighlight) {
            requestAnimationFrame(() => initHighlight());
        }
    });

    if (messageList) {
        observer.observe(messageList, {
            childList: true,
            subtree: true,
            characterData: true
        });
    }

    function processServerSideMessages() {
        const containers = document.querySelectorAll('.chat-content-box .markdown-body');
        let needsScroll = false;

        containers.forEach(container => {
            const rawTextarea = container.closest('.chat-content-box').querySelector('.raw-message-content');
            if (rawTextarea && !container.dataset.processed) {
                container.innerHTML = safeMarkdownParse(rawTextarea.value);
                container.dataset.processed = "true";
                needsScroll = true;
            }
        });

        requestAnimationFrame(() => {
            initHighlight();
            if (needsScroll) {
                scrollToBottom(true);
            }
        });
    }

    window.toggleMenu = function(event, menuId) {
        if (event) event.stopPropagation();
        document.querySelectorAll('[id^="menu-"]').forEach(el => {
            if (el.id !== menuId) el.classList.add('hidden');
        });
        const menu = document.getElementById(menuId);
        if (menu) menu.classList.toggle('hidden');
    };

    window.toggleSidebar = function() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('mobile-overlay');
        if (!sidebar) return;

        let newState = 'open';

        if (window.innerWidth < 1024) {
            sidebar.classList.toggle('-translate-x-full');
            if (overlay) overlay.classList.toggle('hidden');
            newState = sidebar.classList.contains('-translate-x-full') ? 'closed' : 'open';
        } else {
            document.documentElement.classList.toggle('sidebar-closed');
            newState = document.documentElement.classList.contains('sidebar-closed') ? 'closed' : 'open';
        }

        localStorage.setItem('dardcor_sidebar_state', newState);
    };

    window.closeSidebarIfMobile = function() {
        if (window.innerWidth < 1024) {
            const sidebar = document.getElementById('sidebar');
            const overlay = document.getElementById('mobile-overlay');
            if (sidebar) sidebar.classList.add('-translate-x-full');
            if (overlay) overlay.classList.add('hidden');
        }
    };

    window.closePreview = function() {
        const overlay = document.getElementById('diagram-overlay');
        const frame = document.getElementById('diagram-frame');
        if (overlay) overlay.classList.add('hidden');
        if (frame) setTimeout(() => {
            frame.src = 'about:blank';
        }, 300);
    };

    window.openRenameModal = function(id) {
        chatToEdit = id;
        const currentTitleEl = document.getElementById(`raw-title-${id}`);
        const input = document.getElementById('rename-input');
        const modal = document.getElementById('rename-modal');
        if (input && currentTitleEl) input.value = currentTitleEl.value;
        if (modal) modal.classList.add('active');
        document.querySelectorAll('[id^="menu-"]').forEach(el => el.classList.add('hidden'));
    };

    window.openDeleteModal = function(id) {
        chatToDelete = id;
        const modal = document.getElementById('delete-modal');
        if (modal) modal.classList.add('active');
        document.querySelectorAll('[id^="menu-"]').forEach(el => el.classList.add('hidden'));
    };

    window.closeModal = function(id) {
        const modal = document.getElementById(id);
        if (modal) modal.classList.remove('active');
    };

    window.closeModals = function() {
        document.querySelectorAll('.modal').forEach(m => m.classList.remove('active'));
    };

    window.submitRename = async function() {
        const input = document.getElementById('rename-input');
        const newTitle = input ? input.value : '';
        if (!newTitle || !chatToEdit) return;
        try {
            const res = await fetch('/dardcorchat/ai/rename-chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    conversationId: chatToEdit,
                    newTitle
                })
            });
            if (!checkAuth(res)) return;
            if (res.ok) {
                const titleEl = document.getElementById(`title-${chatToEdit}`);
                const rawInput = document.getElementById(`raw-title-${chatToEdit}`);
                if (titleEl) titleEl.innerText = newTitle.length > 25 ? newTitle.substring(0, 25) + '...' : newTitle;
                if (rawInput) rawInput.value = newTitle;
                window.showNavbarAlert('Nama percakapan diperbarui', 'success');
                window.closeModal('rename-modal');
            } else {
                window.showNavbarAlert('Gagal mengubah nama', 'error');
            }
        } catch (e) {
            console.error(e);
            window.showNavbarAlert('Terjadi kesalahan sistem', 'error');
        }
    };

    window.submitDelete = async function() {
        if (!chatToDelete) return;
        try {
            const res = await fetch('/dardcorchat/ai/delete-chat-history', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    conversationId: chatToDelete
                })
            });
            if (!checkAuth(res)) return;
            if (res.ok) {
                const item = document.getElementById(`chat-item-${chatToDelete}`);
                if (item) item.remove();
                if (serverData.currentConversationId === chatToDelete) {
                    serverData.currentConversationId = '';
                    messageList.innerHTML = '';
                    renderEmptyState();
                    window.history.pushState(null, '', '/dardcorchat/dardcor-ai');
                    window.updateActiveChatUI('new');
                }
                window.showNavbarAlert('Percakapan dihapus', 'success');
                window.closeModal('delete-modal');
            } else {
                window.showNavbarAlert('Gagal menghapus percakapan', 'error');
            }
        } catch (e) {
            console.error(e);
            window.showNavbarAlert('Terjadi kesalahan sistem', 'error');
        }
    };

    const pathSegments = window.location.pathname.split('/');
    const possibleId = pathSegments[pathSegments.length - 1];
    const msgContainer = document.getElementById('message-list');
    const hasServerRenderedMessages = msgContainer && msgContainer.querySelectorAll('.message-bubble-container').length > 0;
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(possibleId);

    if (isUUID && possibleId !== 'dardcor-ai') {
        serverData.currentConversationId = possibleId;
        window.updateActiveChatUI(possibleId);
        if (hasServerRenderedMessages) {
            processServerSideMessages();
            window.history.replaceState({
                id: possibleId
            }, '', `/dardcorchat/dardcor-ai/${possibleId}`);
        } else {
            window.loadChat(possibleId);
        }
    } else {
        if (serverData.currentConversationId && !hasServerRenderedMessages) {
            if (!msgContainer || msgContainer.innerHTML.trim() === '') {
                window.loadChat(serverData.currentConversationId);
            }
        } else {
            window.updateActiveChatUI('new');
        }
    }

    if (hasServerRenderedMessages) {
        setTimeout(() => {
            processServerSideMessages();
            scrollToBottom(true);
        }, 100);
    }

    initHighlight();
});