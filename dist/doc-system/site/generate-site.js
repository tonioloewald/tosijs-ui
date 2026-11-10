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
import { pageTitle, withoutProjectSuffix } from '../doc-title.js';
import { highlightHtml } from '../highlight.js';
import { DOC_SYSTEM_FONTS_URL } from '../doc-fonts.js';
import { aliasProblems, buildSlugMap, pathForSlug, rewriteDocLinks, withBase, wikilinkTargets, } from '../routing.js';
import { buildNavTree, navOpenPath } from '../nav-tree.js';
import { renderDocMarkdown, } from '../render.js';
import { accessibilityFindings, findingLine } from './a11y-report.js';
import { pageDescription } from './page-metadata.js';
import { imageSize } from './image-size.js';
import { bareNameLinks, deadInPageAnchors, missingWikilinks, misconfigured, } from './build-warnings.js';
import { existsSync } from 'fs';
const escapeAttr = (s) => s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
const escapeText = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
/**
 * A section's disclosure toggle. A real button BESIDE the link, not a `<summary>` around it:
 * a link inside a summary is a control inside a control, which a screen reader announces as
 * one and loses the other (axe `nested-interactive`, #3520). Named by the section title, so
 * it reads "Components, expanded, button". The hydrated nav builds the same markup.
 */
export function navToggleHtml(title, listId, open) {
    return `<button type="button" class="nav-toggle" aria-expanded="${open}" aria-controls="${escapeAttr(listId)}" aria-label="${escapeAttr(title)}"></button>`;
}
/**
 * Build the hierarchical nav. Parents render as
 * <li class="nav-branch"><div class="nav-branch-head"><button/><a/></div><ul/></li>, with
 * `-open` on the sections on the path to `currentFilename`. `currentFilename` gets
 * aria-current. Crawlable + no-JS: every node is a real <a>, and without JS (no `tosi-js`
 * class on <html>) no section collapses, since nothing could open it.
 */
