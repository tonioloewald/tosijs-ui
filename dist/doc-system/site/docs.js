/*#
# docs

Utility for extracting documentation from markdown files and inline comments in source code.

> `docs.ts` is intended to be run directly using `bun`. You can transpile it to javascript if you
want to run it using node.

This is used by the `doc-browser` component to build searchable, navigable documentation
from your project's source files.

## Usage

    import { extractDocs } from 'docs'

    extractDocs({
      paths: ['src', 'README.md'],
      ignore: ['node_modules', 'dist', 'build']
      path: 'public/docs.json'
    })

## API

### `extractDocs(options)`

Scans directories for markdown files and source code comments.

**Options:**
- `paths`: Array of directory paths or file paths to scan
- `ignore`: Array of directory names to ignore (default: ['node_modules', 'dist'])
- `output`: if provided, path to write json result.

**Returns:** Array of `Doc` objects

### `Doc` object structure

    {
      text: string,        // Markdown content
      title: string,       // First heading or filename
      filename: string,    // Just the filename
      path: string,        // Full file path
      pin?: 'top' | 'bottom'  // Optional pinning for sort order
    }

## Documentation Format

### Markdown files

Any `.md` file will be included in its entirety.

### Source code comments

Multi-line comments that start with `/*#` will be extracted as markdown:

    /*#
    # My Component

    This is documentation for my component.

    ```html
    <my-component></my-component>
    ```
    ```js
    console.log('hello world')
    ```
    ```css
    my-componet {
      color: blue
    }
    ```
    *‎/

    export class MyComponent extends Component {
      // implementation
    }
    ...

The [doc-browser](/?doc-browser.ts) will render the output as a test-bed project with documentation and live examples.

### Metadata

You can include JSON metadata in comments to control sorting:

html:
    <!--{ "pin": "bottom" }-->

ts, js, css:
    /*{ "pin": "bottom" }*‎/

This pins the document to the top or bottom of the navigation list. Within a
pin bucket, add `"order"` (a number, lower first; default 500) to rank items —
e.g. `{ "pin": "top", "order": 1 }` above `{ "pin": "top", "order": 2 }`.
*/
/*{"pin":"bottom","parent":"Appendices"}*/
// TODO CLI options
import * as fs from 'fs';
import * as path from 'path';
import { pinnedSort } from '../nav-tree';
const TRIM_REGEX = /^#+ |`/g;
/**
 * Parse & strip a leading YAML frontmatter block (`---\n…\n---`). Every prose
 * toolchain (Jekyll/Hugo/Astro/Obsidian/Pandoc) uses it, so authors paste it in;
 * without this the `---` was rendered as content (and became the doc title).
 *
 * A minimal, dependency-free subset: `key: value` lines mapped onto doc metadata
 * (`title`, `order`→number, `author`, `date`, `draft: true`→hidden). Only strips
 * when the block actually parses as ≥1 key/value pair, so a genuine leading `---`
 * horizontal rule is left alone. Frontmatter wins over the JSON-comment metadata.
 */
