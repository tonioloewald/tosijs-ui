import { test, expect } from 'bun:test'
import { defineSiteConfig } from './site-config.js'

// These document the config shapes an adopter is allowed to write.
//
// They do NOT pin the types, and that is worth stating plainly rather than implying
// otherwise: `tsconfig.json` excludes test files, so no test file in this repo is
// typechecked — verified by re-widening `host` to required and watching `tsc --noEmit` stay
// silent. Including tests currently surfaces 40 pre-existing errors, so closing that gap is
// its own job (#73).
//
// Until then these run under `bun test`, which transpiles without checking, so they catch a
// config shape that breaks at RUNTIME and nothing more.
//
// (Line comments, not a block: the exclude glob contains `**` followed by a slash, which
// closes a block comment early. That is #70's failure mode, and it bit here while writing
// about it.)

test('REGRESSION: preview may omit host, because the practice is to supply it from env', () => {
  /*
  `preview.host` was typed required while the documented practice — and the bins' own
  resolution order (`--host=` > PREVIEW_HOST > config) — is to keep it OUT of a committed
  config. So a correct config failed typecheck, and the workaround
  (`host: process.env.PREVIEW_HOST ?? ''`) was noise that means nothing at runtime.

  Worth recording why a type error mattered enough to file: in tosijs-3d this error sat red
  in `site.config.ts` across a tagged rc and HID FOUR unrelated real errors behind it,
  because the repo's only typecheck was the build's, which excludes the config file. (#72)
  */
  const config = defineSiteConfig({
    name: 'x',
    preview: { url: 'https://dev.example.com' },
  })
  expect(config.preview?.host).toBeUndefined()
})

test('preview.host still accepted when a project does commit one', () => {
  const config = defineSiteConfig({
    name: 'x',
    preview: { host: 'deploy@example.com', path: '/srv/preview/x' },
  })
  expect(config.preview?.host).toBe('deploy@example.com')
})

test('a minimal config needs nothing but a name', () => {
  // The "just works" default matters: every required field is a field an adopter has to
  // learn about before they can build anything at all.
  expect(defineSiteConfig({ name: 'x' }).name).toBe('x')
})