function navHtml(docs, slugMap, currentFilename, depth) {
    const roots = buildNavTree(docs, slugMap);
    const open = navOpenPath(roots, currentFilename);
    const renderNode = (node, indent) => {
        const href = relativeUrl(depth, pathForSlug(node.slug));
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
        const isOpen = open.has(node.doc.filename);
        const kids = node.children
            .map((c) => renderNode(c, indent + '  '))
            .join('\n');
        // Prefixed so it cannot collide with a heading id (`## Nav Components` → nav-components).
        const listId = `tosi-nav-${node.slug || 'home'}`;
        return (`${indent}<li class="nav-branch${isOpen ? ' -open' : ''}">` +
            `<div class="nav-branch-head">${navToggleHtml(node.doc.title, listId, isOpen)}${link}</div>\n` +
            `${indent}<ul id="${escapeAttr(listId)}">\n${kids}\n${indent}</ul></li>`);
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
/** Image types a share card may be, in the order a page's card is looked for. */
const CARD_TYPES = ['webp', 'png', 'jpg', 'jpeg'];
/**
 * The image a share of this page shows (#3562): the page's own `image`, else its card at
 * `/og/<slug>.webp` (or .png/.jpg) when the site has one (`bun run og` writes them, and any
 * static folder can supply them), else the site's `ogImage`, else the home page's card. A card
 * nobody linked was a card no share ever showed.
 */
function pageImage(doc, slug, config) {
    if (doc.image)
        return doc.image;
    const card = (name) => {
        if (!config.outputDir)
            return '';
        const type = CARD_TYPES.find((t) => existsSync(`${config.outputDir}/og/${name}.${t}`));
        return type ? `/og/${name}.${type}` : '';
    };
    return card(slug || 'index') || config.ogImage || card('index');
}
/** The nav path from a top-level page down to `filename`, inclusive; [] when it is not in the nav. */
function navTrail(roots, filename) {
    for (const node of roots) {
        if (node.doc.filename === filename)
            return [node];
        const below = navTrail(node.children, filename);
        if (below.length)
            return [node, ...below];
    }
    return [];
}
/** Every nav page in reading order. */
function flattenNav(roots) {
    return roots.flatMap((node) => [node, ...flattenNav(node.children)]);
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
 *
 * Used ONLY for *metadata* URLs now (canonical, og:url, og:image, sitemap) — they
 * legitimately need the real absolute origin+path. *Functional* URLs go through
 * `relativeUrl` instead, so the artifact is mount-agnostic. See `relativeUrl`.
 */
// `withBase` now lives in ../routing.ts — see the note there (#144).
/**
 * Depth of a page below the site root: 0 for the root index (served at the mount
 * root), 1 for every `/slug/` page. The generator only ever emits a flat `/slug/`
 * tree (see `pathForSlug`), so a non-root page is always exactly one directory deep.
 */
export function pageDepth(slug) {
    return slug === '' ? 0 : 1;
}
/**
 * Rewrite a root-relative *functional* URL (asset ref, nav / content link) to be
 * relative to a page at `depth`, so ONE build works at ANY mount point — a GitHub
 * project page under `/repo`, a custom-domain root, or a moved mount — with no
 * `basePath` rebuild. Relative URLs resolve against wherever the page is actually
 * served, so `basePath` is deliberately NOT applied here: a page at `/repo/x/`
 * gets `../styles.css` → `/repo/styles.css`, the same page at `/x/` gets it at
 * `/styles.css`. External (`https://…`, `//…`) and already-relative refs pass
 * through untouched. (Metadata URLs still use `withBase` — they need the absolute
 * origin.) See issue #25; the runtime/SPA-navigation half is issue #16.
 */
export function relativeUrl(depth, p) {
    if (!p || /^(https?:)?\/\//.test(p) || !p.startsWith('/'))
        return p;
    const rel = '../'.repeat(depth) + p.slice(1);
    return rel === '' ? './' : rel;
}
/**
 * The header `logo` as every page can use it (#3926). A relative image path (`favicon.svg`,
 * `img/mark.png`, `./mark.png`) names a file at the site root, but the header is drawn on pages
 * at `/x/` and `/x/y/`, where the browser resolved it against the page and fetched `/x/favicon.svg`.
 * It is made root-absolute here, with `basePath`, once for every page: the client navigates
 * between pages without reloading, so a per-page relative path would go stale. Icon names,
 * inline SVG, root-absolute paths, `data:` and full URLs pass through.
 */
export function siteLogo(logo, basePath) {
    if (!logo ||
        logo.trimStart().startsWith('<') ||
        logo.startsWith('/') ||
        logo.startsWith('data:') ||
        /^[a-z][a-z0-9+.-]*:/i.test(logo))
        return logo;
    const relative = logo.startsWith('./') ||
        logo.startsWith('../') ||
        /\.(png|jpe?g|gif|webp|avif|svg|ico)(\?.*)?$/i.test(logo);
    if (!relative)
        return logo; // an icon name
    const { pathname, search } = new URL(logo, 'https://site.invalid/');
    return withBase(basePath, pathname + search);
}
async function pageHtml(doc, config, slugMap, configAttr, wikilinks, 
/** the slug this copy is written at: the doc's own, or an alias of it */
at = slugMap[doc.filename] ?? '', 
/** the directory depth its references resolve from: 0 for the `/slug` copy (`slug.html`) */
depth = pageDepth(at)) {
    const { projectName = '', baseUrl = '', lang = 'en', favicon = '/favicon.svg', docsUrl = '/docs.json', scriptUrl = '/iife.js', hydrateUrl, stylesUrl = '/doc-system.css', assetStamp, docsStamp, localizedUrl = '/localized-strings.txt', basePath, headExtra = '', bakes, } = config;
    // Functional URLs are emitted relative to THIS page's depth so the build is
    // mount-agnostic (issue #25); metadata URLs below stay absolute via withBase.
    const own = slugMap[doc.filename] ?? '';
    const localizedAttr = config.localizedStrings
        ? ` localized="${escapeAttr(relativeUrl(depth, localizedUrl))}"`
        : '';
    /*
    Stamped on the static HTML, not applied by script after load.
  
    The whole point of pre-rendering is that the page is right before any JS runs; a layout
    applied on hydration would show the reading column first and snap wide — the same class of
    flicker the nav-hydration fix chased in 1.7.3. An attribute in the served markup means the
    first paint is already correct, and the doc-browser keeps it in step on SPA navigation.
    */
    const layoutAttr = (doc.layout ? ` data-layout="${escapeAttr(doc.layout)}"` : '') +
        (doc.header === false ? ' data-no-header' : '');
    // ONE rule, shared with the doc-browser's hydration path — see doc-title.ts. Writing
    // it twice is what made the title change on hydration (issue #6).
    const title = pageTitle(doc, projectName);
    // Per-page metadata (from the doc's JSON block) wins; else derive, else site default.
    const description = pageDescription(doc, config.description).text;
    const keywords = Array.isArray(doc.keywords)
        ? doc.keywords.join(', ')
        : doc.keywords || '';
    const canonical = baseUrl + withBase(basePath, pathForSlug(slugMap[doc.filename]));
    const image = pageImage(doc, own, config);
    const imageAbs = absUrl(baseUrl, withBase(basePath, image));
    const imageDims = image.startsWith('/') && !image.startsWith('//') && config.outputDir
        ? imageSize(`${config.outputDir}${image}`)
        : undefined;
    // Rewrite legacy `?filename` content links to clean `/slug/` paths so the
    // static HTML is correct for no-JS readers and crawlers (the doc-browser also
    // does this client-side after hydration).
    const rendered = rewriteDocLinks(await highlightHtml(renderDocMarkdown(doc.text, {
        bakes: bakes?.get(doc.filename),
        wikilinks,
        accessible: !!config.accessibility,
        title: doc.title,
    }), 
    // The SAME policy the client will apply, so the build and the browser agree about
    // which blocks are live examples and which are static code to highlight.
    config.liveExamples ?? 'auto'), (filename) => slugMap[filename] !== undefined
        ? relativeUrl(depth, pathForSlug(slugMap[filename]))
        : null);
    // A copy anywhere but the page's own path (an alias, or `/slug` with no slash): what the
    // author wrote relative to that path must still reach the same file (a README's
    // `img/logo.png` is /img/logo.png, not /readme/img/logo.png).
    const body = at === own && depth === pageDepth(own)
        ? rendered
        : rebaseRelativeRefs(rendered, pathForSlug(own), depth);
    const nav = navHtml(config.docs, slugMap, doc.filename, depth);
    const navbar = linkListHtml('doc-navbar', config.navbarLinks);
    // Reading order and the page's place in the nav, for breadcrumbs and prev/next.
    const roots = buildNavTree(config.docs, slugMap);
    const trail = navTrail(roots, doc.filename);
    const order = flattenNav(roots);
    const position = order.findIndex((n) => n.doc.filename === doc.filename);
    const pageUrl = (node) => baseUrl + withBase(basePath, pathForSlug(node.slug));
    const book = config.kind === 'book';
    const prev = book && position > 0 ? order[position - 1] : undefined;
    const next = book && position >= 0 ? order[position + 1] : undefined;
    const isHome = own === '';
    const modified = config.modified?.get(doc.path);
    const author = doc.author || config.author;
    const site = book
        ? {
            '@type': 'Book',
            name: projectName,
            url: baseUrl + withBase(basePath, '/'),
            // The book's author, not this chapter's.
            ...(config.author
                ? { author: { '@type': 'Person', name: config.author } }
                : {}),
        }
        : {
            '@type': 'WebSite',
            name: projectName,
            url: baseUrl + withBase(basePath, '/'),
        };
    const jsonLd = baseUrl
        ? jsonLdScript(isHome
            ? {
                '@context': 'https://schema.org',
                ...site,
                description,
                inLanguage: lang,
                ...(imageAbs ? { image: imageAbs } : {}),
                ...(modified ? { dateModified: modified } : {}),
            }
            : {
                '@context': 'https://schema.org',
                '@type': book ? 'Chapter' : 'TechArticle',
                // The page's own name, without the " — project" suffix the <title> adds.
                headline: withoutProjectSuffix(doc.headTitle?.trim() || doc.title, projectName),
                ...(book ? { name: doc.title, position: position + 1 } : {}),
                description,
                url: canonical,
                inLanguage: lang,
                ...(imageAbs ? { image: imageAbs } : {}),
                ...(doc.date ? { datePublished: doc.date } : {}),
                ...(modified ? { dateModified: modified } : {}),
                ...(author
                    ? { author: { '@type': 'Person', name: author } }
                    : {}),
                isPartOf: site,
            }) +
            /*
            Its own item: `breadcrumb` is a property of a WebPage, not of an article, so nested in
            the TechArticle a search engine would not read it.
            */
            (trail.length > 1
                ? '\n' +
                    jsonLdScript({
                        '@context': 'https://schema.org',
                        '@type': 'BreadcrumbList',
                        itemListElement: trail.map((node, i) => ({
                            '@type': 'ListItem',
                            position: i + 1,
                            name: node.doc.title,
                            item: pageUrl(node),
                        })),
                    })
                : '')
        : '';
    const head = [
        // The web fonts are linked here, not @imported by the stylesheet: an @import waits for
        // the stylesheet holding it, so it was a second blocking request in series (#3631).
        // display=swap paints the fallback font until they arrive.
        '  <link rel="preconnect" href="https://fonts.googleapis.com" />',
        '  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />',
        // Burned-in theme: styles the page with no JS and with zero flash on hydration.
        `  <link rel="stylesheet" href="${escapeAttr(withStamp(relativeUrl(depth, stylesUrl), assetStamp))}" data-tosi-doc-system />`,
        `  <link rel="stylesheet" href="${escapeAttr(DOC_SYSTEM_FONTS_URL)}" />`,
        `  <title>${escapeText(title)}</title>`,
        description
            ? `  <meta name="description" content="${escapeAttr(description)}" />`
            : '',
        keywords
            ? `  <meta name="keywords" content="${escapeAttr(keywords)}" />`
            : '',
        doc.noindex ? '  <meta name="robots" content="noindex, follow" />' : '',
        baseUrl ? `  <link rel="canonical" href="${escapeAttr(canonical)}" />` : '',
        // A book's reading order, for readers and agents that follow it. Relative, like the nav.
        prev
            ? `  <link rel="prev" href="${escapeAttr(relativeUrl(depth, pathForSlug(prev.slug)))}" />`
            : '',
        next
            ? `  <link rel="next" href="${escapeAttr(relativeUrl(depth, pathForSlug(next.slug)))}" />`
            : '',
        // Relative to the page's own directory, so it holds at any mount (see relativeUrl).
        hasMarkdownPage(doc, config)
            ? `  <link rel="alternate" type="text/markdown" href="index.md" title="${escapeAttr(title)} (markdown)" />`
            : '',
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
        imageAbs && imageDims
            ? `  <meta property="og:image:width" content="${imageDims.width}" />\n` +
                `  <meta property="og:image:height" content="${imageDims.height}" />`
            : '',
        imageAbs
            ? `  <meta property="og:image:alt" content="${escapeAttr(title)}" />`
            : '',
        `  <meta name="twitter:card" content="${imageAbs ? 'summary_large_image' : 'summary'}" />`,
        imageAbs
            ? `  <meta name="twitter:image" content="${escapeAttr(imageAbs)}" />\n` +
                `  <meta name="twitter:image:alt" content="${escapeAttr(title)}" />`
            : '',
        jsonLd,
        `  <link rel="icon" href="${escapeAttr(relativeUrl(depth, favicon))}" />`,
        headExtra,
    ]
        .filter(Boolean)
        .join('\n');
    /*
    Two notes that used to ship as HTML comments at the top of every page's <head>. They are for
    whoever edits this template, not for readers, and they pushed `<meta charset>` to byte ~1550
    — the HTML spec wants it within the first 1024, and a byte-limited or strict fetcher may give
    up before it gets there. So charset and viewport now lead, and the notes live here.
  
    1. The body is NOT hidden until hydration. It used to be (body opacity 0 + a 4s safety-net
       timeout), because an undefined custom element is display:inline, so the pre-rendered page
       stacked as bare text and hydration reflowed the whole thing. The cost was a blank screen
       for as long as the bundle took — ~4.5s on a cheap phone, for content already in the HTML.
       The tosi-doc-system:not(:defined) rules in the stylesheet now lay the static page out as
       though the chrome were there, so hydration only ADDS the chrome and nothing moves. Paint
       immediately; don't hide readable content.
  
    2. The inline script applies the theme BEFORE first paint. Now that we paint the static page
       rather than hiding it, a dark-mode reader would otherwise get a flash of the light theme
       until the bundle lands and sets body.darkmode. CSS alone can't do this: an explicit theme
       choice lives in localStorage. Mirrors applyThemePrefs() (doc-system.ts) — keep the two in
       step. Fails safe: any error leaves the light default.
  
    3. It marks <html> with `tosi-js`, which is what lets a closed nav section collapse (#3520):
       without JavaScript nothing could open one, so none collapses. And it opens and closes the
       static nav's sections until the doc system upgrades, so a reader on a slow bundle, or one
       whose bundle failed, can still use them. Once the element is defined the hydrated nav
       handles its own toggles and this stands down, so a click never toggles twice.
    */
    return `<!DOCTYPE html>
<html lang="${escapeAttr(lang)}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <script>
    document.documentElement.classList.add('tosi-js')
    document.addEventListener('click', function (e) {
      if (customElements.get('tosi-doc-system')) return
      var b = e.target.closest && e.target.closest('.doc-nav .nav-toggle')
      if (!b) return
      var open = b.closest('.nav-branch').classList.toggle('-open')
      b.setAttribute('aria-expanded', String(open))
    })
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
  <tosi-doc-system docs="${escapeAttr(
    // STAMPED, like the stylesheet and the bundles below. `docs.json` is the whole corpus
    // — nav, routes, every page's content — and it was the one generated URL emitted bare.
    // A static host sends no `Cache-Control` for it, so browsers apply HEURISTIC caching
    // and are free to invent a freshness lifetime: the site then renders a previous
    // deploy's corpus against the current bundle, with nothing in the console to say so.
    // That cost a maintainer "a ton of time debugging" before it was traced to a Chrome
    // cache entry. The dev server already sends `no-store`; this is the built site.
    withStamp(relativeUrl(depth, docsUrl), docsStamp ?? assetStamp))}" config="${configAttr}"${localizedAttr}${layoutAttr}>
  <article class="doc-content" data-doc="${escapeAttr(doc.filename)}">
${body}
  </article>
${nav}
${navbar}
  </tosi-doc-system>
  ${hydrateUrl
        ? // NOT stamped (#191): its filename already carries a content hash, and chunks import it
            // by that bare name, so a `?v=` would make the page load a second module instance.
            `<script type="module" src="${escapeAttr(relativeUrl(depth, hydrateUrl))}"></script>`
        : `<script src="${escapeAttr(withStamp(relativeUrl(depth, scriptUrl), assetStamp))}"></script>`}
</body>
</html>
`;
}
/*
Append the build stamp to a SAME-ORIGIN asset URL.

Only same-origin: `scriptUrl` may legitimately point at a CDN, and appending a query to
someone else's URL can miss their cache key or, worse, be rejected. A URL that already carries
a query is left alone — the caller has said something deliberate about it.
*/
/** A page gets a markdown copy unless the site opted out or the page is `noindex`. */
function hasMarkdownPage(doc, config) {
    return config.markdownPages !== false && !doc.noindex;
}
export function withStamp(url, stamp) {
    if (!stamp)
        return url;
    if (url.includes('?') || url.includes('#'))
        return url;
    if (/^[a-z][a-z0-9+.-]*:|^\/\//i.test(url))
        return url;
    return `${url}?v=${encodeURIComponent(stamp)}`;
}
/**
 * Rewrite the relative `href`/`src` references in rendered page HTML, written for a page at
 * `fromPath` ('/' or '/slug/'), so they reach the same files from a page at `depth`. Rooted
 * (`/x`), external, `#`, `?` and `data:`-style references are left alone.
 */
export function rebaseRelativeRefs(html, fromPath, depth) {
    return html.replace(/(\s(?:href|src|poster)=")([^"]*)"/g, (match, attr, ref) => {
        if (!ref || /^(?:[a-z][a-z0-9+.-]*:|\/|#|\?)/i.test(ref))
            return match;
        const rooted = new URL(ref, `https://x${fromPath}`);
        return `${attr}${relativeUrl(depth, rooted.pathname + rooted.search + rooted.hash)}"`;
    });
}
export async function generateSite(config) {
    const { docs, outputDir } = config;
    const slugMap = buildSlugMap(docs);
    const wikilinks = wikilinkTargets(docs);
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
    // A wrong alias fails the build like a `home` that names no page: it is a typo or a
    // renamed page, and a site with a dead path is not one to ship quietly.
    const aliases = config.aliases ?? {};
    const problems = aliasProblems(aliases, slugMap);
    if (problems.length) {
        throw new Error(`generate-site: aliases are wrong:\n${problems
            .map((p) => `    ${p}`)
            .join('\n')}`);
    }
    const configAttr = escapeAttr(JSON.stringify({
        projectName: config.projectName,
        // The browser needs them too, or an alias page hydrates as whichever doc comes first.
        ...(Object.keys(aliases).length ? { aliases } : {}),
        projectLinks: config.projectLinks,
        logo: siteLogo(config.logo, config.basePath),
        bookVolumes: config.bookVolumes,
        ebooks: config.ebooks,
        searchPlaceholder: config.searchPlaceholder,
        accessibility: config.accessibility,
    }));
    // The theme stylesheet (config.stylesUrl) is written separately by
    // ./generate-css.ts; pages here just <link> to it.
    let count = 0;
    const deadAnchors = [];
    const bareLinks = [];
    const danglingWikilinks = [];
    const a11yFindings = [];
    for (const doc of docs) {
        const slug = slugMap[doc.filename];
        const dir = slug === '' ? outputDir : `${outputDir}/${slug}`;
        const rendered = renderDocMarkdown(doc.text, {
            wikilinks,
            accessible: !!config.accessibility,
            title: doc.title,
        });
        const dead = deadInPageAnchors(rendered);
        // On the root page (`/`) a bare name resolves to `/name`, which works; elsewhere it does not.
        const bare = slug === '' ? [] : bareNameLinks(rendered);
        const dangling = missingWikilinks(rendered);
        if (dangling.length)
            danglingWikilinks.push(`    ${doc.path || doc.filename}: ${dangling
                .map((t) => `[[${t}]]`)
                .join(', ')}`);
        if (config.accessibility) {
            const found = accessibilityFindings(doc.text, doc.title);
            if (found.length) {
                const file = doc.path || doc.filename;
                let source = '';
                try {
                    source = doc.path ? await Bun.file(doc.path).text() : '';
                }
                catch {
                    // a doc with no readable source is still reported, by file only
                }
                for (const finding of found) {
                    const line = source && findingLine(source, finding.raw);
                    a11yFindings.push(`    ${file}${line ? `:${line}` : ''}  ${finding.message}`);
                }
            }
        }
        if (bare.length)
            bareLinks.push(`    ${doc.path || doc.filename}: ${bare.join(', ')}`);
        if (dead.length)
            deadAnchors.push(`    ${doc.path || doc.filename}: ${dead
                .map((d) => `#${d}`)
                .join(', ')}`);
        await Bun.write(`${dir}/index.html`, await pageHtml(doc, config, slugMap, configAttr, wikilinks));
        // The page's own source, for readers that want text rather than a page.
        if (hasMarkdownPage(doc, config)) {
            await Bun.write(`${dir}/index.md`, doc.text.trimEnd() + '\n');
        }
        count += 1;
    }
    /*
    Each alias is the page again, written where the alias is served, so its relative references
    (stylesheet, bundle, docs.json, nav links) resolve from there. A host rewrite to the original
    page cannot do that: it serves the same bytes at a different depth and the page never
    hydrates (board #3513). The canonical link stays the page's own path.
    */
    for (const [alias, target] of Object.entries(aliases)) {
        const doc = docs.find((d) => slugMap[d.filename] === target);
        const dir = `${outputDir}/${alias}`;
        // The output folder starts empty, so anything already here is a static file or folder, or
        // one the build wrote (`tjs/`, `_chunks/`): an alias must not write into it.
        if (existsSync(dir)) {
            throw new Error(`generate-site: the alias "${alias}" names /${alias}/, which the site already has ` +
                `(a static file or folder, or one the build writes); choose another name`);
        }
        await Bun.write(`${dir}/index.html`, await pageHtml(doc, config, slugMap, configAttr, wikilinks, alias));
        if (hasMarkdownPage(doc, config)) {
            await Bun.write(`${dir}/index.md`, doc.text.trimEnd() + '\n');
        }
    }
    /*
    Every page again as `slug.html`, with its references written for `/slug`, so the trailing
    slash is optional. Hosts serve `/slug` from `slug/index.html` with a redirect, and a client
    that does not follow it (an agent's fetch tool, onboarding from a typed URL) got a "moved"
    stub instead of the page. With `slug.html` beside it, a host that resolves extensionless
    paths to `.html` (GitHub Pages, Netlify, Cloudflare Pages, Firebase with `cleanUrls`)
    answers `/slug` with the page itself. The canonical link stays `/slug/`.
    */
    const slashless = [
        ...docs.map((doc) => [slugMap[doc.filename], doc]),
        ...Object.entries(aliases).map(([alias, target]) => [alias, docs.find((d) => slugMap[d.filename] === target)]),
    ];
    const occupied = [];
    for (const [at, doc] of slashless) {
        if (at === '')
            continue;
        const file = `${outputDir}/${at}.html`;
        // the output folder starts empty, so a file here is one the site ships: leave it alone
        if (existsSync(file)) {
            occupied.push(`    /${at}.html`);
            continue;
        }
        await Bun.write(file, await pageHtml(doc, config, slugMap, configAttr, wikilinks, at, 0));
    }
    if (occupied.length) {
        console.warn(`\n⚠️  These pages are served only at /slug/, because the site already has a file where\n` +
            `    the /slug copy goes (rename the file to make the trailing slash optional):\n` +
            `${occupied.join('\n')}\n`);
    }
    if (danglingWikilinks.length) {
        misconfigured(config.strict, `\n⚠️  Wikilinks that reach no doc page. A target matches a page's slug (its file name)\n` +
            `    or its title; write [[slug|label]] to link one by file name, and an ordinary\n` +
            `    [label](/path/) for anything that is not a doc page (a static file or app):\n` +
            `${danglingWikilinks.join('\n')}\n`);
    }
    if (bareLinks.length) {
        misconfigured(config.strict, `\n⚠️  Links written as a bare page name. Every page is served at /slug/, so these\n` +
            `    resolve under the page they are on and reach nothing; write /name/ instead:\n` +
            `${bareLinks.join('\n')}\n`);
    }
    if (a11yFindings.length) {
        misconfigured(config.strict, `\n⚠️  Accessibility (${config.accessibility}): what the build cannot fix for you. An\n` +
            `    image needs alt text, or an italic caption paragraph straight after it; a\n` +
            `    heading goes one level below the one before; a link's text names where it goes:\n` +
            `${a11yFindings.join('\n')}\n`);
    }
    if (deadAnchors.length) {
        misconfigured(config.strict, `\n⚠️  In-page links that point at nothing on their page. A heading's id is its text,\n` +
            `    lowercased, punctuation dropped, spaces as "-" (a repeat gets -1, -2, …):\n` +
            `${deadAnchors.join('\n')}\n`);
    }
    // The corpus the component fetches for nav + client-side rendering of other pages.
    // Attach each doc's tjs bakes so client-side SPA navigation renders the same hidden
    // <script type="application/tosi-transpiled"> the pre-rendered page has, and runs
    // examples without the transpiler. Docs with no tjs examples add nothing. Attached
    // to a copy — never mutate the caller's docs. See self-contained-examples-plan.md.
    const { bakes } = config;
    const corpus = bakes
        ? docs.map((doc) => {
            const docBakes = bakes.get(doc.filename);
            return docBakes && docBakes.size
                ? { ...doc, bakes: [...docBakes.entries()] }
                : doc;
        })
        : docs;
    await Bun.write(`${outputDir}/docs.json`, JSON.stringify(corpus));
    // Translation table for the settings menu's language picker.
    if (config.localizedStrings) {
        const localizedPath = (config.localizedUrl || '/localized-strings.txt').replace(/^\//, '');
        await Bun.write(`${outputDir}/${localizedPath}`, config.localizedStrings);
    }
    // sitemap.xml + robots.txt (needs an absolute origin for the URLs).
    if (config.baseUrl) {
        const urls = docs
            .filter((doc) => !doc.noindex)
            .map((doc) => {
            const modified = config.modified?.get(doc.path);
            return `  <url><loc>${escapeText(config.baseUrl +
                withBase(config.basePath, pathForSlug(slugMap[doc.filename])))}</loc>${modified ? `<lastmod>${escapeText(modified)}</lastmod>` : ''}</url>`;
        })
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
    // A site's own 404.html (copied from its static files) wins.
    const home = docs.find((doc) => slugMap[doc.filename] === '');
    if (home && !existsSync(`${outputDir}/404.html`)) {
        await Bun.write(`${outputDir}/404.html`, notFoundHtml(await pageHtml(home, config, slugMap, configAttr, wikilinks, '', 0), slugMap, config));
    }
    return count;
}
/*
The page a host serves for a path the site does not have (#3631). GitHub Pages, Netlify and
Firebase serve `404.html` from the site root, with status 404, at whatever URL was asked for.

It is the home page, site chrome and all, with a note at the top: "404: there's nothing at
/gide/. Did you mean /guide/? Here's the home page instead." That is what tosijs-platform's
service-compris answers for a bad URL (#3913), so the two read the same. It is built from the
home page's own HTML, so it cannot drift from it, with four changes:

- a `<base>` at the site root, since the page is served at any depth and its URLs are written
  relative to the root;
- its own title, `noindex`, and no canonical link (it is not the home page's URL);
- the note, which names the path and, when one is close, the page that was probably meant;
- the script that fills the note in. Without JavaScript the note still says there is nothing
  here, and the nav lists every page.

It hydrates like any page: the doc browser shows the home doc for a path it does not know, and
the note goes with the first navigation, as the content is replaced.
*/
export function notFoundHtml(homeHtml, slugMap, config) {
    const { projectName = '', basePath } = config;
    const base = withBase(basePath, '/');
    const slugs = JSON.stringify(Object.values(slugMap).filter((slug) => slug !== '')).replace(/</g, '\\u003c');
    const title = projectName
        ? `Page not found — ${projectName}`
        : 'Page not found';
    const note = `<p class="doc-not-found" role="status">404: there's nothing at <code id="not-found-path">this address</code>.<span id="not-found-closest"></span> Here's the home page instead.</p>`;
    const script = `<script>
    ;(() => {
      const slugs = ${slugs}
      const base = ${JSON.stringify(base)}
      const asked = decodeURIComponent(location.pathname)
      document.getElementById('not-found-path').textContent = asked
      const want = asked.slice(base.length - 1).replace(/^\\/+|\\/+$/g, '').toLowerCase()
      if (!want) return
      const distance = (a, b) => {
        const row = Array.from({ length: b.length + 1 }, (_, i) => i)
        for (let i = 1; i <= a.length; i++) {
          let prev = row[0]++
          for (let j = 1; j <= b.length; j++) {
            const next = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1))
            prev = row[j]
            row[j] = next
          }
        }
        return row[b.length]
      }
      let best = '', score = Infinity
      for (const slug of slugs) {
        const prefix = Math.min(want.length, slug.length) >= 3 && (slug.startsWith(want) || want.startsWith(slug))
        const d = prefix ? 0.5 : distance(want, slug)
        if (d < score) [best, score] = [slug, d]
      }
      if (score > Math.max(2, want.length / 3)) return
      const link = document.createElement('a')
      link.href = base + best + '/'
      link.textContent = base + best + '/'
      document.getElementById('not-found-closest').append(' Did you mean ', link, '?')
    })()
  </script>`;
    // Required anchors: if the page template changes under this, fail the build, not the page.
    const required = [
        [/<meta charset="utf-8" \/>/, `$&\n  <base href="${escapeAttr(base)}" />`],
        [
            /<title>[^<]*<\/title>/,
            `<title>${escapeText(title)}</title>\n  <meta name="robots" content="noindex" />`,
        ],
        [/<article class="doc-content"[^>]*>/, `$&\n${note}`],
        [/<\/body>/, `${script}\n</body>`],
    ];
    // The home page's own robots and canonical lines, when it has them.
    let html = homeHtml
        .replace(/ *<meta name="robots"[^>]*>\n/g, '')
        .replace(/ *<link rel="canonical"[^>]*>\n/g, '');
    for (const [pattern, replacement] of required) {
        if (!pattern.test(html))
            throw new Error(`notFoundHtml: the home page has no ${pattern}`);
        html = html.replace(pattern, replacement);
    }
    return html;
}
