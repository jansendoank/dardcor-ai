(function() {
    const TABLE_STORE = new Map();
    const TABLE_COUNTER = { value: 0 };

    const parseInlineMarkdown = (text) => {
        if (!text) return '';
        text = text.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
        text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        text = text.replace(/\*(.+?)\*/g, '<em>$1</em>');
        text = text.replace(/__(.+?)__/g, '<strong>$1</strong>');
        text = text.replace(/_(.+?)_/g, '<em>$1</em>');
        text = text.replace(/~~(.+?)~~/g, '<del>$1</del>');
        text = text.replace(/`(.+?)`/g, '<code>$1</code>');
        text = text.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank">$1</a>');
        return text;
    };

    window.forceTableStructure = function(text) {
        if (!text) return "";

        let raw = text;
        const codeMap = [];
        
        raw = raw.replace(/(```[\s\S]*?```)/g, (m) => {
            codeMap.push(m);
            return `__D_CODE_BLOCK_${codeMap.length - 1}__`;
        });
        
        raw = raw.replace(/(\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\])/g, (m) => {
            codeMap.push(m);
            return `__D_MATH_BLOCK_${codeMap.length - 1}__`;
        });

        const lines = raw.split(/\r?\n/);
        const processedLines = [];
        let i = 0;
        
        while (i < lines.length) {
            const line = lines[i];
            
            if (line.trim().includes('|') && !line.includes('__D_CODE_') && !line.includes('__D_MATH_')) {
                const tableLines = [];
                let j = i;
                
                while (j < lines.length) {
                    const currentLine = lines[j].trim();
                    if (currentLine.includes('|') && !currentLine.includes('__D_CODE_') && !currentLine.includes('__D_MATH_')) {
                        tableLines.push(lines[j]);
                        j++;
                    } else if (currentLine === '') {
                        tableLines.push(lines[j]);
                        j++;
                        if (j < lines.length && !lines[j].trim().includes('|')) {
                            break;
                        }
                    } else {
                        break;
                    }
                }
                
                if (tableLines.length >= 2) {
                    let sepIdx = -1;
                    let headerIdx = -1;
                    
                    for (let k = 0; k < Math.min(tableLines.length, 5); k++) {
                        const trimmed = tableLines[k].trim();
                        if (/^\|?[\s:\-|]+\|?$/.test(trimmed) && trimmed.includes('-')) {
                            sepIdx = k;
                            if (k > 0) {
                                headerIdx = k - 1;
                            }
                            break;
                        }
                    }
                    
                    if (sepIdx === -1) {
                        for (let k = 0; k < Math.min(tableLines.length, 3); k++) {
                            const trimmed = tableLines[k].trim();
                            if (trimmed.includes('|') && trimmed.split('|').filter(c => c.trim()).length >= 2) {
                                headerIdx = k;
                                break;
                            }
                        }
                    }
                    
                    if (headerIdx !== -1 || sepIdx !== -1) {
                        const actualHeaderIdx = headerIdx !== -1 ? headerIdx : 0;
                        
                        const parseRow = (r) => {
                            const cells = r.split('|');
                            const start = cells[0].trim() === '' ? 1 : 0;
                            const end = cells[cells.length - 1].trim() === '' ? cells.length - 1 : cells.length;
                            return cells.slice(start, end).map(c => parseInlineMarkdown(c.trim()));
                        };

                        const headers = parseRow(tableLines[actualHeaderIdx]);
                        const cols = headers.length;

                        if (cols > 0) {
                            let tableHtml = '<div class="table-wrapper"><table>';
                            tableHtml += '<thead><tr>';
                            headers.forEach(h => tableHtml += `<th>${h || '&nbsp;'}</th>`);
                            tableHtml += '</tr></thead><tbody>';

                            for (let k = 0; k < tableLines.length; k++) {
                                if (k === sepIdx || k === actualHeaderIdx) continue;
                                const trimmedLine = tableLines[k].trim();
                                if (!trimmedLine || !trimmedLine.includes('|')) continue;
                                
                                const cells = parseRow(tableLines[k]);
                                if (cells.length === 0 || cells.every(c => !c)) continue;
                                
                                tableHtml += '<tr>';
                                for (let c = 0; c < cols; c++) {
                                    tableHtml += `<td>${cells[c] || '&nbsp;'}</td>`;
                                }
                                tableHtml += '</tr>';
                            }

                            tableHtml += '</tbody></table></div>';
                            const id = `TBL_${Date.now()}_${TABLE_COUNTER.value++}`;
                            TABLE_STORE.set(id, tableHtml);
                            
                            processedLines.push(`\n[[DARDCOR_TABLE_${id}]]\n`);
                            i = j;
                            continue;
                        }
                    }
                }
                
                processedLines.push(...tableLines);
                i = j;
            } else {
                processedLines.push(line);
                i++;
            }
        }

        raw = processedLines.join('\n');

        raw = raw.replace(/__D_CODE_BLOCK_(\d+)__/g, (m, idx) => codeMap[parseInt(idx)] || m);
        raw = raw.replace(/__D_MATH_BLOCK_(\d+)__/g, (m, idx) => codeMap[parseInt(idx)] || m);
        
        return raw;
    };

    window.recoverBrokenTables = function(html) {
        if (!html) return "";
        
        html = html.replace(/\[\[DARDCOR_TABLE_(TBL_[0-9_]+)\]\]/g, (m, id) => {
            return TABLE_STORE.get(id) || m;
        });

        html = html.replace(/<p>\[\[DARDCOR_TABLE_(TBL_[0-9_]+)\]\]<\/p>/g, (m, id) => {
            return TABLE_STORE.get(id) || m;
        });

        html = html.replace(/<p>(&lt;br&gt;.*?\|.*?&lt;br&gt;)<\/p>/g, (match, inner) => {
            if (inner.includes('|') && inner.includes('---')) {
                const cleaned = inner.replace(/&lt;br&gt;/g, '\n').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
                const processed = window.forceTableStructure(cleaned);
                const tableMatch = processed.match(/\[\[DARDCOR_TABLE_(TBL_[0-9_]+)\]\]/);
                if (tableMatch) {
                    return TABLE_STORE.get(tableMatch[1]) || match;
                }
            }
            return match;
        });

        html = html.replace(/&lt;br&gt;.*?\|.*?&lt;br&gt;/g, (match) => {
            if (match.includes('|') && match.includes('---')) {
                const cleaned = match.replace(/&lt;br&gt;/g, '\n').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
                const processed = window.forceTableStructure(cleaned);
                const tableMatch = processed.match(/\[\[DARDCOR_TABLE_(TBL_[0-9_]+)\]\]/);
                if (tableMatch) {
                    return TABLE_STORE.get(tableMatch[1]) || match;
                }
            }
            return match;
        });

        return html;
    };

    const observer = new MutationObserver((mutations) => {
        const nodesToProcess = new Set();
        
        mutations.forEach(mutation => {
            if (mutation.type === 'childList') {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === 1) {
                        if (node.classList && (node.classList.contains('markdown-body') || node.classList.contains('chat-content-box'))) {
                            nodesToProcess.add(node);
                        }
                        const children = node.querySelectorAll('.markdown-body, .chat-content-box, p, div');
                        children.forEach(child => nodesToProcess.add(child));
                    }
                });
            }
        });

        if (nodesToProcess.size > 0) {
            requestAnimationFrame(() => {
                nodesToProcess.forEach(el => {
                    if (!el.isConnected) return;
                    const html = el.innerHTML || '';
                    if (html.includes('[[DARDCOR_TABLE_') || (html.includes('|') && (html.includes('---') || html.includes('&lt;br&gt;')))) {
                        const processed = window.recoverBrokenTables(html);
                        if (processed !== html) {
                            el.innerHTML = processed;
                        }
                    }
                });
            });
        }
    });

    observer.observe(document.body, { 
        childList: true, 
        subtree: true
    });

    window.addEventListener('load', () => {
        requestAnimationFrame(() => {
            const elements = document.querySelectorAll('.markdown-body, .chat-content-box, p, div');
            elements.forEach(el => {
                const html = el.innerHTML || '';
                if (html.includes('[[DARDCOR_TABLE_') || (html.includes('|') && (html.includes('---') || html.includes('&lt;br&gt;')))) {
                    const processed = window.recoverBrokenTables(html);
                    if (processed !== html) {
                        el.innerHTML = processed;
                    }
                }
            });
        });
    });
})();