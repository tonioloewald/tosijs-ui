/*
A page schematic: what is on screen, as an SVG of labelled boxes (#4147).

The page draws it itself, from the visible DOM and `getBoundingClientRect`, so it needs no
screenshot tool and works on any device. It is text, so an agent reads it without vision: each
box is a `<rect>` carrying the element's tag, id, part, role and label, and its own text.

It is bounded. Hidden, zero-size and off-screen elements are left out, text is cut short, and
past the budget the schematic is simplified VISIBLY: text goes first, then the deepest
elements, and the result says so (`data-truncated`, `data-dropped`, and a banner), so nobody
reads a partial schematic as complete.

Form values are never included: a schematic travels, and a field may hold a password.
*/
const TEXT_LIMIT = 60;
const escapeXml = (text) => text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
const clip = (text, limit) => text.length > limit ? text.slice(0, limit - 1) + '…' : text;
/** The element's own text: its direct text nodes, not its children's. */
function ownText(element) {
    let text = '';
    for (const node of element.childNodes) {
        if (node.nodeType === 3)
            text += node.textContent;
    }
    return clip(text.replace(/\s+/g, ' ').trim(), TEXT_LIMIT);
}
/** `button#save[part=go][role=tab]"Close"`: what the element is, in one string. */
function describe(element) {
    let label = element.localName;
    if (element.id)
        label += `#${element.id}`;
    const part = element.getAttribute('part');
    if (part)
        label += `[part=${part}]`;
    const role = element.getAttribute('role');
    if (role)
        label += `[role=${role}]`;
    if (element.localName === 'input') {
        label += `[type=${element.type}]`;
    }
    const name = element.getAttribute('aria-label') ??
        element.getAttribute('placeholder') ??
        element.getAttribute('alt') ??
        element.getAttribute('title');
    if (name)
        label += ` "${clip(name, TEXT_LIMIT)}"`;
    return label;
}
const SKIPPED_TAGS = new Set([
    'script',
    'style',
    'link',
    'meta',
    'template',
    'noscript',
    'head',
]);
function collect(root, skip, viewport) {
    const nodes = [];
    const visit = (element, depth) => {
        if (SKIPPED_TAGS.has(element.localName))
            return;
        if (skip && element.matches(skip))
            return;
        const style = getComputedStyle(element);
        if (style.display === 'none')
            return;
        const rect = element.getBoundingClientRect();
        const left = Math.max(0, rect.left);
        const top = Math.max(0, rect.top);
        const right = Math.min(viewport.width, rect.right);
        const bottom = Math.min(viewport.height, rect.bottom);
        const visible = style.visibility !== 'hidden' &&
            // An unset opacity reads as '', which Number() would call 0.
            Number(style.opacity || '1') !== 0 &&
            right > left &&
            bottom > top;
        if (visible) {
            nodes.push({
                depth,
                x: Math.round(left),
                y: Math.round(top),
                width: Math.round(right - left),
                height: Math.round(bottom - top),
                label: describe(element),
                text: ownText(element),
            });
        }
        // A box with no size can still hold visible children (display: contents, a positioned child).
        const children = element.shadowRoot
            ? [...element.shadowRoot.children, ...element.children]
            : [...element.children];
        for (const child of children)
            visit(child, depth + 1);
    };
    visit(root, 0);
    return nodes;
}
function render(nodes, viewport, meta, withText) {
    const { width, height } = viewport;
    const dropped = meta.total - nodes.length;
    const stamp = meta.truncated.length
        ? ` data-truncated="${meta.truncated.join(',')}" data-dropped="${dropped}"`
        : '';
    const lines = [
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" data-url="${escapeXml(meta.url)}" data-nodes="${nodes.length}"${stamp} font-family="sans-serif" font-size="10">`,
        `<rect width="${width}" height="${height}" fill="#fff"/>`,
        '<g fill="none" stroke="#0064d2" stroke-opacity="0.5">',
    ];
    for (const node of nodes) {
        lines.push(`<rect x="${node.x}" y="${node.y}" width="${node.width}" height="${node.height}" data-depth="${node.depth}"><title>${escapeXml(node.label)}</title></rect>`);
    }
    lines.push('</g>');
    if (withText) {
        lines.push('<g fill="#222">');
        for (const node of nodes) {
            if (!node.text)
                continue;
            lines.push(`<text x="${node.x + 2}" y="${node.y + 11}">${escapeXml(node.text)}</text>`);
        }
        lines.push('</g>');
    }
    if (meta.truncated.length) {
        lines.push(`<text x="4" y="${height - 6}" fill="#b00020" font-size="12">schematic truncated (${meta.truncated.join(', ')}): ${dropped} of ${meta.total} boxes dropped</text>`);
    }
    lines.push('</svg>');
    return lines.join('\n');
}
/**
 * Draw what is on screen as an SVG schematic. It fits `maxNodes` and `maxBytes`, simplified
 * and stamped as truncated when the page is bigger than that.
 */
export function pageSchematic(options = {}) {
    const { root = document.body, skip, maxNodes = 2000, maxBytes = 900_000, } = options;
    const viewport = {
        width: Math.max(1, Math.round(window.innerWidth)),
        height: Math.max(1, Math.round(window.innerHeight)),
    };
    const all = collect(root, skip, viewport);
    const meta = {
        url: window.location.href,
        total: all.length,
        truncated: [],
    };
    let nodes = all;
    let withText = true;
    // Deepest first, so the page's structure survives longest.
    let maxDepth = Math.max(0, ...nodes.map((node) => node.depth));
    const dropDeepest = () => {
        maxDepth -= 1;
        nodes = nodes.filter((node) => node.depth <= maxDepth);
    };
    while (nodes.length > maxNodes && maxDepth > 0)
        dropDeepest();
    if (nodes.length > maxNodes)
        nodes = nodes.slice(0, maxNodes);
    if (nodes.length < all.length)
        meta.truncated.push('nodes');
    let svg = render(nodes, viewport, meta, withText);
    if (svg.length > maxBytes) {
        withText = false;
        meta.truncated.push('text');
        svg = render(nodes, viewport, meta, withText);
    }
    if (svg.length > maxBytes && !meta.truncated.includes('nodes')) {
        meta.truncated.push('nodes');
    }
    while (svg.length > maxBytes && maxDepth > 0) {
        dropDeepest();
        svg = render(nodes, viewport, meta, withText);
    }
    while (svg.length > maxBytes && nodes.length > 1) {
        nodes = nodes.slice(0, Math.floor(nodes.length / 2));
        svg = render(nodes, viewport, meta, withText);
    }
    return svg;
}
