(function (global) {
    function isRemoteHref(href) {
        return /^https?:\/\//i.test(href) || href.startsWith('//');
    }

    function injectValoboisDataScript(html, data) {
        if (data === undefined || data === null) return html;
        const jsonStr = JSON.stringify(data);
        const base64Json = btoa(unescape(encodeURIComponent(jsonStr)));
        let scriptTag = '<script>';
        scriptTag += 'window.__VALOBOIS_DATA__=JSON.parse(decodeURIComponent(escape(atob(';
        scriptTag += '"' + base64Json + '"';
        scriptTag += '))));';
        scriptTag += '<' + '/script>';
        return html.replace(/<head[^>]*>/i, (m) => m + '\n  ' + scriptTag);
    }

    function hideOpenModalBackdrops(html) {
        return html.replace(/(<div\s+class="modal-backdrop)(?!\s+hidden)/g, '$1 hidden');
    }

    async function fetchText(url) {
        const r = await fetch(url);
        if (!r.ok) throw new Error('Échec du chargement : ' + url);
        return r.text();
    }

    async function inlineLocalStylesheets(html, dirHref) {
        const re = /<link\s+[^>]*rel\s*=\s*["']stylesheet["'][^>]*>/gi;
        let match;
        const parts = [];
        let lastIndex = 0;
        while ((match = re.exec(html)) !== null) {
            parts.push(html.slice(lastIndex, match.index));
            const tag = match[0];
            const hrefM = tag.match(/\bhref\s*=\s*["']([^"']+)["']/i);
            if (hrefM && !isRemoteHref(hrefM[1])) {
                const css = await fetchText(new URL(hrefM[1], dirHref));
                parts.push('<style>\n' + css + '\n</style>');
            } else {
                parts.push(tag);
            }
            lastIndex = match.index + tag.length;
        }
        parts.push(html.slice(lastIndex));
        return parts.join('');
    }

    async function inlineLocalScripts(html, dirHref) {
        const re = /<script\b[^>]*\bsrc\s*=\s*["']([^"']+)["'][^>]*>\s*<\/script>/gi;
        let match;
        const parts = [];
        let lastIndex = 0;
        while ((match = re.exec(html)) !== null) {
            parts.push(html.slice(lastIndex, match.index));
            const full = match[0];
            const src = match[1];
            if (isRemoteHref(src)) {
                parts.push(full);
            } else {
                const js = await fetchText(new URL(src, dirHref));
                const safeJs = js.replace(/<\/script/gi, '<\\/script');
                parts.push('<script>\n' + safeJs + '\n</script>');
            }
            lastIndex = match.index + full.length;
        }
        parts.push(html.slice(lastIndex));
        return parts.join('');
    }

    /**
     * @param {{ data?: object }} options
     * @returns {Promise<string>}
     */
    global.buildValoboisStandaloneHtml = async function buildValoboisStandaloneHtml(options) {
        const data = options && options.data;
        const dirHref = new URL('.', window.location.href);
        let html = await fetchText(new URL('index.html', dirHref));
        html = await inlineLocalStylesheets(html, dirHref);
        html = await inlineLocalScripts(html, dirHref);
        html = injectValoboisDataScript(html, data);
        html = hideOpenModalBackdrops(html);
        return html;
    };
})(typeof window !== 'undefined' ? window : globalThis);
