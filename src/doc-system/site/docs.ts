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

import * as fs from 'fs'
import * as path from 'path'
import {
  truncationWarnings,
  formatTruncationWarnings,
  type TruncationWarning,
} from './truncated-doc.js'
import { pinnedSort } from '../nav-tree.js'
import { buildSlugMap } from '../routing.js'
import { withoutHidden } from '../book-target.js'

export interface Doc {
  text: string
  title: string
  filename: string
  path: string
  pin?: 'top' | 'bottom'
  /** sub-order within a pin bucket (lower first); section docs use this */
  order?: number
  /** parent doc name or slug — groups this doc into a nav section */
  parent?: string
  /**
   * Not published AT ALL — absent from docs.json, from the generated pages, from every
   * book, and from llms.txt. For incomplete chapters and working notes.
   *
   * Inherited by descendants: hiding a section hides what is inside it. A child cannot
   * un-hide itself, because accidentally publishing one chapter of a withheld section is
   * the failure worth preventing.
   *
   * (`draft: true` in YAML frontmatter sets this.) Previously this only removed a doc
   * from the nav and books while leaving its full text in docs.json AND giving it a
   * pre-rendered public page — so "drafts don't ship" was false twice over.
   */
  hidden?: boolean
  /**
   * Which book(s) this doc binds into. A name, a list of names, or `'none'` to keep it
   * on the site and out of every book. Unset means the default book; `'default'` names
   * the default book so a list can include it — `["default", "appendices"]` binds the
   * doc into both, which is how shared front matter or a glossary works.
   *
   * Inherited down the `parent` chain, nearest declaration winning outright (a list
   * replaces an inherited value rather than adding to it) — so you mark a section, and an
   * individual chapter can still divert, join several volumes, or opt out.
   */
  book?: string | string[]
  // Opt-in SEO / agent metadata, provided in the doc's JSON block alongside `pin`:
  //   <!--{ "headTitle": "...", "description": "...", "keywords": "a, b", "image": "/og/x.webp" }-->
  // `title` (if provided) also renames the nav item + heading; `headTitle` sets only
  // the <title> tag (verbatim, no project suffix). The rest override head metadata.
  headTitle?: string
  description?: string
  keywords?: string | string[]
  image?: string
  noindex?: boolean
  // Build-time transpiled JS for this doc's `tjs` examples, as [source, {dialect, js}]
  // entries (a Map can't JSON-roundtrip). Attached by generate-site so client-side SPA
  // navigation renders the hidden `<script type="application/tosi-transpiled">` and runs
  // examples without the tjs transpiler. Absent when the doc has no tjs examples.
  bakes?: Array<[string, { dialect: string; js: string }]>
  // Common prose/frontmatter fields (carried through; author/date aren't consumed
  // by the doc system yet, but a book pipeline can use them).
  author?: string
  date?: string
}

export interface ExtractDocsOptions {
  paths: string[]
  ignore?: string[]
  output?: string
}

const TRIM_REGEX = /^#+ |`/g

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
export function parseFrontmatter(content: string): {
  data: Partial<Doc>
  body: string
} {
  const m = content.match(/^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*/)
  if (!m) return { data: {}, body: content }
  const data: Partial<Doc> = {}
  let matched = false
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([A-Za-z][\w-]*)\s*:\s*(.*)$/)
    if (!kv) continue
    matched = true
    const key = kv[1].toLowerCase()
    const val = kv[2].trim().replace(/^["']|["']$/g, '')
    if (key === 'title') {
      if (val) data.title = val // empty title falls back to the H1
    } else if (key === 'order') {
      const n = Number(val)
      if (!Number.isNaN(n)) data.order = n
    } else if (key === 'author') {
      if (val) data.author = val
    } else if (key === 'date') {
      if (val) data.date = val
    } else if (key === 'draft') {
      if (/^(true|yes|1)$/i.test(val)) data.hidden = true // drafts don't ship
    }
  }
  if (!matched) return { data: {}, body: content } // a bare `---`, not frontmatter
  return { data, body: content.slice(m[0].length).replace(/^\r?\n+/, '') }
}

