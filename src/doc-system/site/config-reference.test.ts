import { test, expect } from 'bun:test'
import { readFileSync } from 'fs'
import * as path from 'path'

/*
Every SiteConfig option is in doc-site-system.md's configuration reference. themeFile and
themePresets were added for 1.18.0 with no line there (its review found it), and four
older options had none either: an option an adopter cannot find is an option they do not have.
*/
test('every SiteConfig key is documented in doc-site-system.md', () => {
  const here = import.meta.dir
  const source = readFileSync(path.join(here, 'site-config.ts'), 'utf8')
  const body = /export interface SiteConfig\s*{([\s\S]*?)\n}/.exec(source)![1]
  const keys = [...body.matchAll(/^ {2}(\w+)\??:/gm)].map(([, key]) => key)
  expect(keys.length).toBeGreaterThan(40)
  const doc = readFileSync(path.join(here, '..', 'doc-site-system.md'), 'utf8')
  expect(keys.filter((key) => !doc.includes(`\`${key}\``))).toEqual([])
})
