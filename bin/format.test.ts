import { test, expect } from 'bun:test'
import { mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import * as path from 'path'

/*
tosijs-format's own markdown exclusion, tested where NOTHING else excludes it: a scratch project
with no .prettierignore and no config override. In this repo .prettierignore masks the command's
glob, so deleting the markdown-exclusion argument from bin/format.ts kept every lane green (1.16.0
re-review 3). Here that deletion fails. (The glob itself can't be quoted in this comment: it
contains the characters that close a block comment.)
*/
test('tosijs-format --check never reports markdown, and does report unformatted code', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'tosijs-format-'))
  try {
    const repoModules = path.resolve(import.meta.dir, '../node_modules')
    symlinkSync(repoModules, path.join(dir, 'node_modules'))
    writeFileSync(path.join(dir, 'package.json'), '{"name":"scratch"}')
    const messy = '#  heading\n\n* a *literal* star\n\n|a|b|\n|-|-|\n'
    for (const f of ['a.md', 'b.markdown', 'c.mdx']) {
      writeFileSync(path.join(dir, f), messy)
    }
    writeFileSync(path.join(dir, 'd.js'), 'const x = {a:1}\n')

    const r = Bun.spawnSync(
      ['bun', path.resolve(import.meta.dir, 'format.ts'), '--check'],
      { cwd: dir, stdout: 'pipe', stderr: 'pipe' }
    )
    const out = r.stdout.toString() + r.stderr.toString()
    expect(r.exitCode).toBe(1) // d.js is unformatted
    expect(out).toContain('d.js')
    expect(out).not.toMatch(/a\.md|b\.markdown|c\.mdx/)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}, 60_000)

/*
SVG is never formatted either. Prettier has no SVG parser of its own; what reformats an SVG in
the wild is a plugin that claims the extension (prettier-plugin-xml) or an editor that maps
.svg to one. This repo's config stops that for an explicitly named file, which is the path an
editor's format-on-save takes: the scratch plugin below collapses whitespace, and without the
`*.svg` entries in .prettierignore and .prettierrc.json, `--check` reports the icon.

(The command's own svg exclusion glob is for adopters on Prettier 3, which loads a config's
plugins when it walks a directory. Prettier 2, pinned here, never collects .svg in a walk, so
that glob cannot be exercised in this repo.)
*/
const SVG_PLUGIN = `module.exports = {
  languages: [{ name: 'svg', parsers: ['svg-squash'], extensions: ['.svg'] }],
  parsers: {
    'svg-squash': {
      parse: (text) => ({ text }),
      astFormat: 'svg-squash',
      locStart: () => 0,
      locEnd: (node) => node.text.length,
    },
  },
  printers: {
    'svg-squash': { print: (path) => path.getValue().text.replace(/\\s+/g, ' ') },
  },
}
`

test("prettier leaves this repo's SVGs alone, even with a plugin that formats them", () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'tosijs-format-svg-'))
  try {
    const plugin = path.join(dir, 'svg-plugin.cjs')
    writeFileSync(plugin, SVG_PLUGIN)
    const root = path.resolve(import.meta.dir, '..')
    const r = Bun.spawnSync(
      [
        path.join(root, 'node_modules/.bin/prettier'),
        '--check',
        '--plugin',
        plugin,
        'icons/stroked/blog.svg',
      ],
      { cwd: root, stdout: 'pipe', stderr: 'pipe' }
    )
    const out = r.stdout.toString() + r.stderr.toString()
    expect(out).not.toContain('blog.svg')
    expect(r.exitCode).toBe(0)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}, 60_000)
