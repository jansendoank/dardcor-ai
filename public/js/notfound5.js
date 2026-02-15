window.mathCache = {};
window.mathIdCounter = 0;

window.protectMath = function(text) {
    if (!text) return "";
    window.mathCache = {};
    window.mathIdCounter = 0;

    text = text.replace(/(\$\$[\s\S]*?\$\$)/g, (match) => {
        const id = `MATHBLOCK${window.mathIdCounter++}END`;
        window.mathCache[id] = match;
        return id;
    });

    text = text.replace(/(\\\[[\s\S]*?\\\])/g, (match) => {
        const id = `MATHDISPLAY${window.mathIdCounter++}END`;
        window.mathCache[id] = match;
        return id;
    });

    text = text.replace(/(\$[^$\n]+?\$)/g, (match, captured) => {
        const content = captured.slice(1, -1).trim();
        
        if (/^[a-zA-Z_][a-zA-Z0-9_]*\s*(=|;|,|\+\+|--|\(|\[)/.test(content)) {
            return match;
        }
        
        if (/^[\d.]+$/.test(content)) {
            return match;
        }
        
        if (content.length < 2 || content.length > 200) {
            return match;
        }
        
        const id = `MATHINLINE${window.mathIdCounter++}END`;
        window.mathCache[id] = match;
        return id;
    });

    text = text.replace(/(\\\([\s\S]*?\\\))/g, (match) => {
        const id = `MATHPAREN${window.mathIdCounter++}END`;
        window.mathCache[id] = match;
        return id;
    });

    return text;
};

window.restoreMath = function(html) {
    if (!html) return "";
    return html.replace(/(MATH[A-Z]+\d+END)/g, (match) => {
        return window.mathCache[match] || match;
    });
};

window.applyMathRendering = function(scope) {
    if (typeof renderMathInElement === 'undefined') return;
    
    const targets = scope ? [scope] : document.querySelectorAll('.markdown-body');
    targets.forEach(body => {
        try {
            renderMathInElement(body, {
                delimiters: [
                    {
                        left: '$$',
                        right: '$$',
                        display: true
                    },
                    {
                        left: '$',
                        right: '$',
                        display: false
                    },
                    {
                        left: '\\(',
                        right: '\\)',
                        display: false
                    },
                    {
                        left: '\\[',
                        right: '\\]',
                        display: true
                    },
                    {
                        left: '\\begin{equation}',
                        right: '\\end{equation}',
                        display: true
                    },
                    {
                        left: '\\begin{align}',
                        right: '\\end{align}',
                        display: true
                    },
                    {
                        left: '\\begin{alignat}',
                        right: '\\end{alignat}',
                        display: true
                    },
                    {
                        left: '\\begin{gather}',
                        right: '\\end{gather}',
                        display: true
                    },
                    {
                        left: '\\begin{CD}',
                        right: '\\end{CD}',
                        display: true
                    }
                ],
                throwOnError: false,
                ignoredTags: ["script", "noscript", "style", "textarea", "pre", "code", "option"],
                errorColor: "#cc0000",
                trust: true,
                strict: false
            });
        } catch (e) {
            console.error('Math rendering error:', e);
        }
    });
};