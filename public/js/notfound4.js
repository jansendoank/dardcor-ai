window.codeCache = {};
window.codeIdCounter = 0;

window.protectCode = function(text) {
    if (!text) return "";
    window.codeCache = {};
    window.codeIdCounter = 0;

    text = text.replace(/(```[\s\S]*?```)/g, (match) => {
        const id = `CODEBLOCKPHPROTECT${window.codeIdCounter++}END`;
        window.codeCache[id] = match;
        return id;
    });

    text = text.replace(/(`[^`]*?`)/g, (match) => {
        const id = `CODEINLINEPHPROTECT${window.codeIdCounter++}END`;
        window.codeCache[id] = match;
        return id;
    });

    return text;
};

window.restoreCode = function(text) {
    if (!text) return "";
    return text.replace(/(CODE(BLOCK|INLINE)PHPROTECT\d+END)/g, (match) => {
        return window.codeCache[match] || match;
    });
};

window.renderCodeTerminal = function(code, language) {
    let validCode = (typeof code === 'string' ? code : (code.text || ''));

    const escapeStrict = (str) => {
        if (!str) return '';
        return str.replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    };

    let lang = (language || '').toLowerCase().trim().split(/\s+/)[0] || '';
    const trimmedCode = validCode.trim();

    const hasPhpTags = validCode.includes('<?php') || validCode.includes('<?=') || /<\?(\s|$)/.test(validCode) || trimmedCode.match(/^<\?php/i);

    if (hasPhpTags || lang === 'php') {
        lang = 'php';
    } else {
        if (!lang || lang === 'text' || lang === 'txt' || lang === 'code' || lang === 'plaintext') {
            if (trimmedCode.match(/^<!DOCTYPE html/i) || trimmedCode.match(/^<html/i) || trimmedCode.match(/<\/div>/)) lang = 'html';
            else if (trimmedCode.match(/^(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|erDiagram|gantt|pie|gitGraph)/i)) lang = 'mermaid';
            else if (trimmedCode.match(/^(def\s|class\s|from\s|import\s+[\w\s,]+from|print\(|if\s+__name__\s*==|elif\s|try:|except:|with\s+open)/m)) lang = 'python';
            else if (trimmedCode.match(/^(const\s|let\s|var\s|function|console\.log|=>|document\.|window\.|import\s+.*from\s+['"]|export\s)/m)) lang = 'javascript';
            else if (trimmedCode.match(/^#include/) || trimmedCode.match(/std::/) || trimmedCode.match(/cout\s*<</) || trimmedCode.match(/int\s+main\s*\(/)) lang = 'cpp';
            else if (trimmedCode.match(/^package\s+main/) || trimmedCode.match(/^func\s+main/) || trimmedCode.match(/fmt\.Print/)) lang = 'go';
            else if (trimmedCode.match(/^using\s+System;/) || trimmedCode.match(/Console\.WriteLine/) || trimmedCode.match(/public\s+class/)) lang = 'csharp';
            else if (trimmedCode.match(/^import\s+java\./) || trimmedCode.match(/public\s+class/) || trimmedCode.match(/System\.out\.println/)) lang = 'java';
            else if (trimmedCode.match(/^\s*([.#]?-?[_a-zA-Z]+[_a-zA-Z0-9-]*|\*|:root|body|html|div|span|h[1-6]|p|a|button|input)\s*\{/) || trimmedCode.match(/(margin|padding|color|background|border|display|font|width|height|flex|grid)\s*:/)) lang = 'css';
            else if (trimmedCode.match(/^(SELECT|INSERT|UPDATE|DELETE|CREATE|DROP|ALTER|GRANT|REVOKE).*FROM/i)) lang = 'sql';
            else if (trimmedCode.match(/^\{[\s\S]*"[^"]+":/) || trimmedCode.match(/^\[[\s\S]*\{/)) lang = 'json';
            else if (trimmedCode.match(/^#!\/bin\/(bash|sh|zsh)/) || trimmedCode.match(/^(sudo|apt-get|npm|pip|git|docker|echo|ls|cd|mkdir|rm)\s+/m)) lang = 'bash';
            else if (trimmedCode.match(/^fn\s+main/) || trimmedCode.match(/println!/)) lang = 'rust';
            else if (trimmedCode.match(/^interface\s+\w+/) || trimmedCode.match(/: \w+ =/)) lang = 'typescript';
            else if (trimmedCode.match(/^version:\s*['"]?[\d.]+['"]?/)) lang = 'yaml';
            else if (trimmedCode.match(/^(local\s+|function\s+\w+|end$|return\s+|nil|elseif)/m)) lang = 'lua';
            else if (trimmedCode.match(/^(def\s+|end$|class\s+|module\s+|puts\s+|require\s+|attr_)/m)) lang = 'ruby';
            else if (trimmedCode.match(/^(func\s+|var\s+|let\s+|import\s+|class\s+|extension\s+)/m)) lang = 'swift';
            else if (trimmedCode.match(/^(fun\s+|val\s+|var\s+|class\s+|package\s+|import\s+|companion\s+object)/m)) lang = 'kotlin';
            else if (trimmedCode.match(/^(<\- |library\(|function\(|df\s*=|ggplot\(|aes\()/m)) lang = 'r';
            else if (trimmedCode.match(/^(my\s+|sub\s+|use\s+|print\s+|foreach\s+|if\s+\()/m) && trimmedCode.includes('$')) lang = 'perl';
            else if (trimmedCode.match(/^(void\s+main|import\s+['"]dart|class\s+\w+|Widget\s+|build\(|setState)/m)) lang = 'dart';
            else if (trimmedCode.match(/^(def\s+|val\s+|var\s+|object\s+|class\s+|extends\s+|with\s+|match\s+{)/m)) lang = 'scala';
            else if (trimmedCode.match(/^(defmodule|def\s+|defp\s+|do$|end$|@moduledoc)/m)) lang = 'elixir';
            else if (trimmedCode.match(/^(module\s+|where\s+|import\s+|data\s+|type\s+|instance\s+)/m)) lang = 'haskell';
            else lang = 'properties';
        }
    }

    let btnHtml = '';
    const isStrictlyPhp = lang === 'php' || hasPhpTags;

    if ((lang === 'html' || lang === 'ejs') && !isStrictlyPhp) {
        btnHtml = `<button onclick="window.previewCode(this)" class="cmd-btn btn-preview" title="Preview"><i class="fas fa-play"></i> Preview</button>`;
    } else if (lang === 'mermaid') {
        btnHtml = `<button onclick="window.previewDiagram(this)" class="cmd-btn btn-diagram" title="Diagram"><i class="fas fa-project-diagram"></i> Diagram</button>`;
    }

    const strictEscapedCode = escapeStrict(validCode);
    const encodedForEditor = encodeURIComponent(validCode);
    const lineCount = validCode.split('\n').length;

    return `
<div class="terminal-wrapper-outer" style="isolation: isolate;">
    <div class="terminal-container">
        <div class="terminal-head">
            <div class="flex items-center gap-2">
                <i class="fas fa-code text-[#6b7280] text-[10px]"></i>
                <span class="text-[10px] font-bold text-[#9ca3af] uppercase font-mono tracking-wider">${escapeStrict(lang || 'CODE')}</span>
            </div>
            <div class="flex items-center gap-1.5">
                ${btnHtml}
                <button onclick="window.copyCode(this)" class="cmd-btn btn-copy" title="Copy"><i class="fas fa-copy"></i></button>
            </div>
        </div>
        <div class="terminal-scroll-area">
            <pre><code class="hljs ${escapeStrict(lang)} language-${escapeStrict(lang)}">${strictEscapedCode}</code></pre>
            <textarea class="hidden raw-code">${strictEscapedCode}</textarea>
        </div>
        <button class="btn-open-in-editor-placeholder group" onclick="window.sendToVSCode(this)" data-code="${encodedForEditor}" data-lang="${escapeStrict(lang)}" style="height: 45px; min-height: 45px; flex-direction: row; justify-content: space-between; padding: 0 16px; gap: 0;">
            <div class="flex items-center gap-2">
                <i class="fas fa-arrow-right-to-bracket text-xs"></i>
                <span class="text-[10px] font-bold uppercase tracking-wider">Open to Editor</span>
            </div>
            <div class="flex items-center gap-4 text-[9px] font-mono text-gray-500 group-hover:text-gray-300 transition-colors">
                <span>Ln ${lineCount}, Col 1</span>
                <span>UTF-8</span>
                <span class="uppercase">${escapeStrict(lang || 'PLAINTEXT')}</span>
            </div>
        </button>
    </div>
</div>`;
};

window.previewCode = async function(btn) {
    const container = btn.closest('.terminal-container');
    if (!container) return;
    const codeText = container.querySelector('.raw-code')?.value;
    const hljsEl = container.querySelector('.hljs');
    const langClass = hljsEl ? Array.from(hljsEl.classList).find(c => c !== 'hljs') : 'html';
    const type = langClass || 'html';
    if (!codeText) return;

    const originalHtml = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    try {
        const response = await fetch('/dardcorchat/ai/store-preview', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                code: codeText,
                type: type
            })
        });
        if (typeof window.checkAuth === 'function' && !window.checkAuth(response)) return;
        const data = await response.json();
        if (data.success) {
            const overlay = document.getElementById('diagram-overlay');
            const frame = document.getElementById('diagram-frame');
            frame.src = `/dardcorchat/dardcor-ai/preview/${data.previewId}`;
            overlay.classList.remove('hidden');
        } else {
            if(window.showNavbarAlert) window.showNavbarAlert('Gagal memproses preview', 'error');
        }
    } catch (e) {
        console.error(e);
        if(window.showNavbarAlert) window.showNavbarAlert('Error sistem preview', 'error');
    } finally {
        btn.innerHTML = originalHtml;
    }
};

window.previewDiagram = async function(btn) {
    const container = btn.closest('.terminal-container');
    if (!container) return;
    const codeText = container.querySelector('.raw-code')?.value;
    if (!codeText) return;

    const originalHtml = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    try {
        const response = await fetch('/dardcorchat/ai/store-preview', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                code: codeText,
                type: 'mermaid'
            })
        });
        if (typeof window.checkAuth === 'function' && !window.checkAuth(response)) return;
        const data = await response.json();
        if (data.success) {
            const overlay = document.getElementById('diagram-overlay');
            const frame = document.getElementById('diagram-frame');
            frame.src = `/dardcorchat/dardcor-ai/diagram/${data.previewId}`;
            overlay.classList.remove('hidden');
        } else {
            if(window.showNavbarAlert) window.showNavbarAlert('Gagal memproses diagram', 'error');
        }
    } catch (e) {
        console.error(e);
        if(window.showNavbarAlert) window.showNavbarAlert('Error sistem diagram', 'error');
    } finally {
        btn.innerHTML = originalHtml;
    }
};

window.copyCode = function(btn) {
    const container = btn.closest('.terminal-container');
    if (!container) return;
    const codeText = container.querySelector('.raw-code')?.value;
    if (codeText) {
        navigator.clipboard.writeText(codeText).then(() => {
            const original = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-check text-green-400"></i>';
            setTimeout(() => {
                btn.innerHTML = original;
            }, 2000);
        });
    }
};