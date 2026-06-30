/*
Headless PDF generator for the doc system — prints the shared "book" HTML
(book-html.ts, the same one the doc-browser's Print button uses) to PDF via
headless Chromium (Playwright). For interactive use, prefer the in-browser Print
button — this exists for automated/CI PDF generation.

Build-time only; requires `playwright` (a dev dependency here).
*/
import * as fs from 'fs';
import * as path from 'path';
import { buildBookHtml, DEFAULT_BOOK_CSS, PRINT_CSS } from '../book-html';
function slugify(s) {
    return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}
/** Build a PDF of the doc site from the extracted corpus. Returns the path. */
export async function buildPdf(config, opts = {}) {
    const docsJson = opts.docsJson ?? config.docsJson ?? 'demo/docs.json';
    const docs = JSON.parse(fs.readFileSync(docsJson, 'utf8'));
    const title = opts.title ?? config.name;
    const css = opts.css ??
        `${DEFAULT_BOOK_CSS}\n${PRINT_CSS}${opts.extraCss ? '\n' + opts.extraCss : ''}`;
    const html = buildBookHtml(docs, { title, css, lang: config.lang });
    let chromium;
    try {
        ;
        ({ chromium } = await import('playwright'));
    }
    catch {
        throw new Error('PDF build needs Playwright. Install it (`npm i -D playwright && npx playwright install chromium`).');
    }
    const output = path.resolve(opts.output ?? path.join(config.outputDir ?? 'docs', `${slugify(title)}.pdf`));
    const browser = await chromium.launch();
    try {
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: 'load' });
        await page.pdf({
            path: output,
            format: opts.format ?? 'A4',
            printBackground: true,
            displayHeaderFooter: false,
        });
    }
    finally {
        await browser.close();
    }
    console.log(`pdf: ${output}`);
    return output;
}
