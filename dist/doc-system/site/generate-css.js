/*
Writes the burned-in doc-system theme stylesheet.

Run as a SEPARATE subprocess from the build (orchestrator.ts spawns it) so the heavy
runtime imports it needs — the full tosijs module (via `css`) and the icon system
(via doc-system-styles) — stay out of `bun --watch`'s dependency graph. If these were
imported directly into the orchestrator, the build's regeneration of src/icon-data.ts
would trigger an endless watch->rebuild loop.

Usage: bun src/doc-system/site/generate-css.ts [outputPath]
Default output: docs/doc-system.css
*/
import './build-dom-shim.js'; // must precede any tosijs import (build has no DOM)
import { css } from 'tosijs';
import { docSystemStyleSpec, docSystemThemeGenerator, } from '../doc-system-styles.js';
import { resolveTheme, themeStyleSheet } from '../../theme-data.js';
/**
 * The CSS for a theme saved by the theme editor (`themeFile`), after the stock stylesheet so
 * it wins. Its base colours start from the site's `theme`.
 */
export function themeFileCss(data, theme) {
    const merged = {
        ...data,
        base: { ...theme, ...(data.base ?? {}) },
    };
    return css(themeStyleSheet(resolveTheme(merged, docSystemThemeGenerator)));
}
export async function generateCss(outputPath = 'docs/doc-system.css', theme = {}, themeFile) {
    // No @import: each page links the fonts itself, in parallel (generate-site.ts, #3631).
    let output = css(docSystemStyleSpec(theme, { fontImport: false }));
    if (themeFile) {
        const file = Bun.file(themeFile);
        // Not saved yet is fine; a file that does not parse fails the build, as a typo should.
        if (await file.exists()) {
            let data;
            try {
                data = JSON.parse(await file.text());
            }
            catch (e) {
                throw new Error(`themeFile ${themeFile} is not valid JSON: ${e.message}`, { cause: e });
            }
            output += '\n' + themeFileCss(data, theme);
        }
    }
    await Bun.write(outputPath, output);
}
if (import.meta.main) {
    // theme is passed as a JSON arg by the orchestrator (the shipped module must
    // not import a consumer's repo-root config). Defaults to {} (base theme).
    const outputPath = process.argv[2] || 'docs/doc-system.css';
    const theme = process.argv[3]
        ? JSON.parse(process.argv[3])
        : {};
    await generateCss(outputPath, theme, process.argv[4] || undefined);
    console.log(`generated ${outputPath}`);
}