function metadata(content: string, filePath: string): Partial<Doc> {
  // Ignore metadata-style comments INSIDE /*# ... */ doc blocks — those are
  // documentation examples, not real directives. Only line-starting blocks count
  // as docs (see findMarkdownFiles), so strip exactly those.
  const scannable = content.replace(/^[ \t]*\/\*#[\s\S]*?\*\//gm, '')
  const source = scannable.match(/<!--(\{.*\})-->|\/\*(\{.*\})\*\//)
  let data: Partial<Doc> = {}
  if (source) {
    try {
      data = JSON.parse(source[1] || source[2])
    } catch {
      console.error('bad metadata in doc', filePath)
    }
  }
  // An empty/blank `title` must not override the H1 (it produced blank nav
  // entries) — drop it so the H1-derived title wins.
  if (typeof data.title === 'string' && data.title.trim() === '')
    delete data.title
  return data
}

function findMarkdownFiles(paths: string[], ignore: string[]): Doc[] {
  const markdownFiles: Doc[] = []
  const truncationFound: TruncationWarning[] = []

  function traverseDirectory(dir: string, ignore: string[]) {
    console.log(dir)
    const files = fs.readdirSync(dir)
    const baseName = path.basename(dir)

    // Each ignore entry matches either by basename (node_modules, dist, build —
    // skipped wherever they appear) or by resolved path (e.g. the build's
    // output dir — skipped only at that exact location, so a source dir that
    // happens to share the name, like src/docs, is still scanned).
    const resolved = path.resolve(dir)
    if (ignore.some((ig) => ig === baseName || path.resolve(ig) === resolved)) {
      return
    }

    files.forEach((file) => {
      // Skip scaffolding / working files (Jekyll-style `_`-prefix): a
      // `_template.md` or `_drafting-log.md` shouldn't leak into the corpus or
      // the book.
      if (file.startsWith('_')) return
      const filePath = path.join(dir, file)
      let stats

      try {
        stats = fs.statSync(filePath)
      } catch {
        return
      }

      if (stats.isDirectory()) {
        traverseDirectory(filePath, ignore)
      } else if (path.extname(file) === '.md') {
        const { data: fm, body: content } = parseFrontmatter(
          fs.readFileSync(filePath, 'utf8')
        )
        markdownFiles.push({
          text: content,
          title: content.split('\n')[0].replace(TRIM_REGEX, ''),
          filename: file,
          path: filePath,
          ...metadata(content, filePath),
          ...fm, // frontmatter wins over JSON-comment metadata + the H1
        })
      } else if (['.ts', '.js', '.css'].includes(path.extname(file))) {
        const content = fs.readFileSync(filePath, 'utf8')
        // A /*# … */ block is only a doc when it STARTS a line (whitespace-only
        // before the slash). This keeps a `/*#` that appears inside a // comment,
        // a string, or otherwise mid-line from being scraped as a spurious doc.
        // m[1] is the block without its leading indentation.
        const docs = [...content.matchAll(/^[ \t]*(\/\*#[\s\S]+?\*\/)/gm)].map(
          (m) => m[1]
        )
        if (docs.length) {
          const markdown = docs.map((s) => s.substring(3, s.length - 2).trim())
          // A doc block that ended early drops the rest of the documentation silently, and
          // turns the code after it back into source — which surfaces as parse errors
          // pointing at prose rather than at the delimiter responsible (#70).
          for (const block of markdown) {
            truncationFound.push(...truncationWarnings(file, block))
          }
          const text = markdown.join('\n\n')
          markdownFiles.push({
            text,
            title: text.split('\n')[0].replace(TRIM_REGEX, ''),
            filename: file,
            path: filePath,
            ...metadata(content, filePath),
          })
        }
      }
    })
  }

  paths.forEach((dir) => {
    try {
      const stats = fs.statSync(dir)
      if (stats.isDirectory()) {
        traverseDirectory(dir, ignore)
      } else if (stats.isFile()) {
        const file = path.basename(dir)
        if (path.extname(file) === '.md') {
          const { data: fm, body: content } = parseFrontmatter(
            fs.readFileSync(dir, 'utf8')
          )
          markdownFiles.push({
            text: content,
            title: content.split('\n')[0].replace(TRIM_REGEX, ''),
            filename: file,
            path: dir,
            ...metadata(content, dir),
            ...fm,
          })
        }
      }
    } catch (err) {
      console.error(`Could not read ${dir}:`, err)
    }
  })

  // Warn, never fail. A truncated block is a real defect, but a build that dies on a
  // heuristic would be worse than the silence it replaces — and either way the author sees
  // the message and fixes it in the same minute.
  if (truncationFound.length) {
    console.warn('\n' + formatTruncationWarnings(truncationFound))
  }

  return markdownFiles.sort(pinnedSort)
}

export function extractDocs(options: ExtractDocsOptions): Doc[] {
  const { paths, ignore = ['node_modules', 'dist', 'build'], output } = options
  const found = findMarkdownFiles(paths, ignore)
  /*
  Drop hidden docs HERE, before anything else sees them.

  `hidden` used to be applied by each consumer — the nav, the book, llms.txt — which
  meant a doc marked `hidden` (or `draft: true`) still had its full text written into
  docs.json and still got its own pre-rendered page at /its-slug/. Verified: a probe doc
  with `draft: true` landed in both. For an unfinished chapter or a working note that is
  the whole failure, and no amount of filtering downstream fixes it, because the corpus
  is the thing that ships.

  Filtering at extraction makes it structural: hidden docs do not exist as far as the
  rest of the pipeline is concerned. Descendants of a hidden doc go with it.
  */
  const docs = withoutHidden(found, buildSlugMap(found))
  if (output) {
    saveDocsJSON(docs, output)
  }
  return docs
}

export function saveDocsJSON(docs: Doc[], outputPath: string): void {
  const jsonData = JSON.stringify(docs, null, 2)
  fs.writeFileSync(outputPath, jsonData, 'utf8')
  console.log(`Documentation saved to ${outputPath}`)
}
