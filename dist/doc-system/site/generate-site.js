/*
Static site generator for the doc system.

Emits one optimized, pre-rendered HTML file per doc at `/slug/index.html` (README
-> site root). Each page is complete without JavaScript — real <head> metadata, the
doc's markdown already rendered to HTML, and real <a> links to every other page —
then the <tosi-doc-system> element hydrates it into the interactive doc browser when
the IIFE bundle loads.

Build-time only (uses Bun.write). Shares slug + markdown rendering with the runtime
component (src/doc-system/*) so static and hydrated output agree.
*/
import { pageTitle } from '../doc-title';
import { buildSlugMap, pathForSlug, rewriteDocLinks } from '../routing';
import { buildNavTree, navOpenPath } from '../nav-tree';
import { renderDocMarkdown, docDescription } from '../render';
const escapeAttr = (s) => s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
const escapeText = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
/**
 * Build the hierarchical nav as nested <details>. Parents render as
 * <details><summary><a>…</a></summary><ul>…children…</ul></details>, with the
 * <details> on the path to `currentFilename` opened. `currentFilename` gets
 * aria-current. Crawlable + no-JS: every node is a real <a>.
 */
function navHtml(docs, slugMap, currentFilename, basePath) {
    const roots = buildNavTree(docs, slugMap);
    const open = navOpenPath(roots, currentFilename);
    const renderNode = (node, indent) => {
        const href = withBase(basePath, pathForSlug(node.slug));
        const current = node.doc.filename === currentFilename;
        // `doc-link` is what the HYDRATED nav emits, and the shared nav CSS is written
        // against it. Emitting a bare <a> here forced a second, hand-copied rule set under
        // `tosi-doc-system:not(:defined)` — which promptly drifted, so every generated page
        // painted its nav with brand-coloured underlines and 2.5px padding, then reflowed
        // (~4px per row, ~230px cumulative) into 5px/15px padding the moment the bundle
        // loaded. That flash is the exact thing "pre-render the chrome, hydrate in place"
        // exists to eliminate, and dropping the opacity gate made it VISIBLE instead of
        // merely masked. Same class → same CSS → nothing moves.
        const link = `<a class="doc-link${current ? ' current' : ''}" href="${escapeAttr(href)}"${current ? ' aria-current="page"' : ''}>${escapeText(node.doc.title)}</a>`;
        if (node.children.length === 0) {
            return `${indent}<li>${link}</li>`;
        }
        const isOpen = open.has(node.doc.filename) ? ' open' : '';
        const kids = node.children
            .map((c) => renderNode(c, indent + '  '))
            .join('\n');
        return (`${indent}<li><details${isOpen}><summary>${link}</summary>\n` +
            `${indent}<ul>\n${kids}\n${indent}</ul>\n` +
            `${indent}</details></li>`);
    };
    const items = roots.map((n) => renderNode(n, '    ')).join('\n');
    return `  <nav class="doc-nav" aria-label="Documentation">\n  <ul>\n${items}\n  </ul>\n  </nav>`;
}
/** Render a configurable link list (header bar or overflow menu) as crawlable HTML. */
function linkListHtml(className, links) {
    if (!links || links.length === 0)
        return '';
    const items = links
        .map((link) => `    <li><a href="${escapeAttr(link.href)}"${link.icon ? ` data-icon="${escapeAttr(link.icon)}"` : ''}>${escapeText(link.label)}</a></li>`)
        .join('\n');
    return `  <ul class="${className}">\n${items}\n  </ul>`;
}
/** Serialize a JSON-LD object into a safe <script> (escaping `<` prevents breakout). */
function jsonLdScript(obj) {
    return `  <script type="application/ld+json">${JSON.stringify(obj).replace(/</g, '\\u003c')}</script>`;
}
/** Absolute URL for an asset path against the site origin (passes through full URLs). */
function absUrl(baseUrl, pathOrUrl) {
    if (!pathOrUrl)
        return '';
    return /^https?:\/\//.test(pathOrUrl) ? pathOrUrl : baseUrl + pathOrUrl;
}
/**
 * Prefix a root-relative path with basePath. No-op for '/', empty, protocol-
 * relative (`//…`), or absolute (`https://…`) URLs.
 */
