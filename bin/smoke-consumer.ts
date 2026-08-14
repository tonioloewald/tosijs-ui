#!/usr/bin/env bun
/*
Consume this package the way an adopter does, and check the things only that reveals.

WHY THIS EXISTS. Every lane we had ran **in this repo, from this repo, with one dev
server**. Four regressions shipped anyway, and each lived outside exactly that envelope:

  - the `tosijs-tunnel` / `tosijs-deploy` bins had no shebang, so `node_modules/.bin`
    shims fed TypeScript to the shell — invisible until someone INSTALLS the package
  - `/version.json`'s `generator` read `package.json` from the CWD, so it stamped the
    ADOPTER's version — invisible until you build from a FOREIGN cwd
  - `chokidar` was a top-level import of shipped code but a devDependency — invisible
    until a CONSUMER builds without it
  - the doc-site hydrate bundle was written under the library `dist/` and shipped to
    everyone — invisible until you read `npm pack` output

Two consumers found three of those within minutes of a release. More unit tests would
not have caught any of them: the gap was never depth, it was context. So this test packs
the real tarball, installs it into a scratch project, and pokes it from outside.

Slow (pack + install + build), so it is NOT part of `bun test`. Run it before a release:

    bun run test-consumer
*/

import { $ } from 'bun'
import { mkdtempSync, rmSync, existsSync } from 'fs'
import { tmpdir } from 'os'
import * as path from 'path'

const failures: string[] = []
const checks: string[] = []

function check(name: string, ok: boolean, detail = '') {
  if (ok) {
    checks.push(`  ✅ ${name}`)
  } else {
    failures.push(`  ❌ ${name}${detail ? `\n       ${detail}` : ''}`)
  }
}

const repo = process.cwd()
const pkg = await Bun.file(`${repo}/package.json`).json()
const work = mkdtempSync(path.join(tmpdir(), 'tosijs-consumer-'))

