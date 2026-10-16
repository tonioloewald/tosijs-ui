# docs

`extractDocs` collects documentation from markdown files and `/*#` comment blocks in source
code into one corpus, the `docs.json` that the [doc-browser](/doc-browser/) and the static
site render. `tosijs-ui/site` runs it for you; call it yourself only to build a corpus
outside that pipeline. It reads files, so it runs under bun or node.

## Usage

```typescript
import { extractDocs } from 'tosijs-ui/site'

const docs = extractDocs({
  paths: ['src', 'README.md'],
  output: 'public/docs.json',
})
```

## `extractDocs(options)`

- `paths`: directories to scan, and individual files (list root `.md` files explicitly)
- `ignore`: directory names to skip (default `['node_modules', 'dist', 'build']`)
- `output`: if given, the path the corpus is written to as JSON
- `home`: the doc served at `/` instead of README, by slug or filename

Returns an array of `Doc` objects: `text` (the markdown), `title`, `filename`, `path`, and
whatever metadata the doc declares (`pin`, `order`, `parent`, `layout`, `description`, …).

## What is collected

- **`.md` files**, whole. YAML frontmatter is read and removed.
- **`/*#` … `*‎/` blocks** in `.ts`, `.tjs`, `.js` and `.css` files, as markdown. The first heading
  is the page title. A block counts only when `/*#` starts a line.
- **Files whose name starts with `_`** are skipped: use the prefix for drafts and fragments.

Metadata blocks (`<!--{ … }-->` in markdown, `/*{ … }*‎/` in code), nav order, sections and
which code fences run live are described under [Doc format](/doc-site-system/#doc-format).
