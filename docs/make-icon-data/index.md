# make-icon-data

<!--{ "pin": "bottom" }-->

Ingests SVG files from icon directories and generates an icon-data module
(TypeScript or JavaScript). This is the build tool behind the `icons` system.

## Usage

    bun run bin/make-icon-data.js [options]

### Options

- `--input <dir1,dir2,...>` — directories to scan (default: `./icons`)
- `--output <path>` — output file (default: `./src/icon-data.ts`)
- `--optimize <true|false>` — round coordinates based on viewBox size (default: true)

### Examples

    bun run bin/make-icon-data.js
    bun run bin/make-icon-data.js --input ./my-icons --output ./dist/icons.js
    bun run bin/make-icon-data.js --optimize false

## Directory conventions

### Style classes

Folder names control CSS classes on the generated SVGs:

- `color/` — icons with baked-in colors (class `color`, fill/stroke preserved)
- `stroked/` — stroke-only icons (class `stroked`, fill styles removed)
- `filled/` — fill-only icons (class `filled`, stroke styles removed)

### Directional folders

Place icons in specially named folders to auto-generate directional
redirects, eliminating redundant SVG files:

- `right-left/` — base icon points right; generates a flipped left variant
- `up-down/` — base icon points up; generates a flipped down variant
- `up-down-right-left/` — base icon points right; generates down (90°),
  left (180°), and up (270°) rotation variants

For example, `chevron-right.svg` in an `up-down-right-left/` folder produces
`chevronRight` (SVG) plus `chevronDown`, `chevronLeft`, `chevronUp` (redirects).

### Comma-separated names

For icons where the directional variant has a different name (not just a
direction swap), use commas in the filename:

    skip-forward,skip-back.svg    → skipForward (SVG) + skipBack (redirect)
    refresh-cw,refresh-ccw.svg    → refreshCw (SVG) + refreshCcw (redirect)

The first name is the base, additional names are mapped to the folder's
variant suffixes in order.

## SVG processing

The tool automatically:
- Strips XML declarations, namespaces, IDs, and comments
- Removes redundant attributes (default fills, strokes)
- Collapses whitespace
- Rounds coordinates based on viewBox size (larger viewBox = fewer decimals)
- Converts filenames to camelCase (`arrow-right.svg` → `arrowRight`)

## Output formatting

The generated module is written as ordinary, readable source: single-quoted strings (SVG
markup is full of `class="stroked"`, so single quotes mean no escaping), one icon per
line. **If `prettier` is resolvable from the output path, the module is formatted through
it in memory before being written, using *your* prettier config** — so generated data
matches the rest of your project rather than ours. Prettier is entirely optional; without
it the output is already clean.

The generator's output is **stable**: running it twice on the same icons produces
byte-identical files, so it never shows up as spurious diff noise.

> **Add your generated icon data to `.prettierignore`.**
>
> Even with matching output, treat generated files as generated: a formatter run that
> rewrites them means the next build reverts the formatting, which is a permanent two-way
> diff in every `git status`. If the style bothers you, change the generator's config (or
> your prettier config, which it now honours) — not the output.
