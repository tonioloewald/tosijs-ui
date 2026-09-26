import { test, expect, describe } from 'bun:test'
import { $ } from 'bun'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import * as path from 'path'
import {
  bundleBuildArgs,
  bundleDeclarationArgs,
  bundleExternals,
  extensionlessImports,
} from './library-bundle.js'

describe('libraryBundle (#169)', () => {
  test('externals default to every declared runtime dependency, subpaths included', () => {
    const pkg = {
      dependencies: { marked: '^16' },
      peerDependencies: { tosijs: '^1', marked: '^16' },
      optionalDependencies: { 'tjs-lang': '^0.13' },
    }
    expect(bundleExternals({ entries: ['src/index.ts'] }, pkg)).toEqual([
      'marked',
      'tjs-lang',
      'tosijs',
    ])
    const args = bundleBuildArgs({ entries: ['src/index.ts'] }, pkg, 'dist')
    expect(args).toContain('--splitting')
    expect(args.join(' ')).toContain('--external tosijs --external tosijs/*')
    expect(
      bundleBuildArgs({ entries: ['a.ts'], externals: ['x'] }, pkg, 'd').join(
        ' '
      )
    ).not.toContain('tosijs')
  })

  test('declarations are emitted even from a noEmit tsconfig', () => {
    expect(
      bundleDeclarationArgs(
        { entries: [], tsconfig: 'tsconfig.build.json' },
        'dist'
      )
    ).toEqual([
      'bun',
      'tsc',
      '-p',
      'tsconfig.build.json',
      '--declaration',
      '--emitDeclarationOnly',
      '--noEmit',
      'false',
      '--outDir',
      'dist',
    ])
  })

  test('the scan finds extensionless relative imports and nothing else', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'ext-scan-'))
    try {
      mkdirSync(path.join(dir, 'sub'))
      writeFileSync(
        path.join(dir, 'a.js'),
        [
          "export * from './model'",
          "import { x } from './ok.js'",
          "import './side'",
          "const m = import('../lazy')",
          "import { y } from 'tosijs'",
          "export { z } from './data.json'",
          "// the fix was a bare import './commented' placed above",
          "/* export * from './also-commented' */",
          'const s = "from \'./in-a-string\'"',
        ].join('\n')
      )
      writeFileSync(path.join(dir, 'sub', 'b.js'), 'import "./fine.mjs"')
      expect(extensionlessImports(dir).sort()).toEqual([
        'a.js: ../lazy',
        'a.js: ./model',
        'a.js: ./side',
      ])
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  /*
  The boundary #169 is about: a bundler-style source (extensionless specifiers) built as a
  library and then loaded by NODE. A bare tsc produces a dist Node rejects; the bundle does not.
  */
  test('bundler-style source: bare tsc output fails in Node, the bundle loads', async () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'lib-bundle-'))
    try {
      mkdirSync(path.join(dir, 'src'))
      writeFileSync(
        path.join(dir, 'package.json'),
        JSON.stringify({ name: 'demo', type: 'module' })
      )
      writeFileSync(
        path.join(dir, 'tsconfig.json'),
        JSON.stringify({
          compilerOptions: {
            target: 'es2022',
            module: 'esnext',
            moduleResolution: 'bundler',
            strict: true,
            rootDir: 'src',
            noEmit: true,
            skipLibCheck: true,
          },
          include: ['src'],
        })
      )
      writeFileSync(
        path.join(dir, 'src', 'index.ts'),
        "export * from './model'\n"
      )
      writeFileSync(
        path.join(dir, 'src', 'model.ts'),
        'export const answer: number = 42\n'
      )
      const tsc = path.resolve(
        import.meta.dir,
        '../../../node_modules/.bin/tsc'
      )

      // the old path
      await $`${tsc} -p tsconfig.json --noEmit false --declaration --outDir legacy`
        .cwd(dir)
        .quiet()
      expect(extensionlessImports(path.join(dir, 'legacy'))).toEqual([
        'index.js: ./model',
      ])
      const legacy =
        await $`node -e ${"import('./legacy/index.js').then(m => console.log(m.answer))"}`
          .cwd(dir)
          .nothrow()
          .quiet()
      expect(legacy.exitCode).not.toBe(0)

      // the bundle
      const bundle = { entries: ['src/index.ts'] }
      const [b0, ...bRest] = bundleBuildArgs(bundle, {}, 'dist')
      await $`${b0} ${bRest}`.cwd(dir).quiet()
      const [, , ...dRest] = bundleDeclarationArgs(bundle, 'dist')
      await $`${tsc} ${dRest}`.cwd(dir).quiet()
      expect(extensionlessImports(path.join(dir, 'dist'))).toEqual([])
      const loaded =
        await $`node -e ${"import('./dist/index.js').then(m => console.log(m.answer))"}`
          .cwd(dir)
          .quiet()
      expect(loaded.stdout.toString().trim()).toBe('42')
      expect(
        await Bun.file(path.join(dir, 'dist', 'index.d.ts')).exists()
      ).toBe(true)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  }, 60_000)
})
