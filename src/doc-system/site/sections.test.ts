import { test, expect } from 'bun:test'
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import * as path from 'path'
import { ensureSections, insideDocPaths } from './sections.js'

// A corpus with one page whose parent does not exist.
const withOrphan = (fn: (dir: string, docsJson: string) => void) => {
  const dir = mkdtempSync(path.join(tmpdir(), 'tosijs-sections-'))
  const docsJson = path.join(dir, 'docs.json')
  writeFileSync(
    docsJson,
    JSON.stringify([
      {
        filename: 'falcon.md',
        path: path.join(dir, 'book/falcon.md'),
        title: 'Falcon',
        text: '# Falcon',
        parent: '4_Falcon.md',
      },
    ])
  )
  try {
    fn(dir, docsJson)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

test('insideDocPaths: the folder itself or anything under it', () => {
  expect(insideDocPaths('book/sections', ['book'])).toBe(true)
  expect(insideDocPaths('book', ['book'])).toBe(true)
  expect(insideDocPaths('src/docs', ['book', 'README.md'])).toBe(false)
  expect(insideDocPaths('bookish', ['book'])).toBe(false)
})

test('a sectionsDir outside every docPath gets no stub, and the build says why (#3584)', () => {
  withOrphan((dir, docsJson) => {
    const messages: string[] = []
    const sectionsDir = path.join(dir, 'src/docs')
    ensureSections({
      docsJsonPath: docsJson,
      sectionsDir,
      reExtract: () => {},
      docPaths: [path.join(dir, 'book')],
      log: (m) => messages.push(m),
    })
    expect(existsSync(sectionsDir)).toBe(false)
    expect(messages.join('\n')).toContain('"4_Falcon.md"')
    expect(messages.join('\n')).toContain('outside every docPath')
  })
})

test('a watch rebuild creates no stub, whatever is missing (#3584)', () => {
  withOrphan((dir, docsJson) => {
    const sectionsDir = path.join(dir, 'book/sections')
    ensureSections({
      docsJsonPath: docsJson,
      sectionsDir,
      reExtract: () => {},
      docPaths: [path.join(dir, 'book')],
      createStubs: false,
      log: () => {},
    })
    expect(existsSync(sectionsDir)).toBe(false)
  })
})

test('a full build inside docPaths creates the stub and names it', () => {
  withOrphan((dir, docsJson) => {
    const messages: string[] = []
    const sectionsDir = path.join(dir, 'book/sections')
    ensureSections({
      docsJsonPath: docsJson,
      sectionsDir,
      reExtract: () => {},
      docPaths: [path.join(dir, 'book')],
      log: (m) => messages.push(m),
    })
    const stub = path.join(sectionsDir, '4-falcon-md.md')
    expect(existsSync(stub)).toBe(true)
    expect(messages.join('\n')).toContain(stub)
  })
})
