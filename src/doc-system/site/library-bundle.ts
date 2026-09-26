/*
The bundled library build (`SiteConfig.libraryBundle`, #169).

`emitLibrary` / `libraryTsconfig` run a bare `tsc`, which copies each source file's import
specifiers into the output unchanged. Written in bundler style (`export * from './model'`), that
output is a `dist/` Node refuses: `ERR_MODULE_NOT_FOUND .../dist/model`. Bun resolves it, so
nothing in a Bun build or test loop notices, and it ships. tosijs-3d, tosijs-3d-ensemble and
tosijs-virta each grew their own guard for this, in three different shapes.

This is the paved road instead: `bun build` bundles the entries with splitting (its output
imports its own chunks WITH extensions, by construction), every declared dependency and peer
stays an import rather than being bundled, and `tsc` emits declarations only. The result is
then scanned for relative imports without an extension, and any hit fails the build — the
guard the three repos wrote, done once.

Every heavy step runs as a CHILD process (`bun build`, `tsc`): this code also runs inside the
long-lived dev server, where Bun.build() leaks its native arena on every call.
*/

import { readdirSync, readFileSync, statSync } from 'fs'
import * as path from 'path'

export interface LibraryBundle {
  /** Entry points relative to the project root, e.g. `['src/index.ts', 'src/core.ts']`. */
  entries: string[]
  /**
   * Packages left as imports instead of bundled (each also matches its subpaths). Default:
   * every `dependencies`, `peerDependencies` and `optionalDependencies` name in package.json.
   */
  externals?: string[]
  /** tsconfig for the declaration pass (run with `--emitDeclarationOnly`). Default: the root one. */
  tsconfig?: string
  /** `bun build --target`. Default `browser`. */
  target?: 'browser' | 'node' | 'bun'
}

interface PackageJsonDeps {
  dependencies?: Record<string, string>
  peerDependencies?: Record<string, string>
  optionalDependencies?: Record<string, string>
}

/** The externals to use: the configured list, or every declared runtime dependency. */
export function bundleExternals(
  bundle: LibraryBundle,
  pkg: PackageJsonDeps
): string[] {
  const names = bundle.externals ?? [
    ...Object.keys(pkg.dependencies ?? {}),
    ...Object.keys(pkg.peerDependencies ?? {}),
    ...Object.keys(pkg.optionalDependencies ?? {}),
  ]
  return [...new Set(names)].sort()
}

/** The `bun build` argv for the JavaScript half. */
export function bundleBuildArgs(
  bundle: LibraryBundle,
  pkg: PackageJsonDeps,
  outdir: string
): string[] {
  return [
    'bun',
    'build',
    ...bundle.entries,
    '--outdir',
    outdir,
    '--format',
    'esm',
    '--splitting',
    '--target',
    bundle.target ?? 'browser',
    '--sourcemap=linked',
    ...bundleExternals(bundle, pkg).flatMap((name) => [
      '--external',
      name,
      '--external',
      `${name}/*`,
    ]),
  ]
}

/** The `tsc` argv for the declaration half. */
export function bundleDeclarationArgs(
  bundle: LibraryBundle,
  outdir: string
): string[] {
  return [
    'bun',
    'tsc',
    ...(bundle.tsconfig ? ['-p', bundle.tsconfig] : []),
    '--declaration',
    '--emitDeclarationOnly',
    // a root tsconfig with `noEmit: true` would otherwise emit nothing at all
    '--noEmit',
    'false',
    '--outDir',
    outdir,
  ]
}

const HAS_EXTENSION = /\.(?:m?js|cjs|json)$/

/*
Real imports, from Bun's parser rather than a regex: a regex also matched specifiers quoted in
COMMENTS — four false hits in tosijs-ui's own dist, one of them this file's own doc comment.
One Transpiler for the process: each construction costs ~40KB that is never returned, and this
runs inside the long-lived dev server (see CLAUDE.md, "Dev servers are the most dangerous thing").
*/
let transpiler: InstanceType<typeof Bun.Transpiler> | undefined
function importsOf(source: string): string[] {
  transpiler ??= new Bun.Transpiler({ loader: 'js' })
  return transpiler
    .scanImports(source)
    .map((entry: { path: string }) => entry.path)
}

export function extensionlessImports(dir: string): string[] {
  const found: string[] = []
  const walk = (current: string) => {
    for (const name of readdirSync(current)) {
      const full = path.join(current, name)
      if (statSync(full).isDirectory()) {
        walk(full)
      } else if (/\.m?js$/.test(name)) {
        for (const specifier of importsOf(readFileSync(full, 'utf8'))) {
          if (/^\.{1,2}\//.test(specifier) && !HAS_EXTENSION.test(specifier)) {
            found.push(`${path.relative(dir, full)}: ${specifier}`)
          }
        }
      }
    }
  }
  walk(dir)
  return found
}
