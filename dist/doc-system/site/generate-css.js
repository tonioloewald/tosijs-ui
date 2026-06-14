/*
Writes the burned-in doc-system theme stylesheet.

Run as a SEPARATE subprocess from the build (bin/dev.ts spawns it) so the heavy
runtime imports it needs — the full tosijs module (via `css`) and the icon system
(via doc-system-styles) — stay out of `bun --watch`'s dependency graph. If these
were imported directly into bin/dev.ts, the build's regeneration of src/icon-data.ts
would trigger an endless watch->rebuild loop.

Usage: bun bin/generate-css.ts [outputPath]
Default output: docs/doc-system.css
*/
import './build-dom-shim'; // must precede any tosijs import (build has no DOM)
import { css } from 'tosijs';
import { docSystemStyleSpec } from '../doc-system-styles';
export async function generateCss(outputPath = 'docs/doc-system.css', theme = {}) {
    await Bun.write(outputPath, css(docSystemStyleSpec(theme)));
}
if (import.meta.main) {
    // theme is passed as a JSON arg by the orchestrator (the shipped module must
    // not import a consumer's repo-root config). Defaults to {} (base theme).
    const outputPath = process.argv[2] || 'docs/doc-system.css';
    const theme = process.argv[3] ? JSON.parse(process.argv[3]) : {};
    await generateCss(outputPath, theme);
    console.log(`generated ${outputPath}`);
}