export function parseFrontmatter(content) {
    const m = content.match(/^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*/);
    if (!m)
        return { data: {}, body: content };
    const data = {};
    let matched = false;
    for (const line of m[1].split(/\r?\n/)) {
        const kv = line.match(/^([A-Za-z][\w-]*)\s*:\s*(.*)$/);
        if (!kv)
            continue;
        matched = true;
        const key = kv[1].toLowerCase();
        const val = kv[2].trim().replace(/^["']|["']$/g, '');
        if (key === 'title') {
            if (val)
                data.title = val; // empty title falls back to the H1
        }
        else if (key === 'order') {
            const n = Number(val);
            if (!Number.isNaN(n))
                data.order = n;
        }
        else if (key === 'author') {
            if (val)
                data.author = val;
        }
        else if (key === 'date') {
            if (val)
                data.date = val;
        }
        else if (key === 'draft') {
            if (/^(true|yes|1)$/i.test(val))
                data.hidden = true; // drafts don't ship
        }
    }
    if (!matched)
        return { data: {}, body: content }; // a bare `---`, not frontmatter
    return { data, body: content.slice(m[0].length).replace(/^\r?\n+/, '') };
}
function metadata(content, filePath) {
    // Ignore metadata-style comments INSIDE /*# ... */ doc blocks — those are
    // documentation examples, not real directives. Only line-starting blocks count
    // as docs (see findMarkdownFiles), so strip exactly those.
    const scannable = content.replace(/^[ \t]*\/\*#[\s\S]*?\*\//gm, '');
    const source = scannable.match(/<!--(\{.*\})-->|\/\*(\{.*\})\*\//);
    let data = {};
    if (source) {
        try {
            data = JSON.parse(source[1] || source[2]);
        }
        catch {
            console.error('bad metadata in doc', filePath);
        }
    }
    // An empty/blank `title` must not override the H1 (it produced blank nav
    // entries) — drop it so the H1-derived title wins.
    if (typeof data.title === 'string' && data.title.trim() === '')
        delete data.title;
    return data;
}
function findMarkdownFiles(paths, ignore) {
    const markdownFiles = [];
    function traverseDirectory(dir, ignore) {
        console.log(dir);
        const files = fs.readdirSync(dir);
        const baseName = path.basename(dir);
        // Each ignore entry matches either by basename (node_modules, dist, build —
        // skipped wherever they appear) or by resolved path (e.g. the build's
        // output dir — skipped only at that exact location, so a source dir that
        // happens to share the name, like src/docs, is still scanned).
        const resolved = path.resolve(dir);
        if (ignore.some((ig) => ig === baseName || path.resolve(ig) === resolved)) {
            return;
        }
        files.forEach((file) => {
            // Skip scaffolding / working files (Jekyll-style `_`-prefix): a
            // `_template.md` or `_drafting-log.md` shouldn't leak into the corpus or
            // the book.
            if (file.startsWith('_'))
                return;
            const filePath = path.join(dir, file);
            let stats;
            try {
                stats = fs.statSync(filePath);
            }
            catch {
                return;
            }
            if (stats.isDirectory()) {
                traverseDirectory(filePath, ignore);
            }
            else if (path.extname(file) === '.md') {
                const { data: fm, body: content } = parseFrontmatter(fs.readFileSync(filePath, 'utf8'));
                markdownFiles.push({
                    text: content,
                    title: content.split('\n')[0].replace(TRIM_REGEX, ''),
                    filename: file,
                    path: filePath,
                    ...metadata(content, filePath),
                    ...fm, // frontmatter wins over JSON-comment metadata + the H1
                });
            }
            else if (['.ts', '.js', '.css'].includes(path.extname(file))) {
                const content = fs.readFileSync(filePath, 'utf8');
                // A /*# … */ block is only a doc when it STARTS a line (whitespace-only
                // before the slash). This keeps a `/*#` that appears inside a // comment,
                // a string, or otherwise mid-line from being scraped as a spurious doc.
                // m[1] is the block without its leading indentation.
                const docs = [...content.matchAll(/^[ \t]*(\/\*#[\s\S]+?\*\/)/gm)].map((m) => m[1]);
                if (docs.length) {
                    const markdown = docs.map((s) => s.substring(3, s.length - 2).trim());
                    const text = markdown.join('\n\n');
                    markdownFiles.push({
                        text,
                        title: text.split('\n')[0].replace(TRIM_REGEX, ''),
                        filename: file,
                        path: filePath,
                        ...metadata(content, filePath),
                    });
                }
            }
        });
    }
    paths.forEach((dir) => {
        try {
            const stats = fs.statSync(dir);
            if (stats.isDirectory()) {
                traverseDirectory(dir, ignore);
            }
            else if (stats.isFile()) {
                const file = path.basename(dir);
                if (path.extname(file) === '.md') {
                    const { data: fm, body: content } = parseFrontmatter(fs.readFileSync(dir, 'utf8'));
                    markdownFiles.push({
                        text: content,
                        title: content.split('\n')[0].replace(TRIM_REGEX, ''),
                        filename: file,
                        path: dir,
                        ...metadata(content, dir),
                        ...fm,
                    });
                }
            }
        }
        catch (err) {
            console.error(`Could not read ${dir}:`, err);
        }
    });
    return markdownFiles.sort(pinnedSort);
}
export function extractDocs(options) {
    const { paths, ignore = ['node_modules', 'dist', 'build'], output, } = options;
    const docs = findMarkdownFiles(paths, ignore);
    if (output) {
        saveDocsJSON(docs, output);
    }
    return docs;
}
export function saveDocsJSON(docs, outputPath) {
    const jsonData = JSON.stringify(docs, null, 2);
    fs.writeFileSync(outputPath, jsonData, 'utf8');
    console.log(`Documentation saved to ${outputPath}`);
}
