import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function isRemoteHref(href) {
    return /^https?:\/\//i.test(href) || href.startsWith('//');
}

function injectValoboisDataScript(html, data) {
    if (data === undefined || data === null) return html;
    const jsonStr = JSON.stringify(data);
    const base64Json = Buffer.from(jsonStr, 'utf8').toString('base64');
    let scriptTag = '<script>';
    scriptTag += 'window.__VALOBOIS_DATA__=JSON.parse(decodeURIComponent(escape(atob(';
    scriptTag += '"' + base64Json + '"';
    scriptTag += '))));';
    scriptTag += '</script>';
    return html.replace(/<head[^>]*>/i, (m) => m + '\n  ' + scriptTag);
}

function hideOpenModalBackdrops(html) {
    return html.replace(/(<div\s+class="modal-backdrop)(?!\s+hidden)/g, '$1 hidden');
}

function inlineLocalStylesheets(html, rootDir) {
    return html.replace(/<link\s+[^>]*rel\s*=\s*["']stylesheet["'][^>]*>/gi, (tag) => {
        const m = tag.match(/\bhref\s*=\s*["']([^"']+)["']/i);
        if (!m || isRemoteHref(m[1])) return tag;
        const fp = path.join(rootDir, m[1]);
        const css = fs.readFileSync(fp, 'utf8');
        return `<style>\n${css}\n</style>`;
    });
}

function inlineLocalScripts(html, rootDir) {
    return html.replace(/<script\b[^>]*\bsrc\s*=\s*["']([^"']+)["'][^>]*>\s*<\/script>/gi, (full, src) => {
        if (isRemoteHref(src)) return full;
        const fp = path.join(rootDir, src);
        const js = fs.readFileSync(fp, 'utf8');
        return `<script>\n${js}\n</script>`;
    });
}

/**
 * @param {{ rootDir: string, data?: object }} opts
 * @returns {string}
 */
export function buildStandaloneHtmlString(opts) {
    const { rootDir, data } = opts;
    const indexPath = path.join(rootDir, 'index.html');
    let html = fs.readFileSync(indexPath, 'utf8');
    html = inlineLocalStylesheets(html, rootDir);
    html = inlineLocalScripts(html, rootDir);
    html = injectValoboisDataScript(html, data);
    html = hideOpenModalBackdrops(html);
    return html;
}

export function getProjectRoot() {
    return path.join(__dirname, '../..');
}
