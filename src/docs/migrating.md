# Migrating from older versions

<!--{ "pin": "bottom", "parent": "Appendices", "order": 60, "description": "Breaking changes and migration checklists for tosijs-ui releases you may be upgrading past — 1.11.0's validator seam, 1.9.1's Node resolution fix, 1.7.0's editor change and the 1.3.0 xinjs-ui rename." }-->

Notices for releases you may be upgrading *past*. If you are starting fresh, none of
this applies — go to the [Quick Start](/) instead.

Current releases are described in [CHANGELOG.md](https://github.com/tonioloewald/tosijs-ui/blob/main/CHANGELOG.md).

## Validation is supplied, not imported — 1.11.0

If you use `<tosi-schema-form>`, `<tosi-crud>` or an editable `<tosi-table>` **from ESM**, add
one line. Nothing else changes, and nothing breaks silently — a form with no validator warns
in the console and reports `validationAvailable === false`.

```js
import { setSchemaValidator } from 'tosijs-ui'
import { validate, inferSchema, unenforcedKeywords } from 'tosijs-schema' // ^1.8.0

setSchemaValidator({ validate, inferSchema, unenforcedKeywords })
```

**Pass all three.** `unenforcedKeywords` is what lets a field ask the validator *"do you
actually check this keyword?"* — omit it and the form falls back to a list frozen at
tosijs-schema 1.7.0 and labels every `oneOf` and `exclusiveMinimum` field "not validated"
while it is being validated.

Nothing to do if you load the CDN `<script>` build or use `tosijs-ui/site` — both register it
themselves.

**Why it changed.** A bare `import('tosijs-schema')` in shipped code is either resolved by
your bundler — which fails the build for anyone who did not install it, including people using
only `<tosi-table>` — or left external, which cannot resolve in a browser and kills validation
for everyone. Both were measured; there is no third option. Asking for two functions instead
of a package also means anything can supply them: an Ajv wrapper, a house validator, a stub.

## `tjs-lang` peer moves to `^0.13.1` — 1.11.0

Only affects you if you have `tjs-lang` installed (it is an optional peer, for live examples
and `.tjs` sources). `^0.12.0` could not reach 0.13.x — caret pins the minor on `0.x` — so an
adopter on current tjs-lang hit a hard `ERESOLVE`.

**0.12.0 is deprecated on npm**, and the deprecation names this exact combination: *"tosijs-schema
>=1.5.0 breaks the battery atoms' output validation in these versions. Upgrade to 0.13.1."*
Since 1.11.0 also floors `tosijs-schema` at `^1.8.0`, staying on 0.12.0 is the pairing the
upstream author deprecated it over.

## Edit links are shorter and shorter-lived — 1.11.0

Only affects `tosijs-ui/site` users running `bun run tunnel`. The token is now **7 Crockford
base32 characters** instead of 22, and `linkTtlMinutes` defaults to **5** rather than 15. A
link minted by an older dev server is not redeemable by a newer one; both live in memory, so
this only matters across a restart mid-session.

The token is case-insensitive and forgives the lookalikes — `I`/`L` read as `1`, `O` as `0`,
hyphens ignored — because it is meant to be read off one screen and typed on another.

## `Cannot find module` under Node — fixed in 1.9.1

If an import of `tosijs-ui` (any entry point) fails under **Node** with something like:

```text
Cannot find module '.../dist/doc-system/site/site-config'
imported from '.../dist/doc-system/site/index.js'
```

you are on **1.9.0 or earlier**. Upgrade to **1.9.1**; there is no workaround on the older
versions and no code change needed on yours.

Shipped `dist/` used extensionless relative imports (`from './site-config'`). Bun resolves
those; Node ESM does not — it requires the extension. So the package worked perfectly
under bun and failed on the very first import under Node, on every entry point, going back
well before 1.8.0.

**Not deprecated, deliberately.** The failure is loud and immediate — it stops your build
on the first import, so nobody is quietly running broken code. A deprecation warning would
only nag the bun users for whom every version worked. If you are pinned to an older line
and need this backported, open an issue; it is a mechanical change.

Worth knowing while you are here, because the error messages name symptoms rather than
causes:

| entry point | runtime it needs |
| --- | --- |
| `tosijs-ui/site` | **bun** — it shells out, builds and spawns. Under Node: `Cannot find package 'bun'` |
| `tosijs-ui`, `tosijs-ui/<component>` | a **browser** or a bundler targeting one. Under bare Node: `HTMLElement is not defined` |
| `tosijs-ui/icon-svg` | anything — deliberately DOM-free, which is why it exists |

Those three are unchanged in 1.9.1 and are not bugs; only the module *resolution* was.

## ⚠️ Breaking change in 1.7.0 — `<tosi-code>` (ACE → CodeMirror 6)

**1.7.0 is a breaking release shipping under a minor version, deliberately.** `<tosi-code>`
moved from ACE to CodeMirror 6. `value`, `mode`, the `change` event, `disabled`, and
`undo`/`redo` are unchanged; the ACE-era **`theme`** and **`options`** props are **removed** with
no shim. Dark mode is now automatic (`body.darkmode`) and styling comes from `--code-bg` /
`--text-color`. The `2.0` name is reserved for the tjs-native tosijs port, so this ships as
1.7.0 — **pin `tosijs-ui@1.6` to defer.** Full detail and rationale in
[CHANGELOG.md](https://github.com/tonioloewald/tosijs-ui/blob/main/CHANGELOG.md).

## Migrating to v1.3.0

v1.3.0 completes the rename from `xinjs-ui` to `tosijs-ui`. All custom element
tags now use the `tosi-` prefix and all exports use `Tosi*`/`tosi*` names.

### Breaking changes

- **Custom element tags** have changed from `<xin-*>` to `<tosi-*>`.
  For example: `<xin-select>` is now `<tosi-select>`, `<xin-icon>` is now
  `<tosi-icon>`, `<xin-example>` is now `<tosi-example>`, etc.
- **CSS selectors** targeting old tag names (e.g. `xin-select { ... }`) must
  be updated.
- **CSS custom properties** in component `styleSpec` objects retain `--xin-*`
  fallbacks for backward compatibility, but new code should use `--tosi-*`.

### Deprecated exports still work

The old `xin*` JavaScript exports (`xinSelect`, `xinTabs`, `xinTable`, etc.)
remain available and will continue to work. Most log a runtime deprecation
warning; a few are silent aliases marked with JSDoc `@deprecated`. They will
be removed in a future major version.

### Migration checklist

1. Search your HTML for `<xin-` and replace with `<tosi-`
2. Search your CSS for `xin-` selectors and update to `tosi-`
3. Search your JS/TS for `xinSelect`, `xinTabs`, etc. and switch to `tosiSelect`, `tosiTabs`, etc.
4. Search for `--xin-` CSS variable overrides and switch to `--tosi-`
