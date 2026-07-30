# Migrating from older versions

<!--{ "pin": "bottom", "parent": "Appendices", "order": 60, "description": "Breaking changes and migration checklists for older tosijs-ui releases — 1.7.0's editor change and the 1.3.0 xinjs-ui rename." }-->

Notices for releases you may be upgrading *past*. If you are starting fresh, none of
this applies — go to the [Quick Start](/) instead.

Current releases are described in [CHANGELOG.md](https://github.com/tonioloewald/tosijs-ui/blob/main/CHANGELOG.md).

## ⚠️ Breaking change in 1.7.0 — `<tosi-code>` (ACE → CodeMirror 6)

**1.7.0 is a breaking release shipping under a minor version, deliberately.** `<tosi-code>`
moved from ACE to CodeMirror 6. `value`, `mode`, the `change` event, `disabled`, and
`undo`/`redo` are unchanged; the ACE-era **`theme`** and **`options`** props are **removed** with
no shim. Dark mode is now automatic (`body.darkmode`) and styling comes from `--code-bg` /
`--text-color`. The `2.0` name is reserved for the tjs-native tosijs port, so this ships as
1.7.0 — **pin `tosijs-ui@1.6` to defer.** Full detail and rationale in
[CHANGELOG.md](./CHANGELOG.md).

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