try {
  console.log(`\n📦 packing ${pkg.name}@${pkg.version} …`)
  const packed = await $`npm pack --pack-destination ${work}`.cwd(repo).quiet()
  const tarball = path.join(
    work,
    packed.stdout.toString().trim().split('\n').pop()!
  )
  check('npm pack produced a tarball', existsSync(tarball))

  // ── tarball contents ──────────────────────────────────────────────────────
  const listing = (await $`tar -tzf ${tarball}`.quiet().text()).split('\n')
  check(
    'doc-site hydrate bundle is NOT shipped',
    !listing.some((f) => f.includes('dist/hydrate/')),
    'dist/hydrate is site output; shipping it once took an adopter from 0.62MB to 10.2MB'
  )
  // A size ceiling catches the NEXT dist/hydrate, whatever it gets called. 5.2MB of
  // hydrate bundle shipped to every consumer behind an exact-path guard that would not
  // have seen it under a different name.
  const bytes = Bun.file(tarball).size
  check(
    `tarball is under 3MB (is ${(bytes / 1e6).toFixed(2)}MB, ${
      listing.length
    } files)`,
    bytes < 3_000_000
  )
  for (const bin of Object.values(pkg.bin ?? {}) as string[]) {
    check(
      `bin is in the tarball: ${bin}`,
      listing.some((f) => f.endsWith(bin))
    )
  }

  // ── a consumer project ────────────────────────────────────────────────────
  const proj = path.join(work, 'consumer')
  await $`mkdir -p ${proj}/src`.quiet()
  // A DIFFERENT version on purpose: if `generator` reports this, the build read the
  // consumer's package.json instead of tosijs-ui's.
  await Bun.write(
    `${proj}/package.json`,
    JSON.stringify(
      { name: 'consumer-smoke', version: '9.9.9-consumer', private: true },
      null,
      2
    )
  )
  // A NON-8787 port, and deliberately NO tunnel.localPort: the bin must derive the same
  // default the dev server does. It used to fall back to a hard-coded 8788, which agreed
  // with the server only on tosijs-ui itself — every other adopter got a server on one
  // port and a tunnel probing another (tosijs-ui#39, hit by tosijs on its first run).
  await Bun.write(
    `${proj}/site.config.ts`,
    `import { defineSiteConfig } from 'tosijs-ui/site'\n` +
      `export default defineSiteConfig({\n` +
      `  name: 'consumer-smoke',\n` +
      `  docPaths: ['src'],\n` +
      `  port: 8018,\n` +
      `  preview: { host: 'nobody@example.invalid', tunnel: {} },\n` +
      `})\n`
  )
  await Bun.write(`${proj}/src/index.md`, `# Consumer Smoke\n\nHello.\n`)
  await Bun.write(
    `${proj}/build.ts`,
    `import { buildSite } from 'tosijs-ui/site'\n` +
      `import config from './site.config'\n` +
      `process.exit((await buildSite(config)) ? 0 : 1)\n`
  )

  console.log('📥 installing the tarball …')
  // marked + happy-dom are documented build-time peers. chokidar is deliberately NOT
  // installed: a plain build must not need a file watcher (#32).
  const install = await $`bun add ${tarball} marked happy-dom`
    .cwd(proj)
    .nothrow()
    .quiet()
  check(
    'tarball installs',
    install.exitCode === 0,
    install.stderr.toString().slice(0, 300)
  )

  // ── the bins, through the .bin shims ──────────────────────────────────────
  //
  // NEVER invoke an unknown bin just to see its exit code. The first version of this
  // loop ran `${shim} --status` for ALL of them — and `tosijs-dev-certs` ignores argv
  // and runs `mkcert -install`, which writes a root CA into the system and NSS trust
  // stores (sudo-prompting inside a .quiet() call), while `tosijs-make-icons` runs the
  // real generator against the scratch project. A test that mutates the machine it runs
  // on is worse than the regression it was written to catch.
  //
  // The regression this must catch is a MISSING SHEBANG (the .bin shim feeds the file
  // to the shell, which then chokes on TypeScript). That is a property of the first two
  // bytes, so read them — no execution required, and it works for every bin including
  // the destructive ones.
  // `tosijs-caddy-install` is safe to run: it is dry-run by default and exits before it
  // spawns ssh when no host is configured, which is the state of a throwaway project.
  const SAFE_TO_RUN = new Set([
    'tosijs-tunnel',
    'tosijs-deploy',
    'tosijs-caddy-install',
  ])
  for (const [name, rel] of Object.entries(pkg.bin ?? {}) as [
    string,
    string
  ][]) {
    const shim = path.join(proj, 'node_modules', '.bin', name)
    if (!existsSync(shim)) {
      check(`bin shim exists: ${name}`, false)
      continue
    }
    const target = path.join(proj, 'node_modules', pkg.name, rel)
    const firstLine = (
      await Bun.file(target)
        .text()
        .catch(() => '')
    ).split('\n')[0]
    check(
      `bin starts with a shebang: ${name}`,
      firstLine.startsWith('#!'),
      `first line was ${JSON.stringify(
        firstLine.slice(0, 60)
      )} — the .bin shim will ` + `hand this to the shell`
    )
    // Only the read-only bins are actually executed. Both exit non-zero without a
    // config, which is fine: we are looking for shell-level "cannot execute" noise.
    if (!SAFE_TO_RUN.has(name)) continue
    const run = await $`${shim} --status`.cwd(proj).nothrow().quiet()
    const err = run.stderr.toString()
    check(
      `bin runs via node_modules/.bin: ${name}`,
      !/syntax error|cannot execute|Exec format/i.test(err),
      err.slice(0, 200)
    )
  }

  /*
  The Caddy template has to reach the adopter, at the path the bin looks for it.

  `tosijs-caddy-install` resolves `../deploy/Caddyfile` relative to its own file, so a
  packaging change that drops `/deploy` from `files` breaks host bootstrap for every adopter
  while every in-repo lane stays green — the repo has the file either way. It also has to
  still CONTAIN its placeholders: bake real values in and the install-time guard that refuses
  to publish a public repo's invite token goes quiet.
  */
  const caddyTemplate = path.join(
    proj,
    'node_modules',
    pkg.name,
    'deploy',
    'Caddyfile'
  )
  const templateText = await Bun.file(caddyTemplate)
    .text()
    .catch(() => '')
  check(
    'the Caddy template ships where tosijs-caddy-install looks for it',
    templateText.length > 0,
    `missing ${caddyTemplate} — check "files" includes /deploy`
  )
  check(
    'the shipped Caddy template still has its placeholders',
    ['{{ACME_EMAIL}}', '{{PREVIEW_DOMAIN}}', '__PREVIEW_TOKEN__'].every((p) =>
      templateText.includes(p)
    ),
    'a placeholder was baked out — the install-time refusal guard would go quiet'
  )

  // ── the tunnel bin agrees with the server about ports ─────────────────────
  const tunnelShim = path.join(proj, 'node_modules', '.bin', 'tosijs-tunnel')
  if (existsSync(tunnelShim)) {
    const st = await $`${tunnelShim} --status`.cwd(proj).nothrow().quiet()
    const said = st.stdout.toString() + st.stderr.toString()
    // Must POSITIVELY name 8019. An `||` fallback here would pass vacuously — the bin
    // printed only "tunnel down" until --status was made to report its ports.
    check(
      'tosijs-tunnel derives localPort from the config port (8019, not 8788)',
      /localhost:8019\b/.test(said),
      `expected the bin to target 8019 for a project on port 8018; it said:\n       ${said
        .trim()
        .slice(0, 300)}`
    )
  }

  // ── module resolution under NODE, not just bun ────────────────────────────
  //
  // The blind spot this lane was built to close, one layer down. It packed, installed and
  // built the tarball — all with bun — so `dist/`'s extensionless relative imports
  // (`from './site-config'`) went unnoticed for at least two releases. Bun resolves them;
  // Node ESM does not, and requires the extension. A Node consumer got
  // `Cannot find module` on entry points that have nothing to do with bun.
  //
  // Resolution is what is asserted here, deliberately — NOT that the modules run. The
  // component library needs a DOM and the site builder needs bun; both are honest runtime
  // requirements. A `Cannot find module` is a packaging bug, and that is the difference
  // this distinguishes.
  const nodeResolves = async (entry: string) => {
    const probe = `import('${entry}').then(()=>console.log('OK')).catch(e=>console.log(e.message))`
    const r = await $`node -e ${probe}`.cwd(proj).nothrow().quiet()
    const said = r.stdout.toString() + r.stderr.toString()
    return !/Cannot find module|Cannot find package '\.\/|ERR_MODULE_NOT_FOUND/.test(
      said
    )
  }
  for (const entry of ['tosijs-ui', 'tosijs-ui/site', 'tosijs-ui/icon-svg']) {
    check(
      `node resolves ${entry} (no missing-module error)`,
      await nodeResolves(entry)
    )
  }
  // The DOM-free entry must actually RUN under node — it exists precisely for build
  // scripts and server-rendered templates.
  const iconRun =
    await $`node -e ${"import('tosijs-ui/icon-svg').then(m=>{if(typeof m.iconSvg!=='function')throw new Error('no iconSvg');console.log('OK')})"}`
      .cwd(proj)
      .nothrow()
      .quiet()
  check(
    'tosijs-ui/icon-svg actually runs under node',
    iconRun.stdout.toString().includes('OK'),
    iconRun.stderr.toString().slice(0, 200)
  )

  // ── the manifest's own consistency ────────────────────────────────────────
  //
  // A peer floor the library is not itself developed against is a contract nobody tests.
  // This drifted historically — a `tosijs` devDep pinned BELOW the declared peer range —
  // and the only signal was an adopter's install warning (#57). Cheap to assert, and the
  // tarball is the right place: it is the manifest consumers actually resolve against.
  const manifest = await Bun.file(
    path.join(proj, 'node_modules', pkg.name, 'package.json')
  ).json()
  for (const [dep, range] of Object.entries(
    (manifest.peerDependencies ?? {}) as Record<string, string>
  )) {
    const dev = (manifest.devDependencies ?? {})[dep]
    if (!dev) continue // not developed against it at all — nothing to check
    check(
      `devDependency ${dep}@${dev} satisfies its own peer range "${range}"`,
      Bun.semver.satisfies(dev.replace(/^[\^~]/, ''), range),
      `the library declares a floor it does not build against`
    )
  }

  // ── a build, from the consumer's cwd ──────────────────────────────────────
  console.log('🔨 building as the consumer …')
  const build = await $`bun build.ts`.cwd(proj).nothrow().quiet()
  check(
    'a plain build succeeds without chokidar installed',
    build.exitCode === 0,
    (build.stderr.toString() || build.stdout.toString()).slice(0, 400)
  )

  const versionJson = `${proj}/docs/version.json`
  if (existsSync(versionJson)) {
    const stamp = await Bun.file(versionJson).json()
    check(
      'version.json generator is tosijs-ui, not the consumer',
      stamp.generator === pkg.version,
      `got ${JSON.stringify(stamp.generator)}, expected ${JSON.stringify(
        pkg.version
      )}`
    )
    check(
      'version.json names the consumer site',
      stamp.site === 'consumer-smoke'
    )
  } else {
    check('build emitted docs/version.json', false)
  }
} finally {
  rmSync(work, { recursive: true, force: true })
}

console.log('')
for (const line of checks) console.log(line)
for (const line of failures) console.log(line)
console.log('')
if (failures.length) {
  console.error(`🛑 consumer smoke test: ${failures.length} failure(s)\n`)
  process.exit(1)
}
console.log(`✅ consumer smoke test: ${checks.length} checks passed\n`)
