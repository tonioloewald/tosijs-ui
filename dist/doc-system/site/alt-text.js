/*
The accessibility mode's alt-text hook (#3521, item 3).

`altText` in the site config is asked for a text alternative for every markdown image the
build would otherwise report (no alt text and no caption). What it returns goes into the
CORPUS the build renders from, so the page, `docs.json`, the hydrated browser and the ePub all
carry it. It never goes into a source file: generated alt text is the adopter's to review
before it becomes authored text.

The doc system stays model-agnostic: the hook is whatever the adopter plugs in (a vision model,
a lookup table, a human-written sidecar file). It is called on EVERY build, watch rebuilds
included, so a hook that calls a paid service should cache by `src`.
*/
import { accessibilityFindings } from './a11y-report.js';
/** Markdown-safe alt text: one line, with the characters that would end it escaped. */
const altMarkdown = (alt) => alt
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[\\[\]]/g, (c) => `\\${c}`);
/**
 * A copy of `docs` with each image the hook answered given its alt text, plus how many images
 * were asked about and how many were answered. Docs the hook changes nothing in are returned
 * as they were.
 */
export async function applyAltText(docs, hook) {
    let asked = 0;
    let supplied = 0;
    const out = [];
    for (const doc of docs) {
        const images = accessibilityFindings(doc.text, doc.title)
            .map((f) => f.image)
            .filter((image) => image !== undefined);
        let text = doc.text;
        // One answer per distinct reference: the same image twice on a page is the same picture.
        const seen = new Set();
        for (const image of images) {
            if (seen.has(image.raw))
                continue;
            seen.add(image.raw);
            asked += 1;
            const alt = await hook({
                src: image.href,
                ...(image.title ? { title: image.title } : {}),
                doc: { filename: doc.filename, title: doc.title, path: doc.path },
            });
            const clean = alt ? altMarkdown(alt) : '';
            if (!clean || !image.raw.startsWith('![]'))
                continue;
            supplied += 1;
            text = text.split(image.raw).join(`![${clean}]${image.raw.slice(3)}`);
        }
        out.push(text === doc.text ? doc : { ...doc, text });
    }
    return { docs: out, asked, supplied };
}