function withBase(basePath, p) {
    if (!p || !basePath || basePath === '/' || /^(https?:)?\/\//.test(p))
        return p;
    return basePath.replace(/\/$/, '') + (p.startsWith('/') ? p : '/' + p);
}
function pageHtml(doc, config, slugMap, configAttr) {
    const { projectName = '', baseUrl = '', lang = 'en', favicon = '/favicon.svg', docsUrl = '/docs.json', scriptUrl = '/iife.js', hydrateUrl, stylesUrl = '/doc-system.css', localizedUrl = '/localized-strings.txt', basePath, headExtra = '', } = config;
    const localizedAttr = config.localizedStrings
        ? ` localized="${escapeAttr(withBase(basePath, localizedUrl))}"`
        : '';
    // ONE rule, shared with the doc-browser's hydration path — see doc-title.ts. Writing
    // it twice is what made the title change on hydration (issue #6).
    const title = pageTitle(doc, projectName);
    // Per-page metadata (from the doc's JSON block) wins; else derive, else site default.
    const description = doc.description || docDescription(doc.text) || config.description || '';
    const keywords = Array.isArray(doc.keywords)
        ? doc.keywords.join(', ')
        : doc.keywords || '';
    const canonical = baseUrl + withBase(basePath, pathForSlug(slugMap[doc.filename]));
    const imageAbs = absUrl(baseUrl, withBase(basePath, doc.image || config.ogImage || ''));
    // Rewrite legacy `?filename` content links to clean `/slug/` paths so the
    // static HTML is correct for no-JS readers and crawlers (the doc-browser also
    // does this client-side after hydration).
    const body = rewriteDocLinks(renderDocMarkdown(doc.text), (filename) => slugMap[filename] !== undefined
        ? withBase(basePath, pathForSlug(slugMap[filename]))
        : null);
    const nav = navHtml(config.docs, slugMap, doc.filename, basePath);
    const navbar = linkListHtml('doc-navbar', config.navbarLinks);
    const jsonLd = baseUrl
        ? jsonLdScript({
            '@context': 'https://schema.org',
            '@type': 'TechArticle',
            headline: doc.title,
            description,
            url: canonical,
            inLanguage: lang,
            ...(imageAbs ? { image: imageAbs } : {}),
            isPartOf: { '@type': 'WebSite', name: projectName, url: baseUrl },
        })
        : '';
    const head = [
        '  <meta charset="utf-8" />',
        '  <meta name="viewport" content="width=device-width, initial-scale=1" />',
        // Render-blocking @import of web fonts lives in the stylesheet; warm the connection.
        '  <link rel="preconnect" href="https://fonts.googleapis.com" />',
        '  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />',
        // Burned-in theme: styles the page with no JS and with zero flash on hydration.
        `  <link rel="stylesheet" href="${escapeAttr(withBase(basePath, stylesUrl))}" data-tosi-doc-system />`,
        `  <title>${escapeText(title)}</title>`,
        description
            ? `  <meta name="description" content="${escapeAttr(description)}" />`
            : '',
        keywords
            ? `  <meta name="keywords" content="${escapeAttr(keywords)}" />`
            : '',
        doc.noindex ? '  <meta name="robots" content="noindex, follow" />' : '',
        baseUrl ? `  <link rel="canonical" href="${escapeAttr(canonical)}" />` : '',
        '  <meta property="og:type" content="article" />',
        projectName
            ? `  <meta property="og:site_name" content="${escapeAttr(projectName)}" />`
            : '',
        `  <meta property="og:title" content="${escapeAttr(title)}" />`,
        description
            ? `  <meta property="og:description" content="${escapeAttr(description)}" />`
            : '',
        baseUrl
            ? `  <meta property="og:url" content="${escapeAttr(canonical)}" />`
            : '',
        imageAbs
            ? `  <meta property="og:image" content="${escapeAttr(imageAbs)}" />`
            : '',
        `  <meta name="twitter:card" content="${imageAbs ? 'summary_large_image' : 'summary'}" />`,
        imageAbs
            ? `  <meta name="twitter:image" content="${escapeAttr(imageAbs)}" />`
            : '',
        jsonLd,
        `  <link rel="icon" href="${escapeAttr(withBase(basePath, favicon))}" />`,
        headExtra,
    ]
        .filter(Boolean)
        .join('\n');
    return `<!DOCTYPE html>
<html lang="${escapeAttr(lang)}">
<head>
  <!-- NB: the body is NOT hidden until hydration. It used to be (body opacity 0 +
       a 4s safety-net timeout), because an undefined custom element is
       display:inline, so the pre-rendered page stacked as bare text and hydration
       reflowed the whole thing. The cost was a blank screen for as long as the
       bundle took — ~4.5s on a cheap phone, for content already in the HTML. The
       tosi-doc-system:not(:defined) rules in the stylesheet now lay the static page
       out as though the chrome were there, so hydration only ADDS the chrome and
       nothing moves. Paint immediately; don't hide readable content. -->
  <!-- Theme, applied BEFORE first paint. Now that we paint the static page rather
       than hiding it, a dark-mode reader would otherwise get a flash of the light
       theme until the bundle lands and sets body.darkmode. CSS alone can't do this:
       an explicit theme choice lives in localStorage. Mirrors applyThemePrefs()
       (doc-system.ts) — keep the two in step. Fails safe: any error leaves the
       light default, exactly as before. -->
  <script>
    try {
      var p = JSON.parse(localStorage.getItem('tosi-doc-system-prefs') || '{}')
      var t = p.theme || 'system'
      if (t === 'dark' || (t === 'system' && matchMedia('(prefers-color-scheme: dark)').matches))
        document.documentElement.classList.add('darkmode')
      if (p.highContrast) document.documentElement.classList.add('high-contrast')
    } catch (e) {}
  </script>
${head}
</head>
<body>
  <tosi-doc-system docs="${escapeAttr(withBase(basePath, docsUrl))}" config="${configAttr}"${localizedAttr}>
  <article class="doc-content">
${body}
  </article>
${nav}
${navbar}
  </tosi-doc-system>
  ${hydrateUrl
        ? `<script type="module" src="${escapeAttr(withBase(basePath, hydrateUrl))}"></script>`
        : `<script src="${escapeAttr(withBase(basePath, scriptUrl))}"></script>`}
</body>
</html>
`;
}
export async function generateSite(config) {
    const { docs, outputDir } = config;
    const slugMap = buildSlugMap(docs);
    // Surface any slug collisions (the slug map disambiguates them, but a warning
    // tells the maintainer two docs share a base name).
    const seen = new Map();
    for (const doc of docs) {
        const slug = slugMap[doc.filename];
        if (seen.has(slug)) {
            console.warn(`generate-site: slug "${slug}" used by both ${seen.get(slug)} and ${doc.filename}`);
        }
        seen.set(slug, doc.filename);
    }
    const configAttr = escapeAttr(JSON.stringify({
        projectName: config.projectName,
        projectLinks: config.projectLinks,
    }));
    // The theme stylesheet (config.stylesUrl) is written separately by
    // ./generate-css.ts; pages here just <link> to it.
    let count = 0;
    for (const doc of docs) {
        const slug = slugMap[doc.filename];
        const dir = slug === '' ? outputDir : `${outputDir}/${slug}`;
        await Bun.write(`${dir}/index.html`, pageHtml(doc, config, slugMap, configAttr));
        count += 1;
    }
    // The corpus the component fetches for nav + client-side rendering of other pages.
    await Bun.write(`${outputDir}/docs.json`, JSON.stringify(docs));
    // Translation table for the settings menu's language picker.
    if (config.localizedStrings) {
        const localizedPath = (config.localizedUrl || '/localized-strings.txt').replace(/^\//, '');
        await Bun.write(`${outputDir}/${localizedPath}`, config.localizedStrings);
    }
    // sitemap.xml + robots.txt (needs an absolute origin for the URLs).
    if (config.baseUrl) {
        const urls = docs
            .filter((doc) => !doc.noindex)
            .map((doc) => `  <url><loc>${escapeText(config.baseUrl +
            withBase(config.basePath, pathForSlug(slugMap[doc.filename])))}</loc></url>`)
            .join('\n');
        await Bun.write(`${outputDir}/sitemap.xml`, `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`);
        // Append a Sitemap line to robots.txt (already copied from static assets).
        const robotsPath = `${outputDir}/robots.txt`;
        let robots = '';
        try {
            robots = await Bun.file(robotsPath).text();
        }
        catch {
            /* no robots.txt copied — start from a permissive default */
        }
        if (!robots.includes('Sitemap:')) {
            const base = robots.trim()
                ? robots.trim() + '\n'
                : 'User-agent: *\nAllow: /\n';
            await Bun.write(robotsPath, `${base}Sitemap: ${config.baseUrl}/sitemap.xml\n`);
        }
    }
    return count;
}
