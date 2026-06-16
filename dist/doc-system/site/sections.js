/*
Section docs + TOC writeback (build-time only; uses fs).

A doc's `parent` groups it into a nav section. `ensureSections`:
  1. auto-creates a real .md file for any referenced parent that doesn't exist
     yet (so authors can later add intro prose + metadata like pin/order),
  2. regenerates the `<!-- toc -->…<!-- /toc -->` block inside every .md parent
     so its body lists its children.

Write-if-changed + a total-order child sort (pinnedSort) make this idempotent —
repeated builds reach a fixed point and emit no fs events, so `bun --watch`
doesn't loop. TOC links are root-relative (basePath-agnostic source).
*/
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import * as path from 'path';
import { buildSlugMap, pathForSlug, slugify, resolveParent } from '../routing';
import { pinnedSort } from '../nav-tree';
const TOC_RE = /<!-- toc -->[\s\S]*?<!-- \/toc -->/;
function readDocs(p) {
    return JSON.parse(readFileSync(p, 'utf8'));
}
export function ensureSections(opts) {
    const { docsJsonPath, sectionsDir, reExtract } = opts;
    let docs = readDocs(docsJsonPath);
    let slugMap = buildSlugMap(docs);
    // 1. Auto-create a stub .md for any referenced-but-missing parent.
    let created = false;
    for (const ref of new Set(docs.map((d) => d.parent).filter(Boolean))) {
        if (resolveParent(ref, docs, slugMap))
            continue; // already exists
        const file = path.join(sectionsDir, slugify(ref) + '.md');
        if (existsSync(file))
            continue;
        mkdirSync(sectionsDir, { recursive: true });
        // Heading first so the doc title is clean; empty TOC block filled below.
        writeFileSync(file, `# ${ref}\n\n<!-- toc -->\n<!-- /toc -->\n`, 'utf8');
        created = true;
    }
    if (created) {
        reExtract();
        docs = readDocs(docsJsonPath);
        slugMap = buildSlugMap(docs);
    }
    // 2. Regenerate the TOC block inside every .md parent (write-if-changed).
    const childrenOf = new Map();
    for (const doc of docs) {
        const pf = doc.parent ? resolveParent(doc.parent, docs, slugMap) : '';
        if (!pf)
            continue;
        let arr = childrenOf.get(pf);
        if (!arr) {
            arr = [];
            childrenOf.set(pf, arr);
        }
        arr.push(doc);
    }
    let wrote = false;
    for (const [parentFilename, kids] of childrenOf) {
        const parent = docs.find((d) => d.filename === parentFilename);
        // Only .md parents get an auto-TOC in their body (a .ts parent is code).
        if (!parent || !parent.path.endsWith('.md') || !existsSync(parent.path))
            continue;
        kids.sort(pinnedSort);
        const list = kids
            .map((k) => `- [${k.title}](${pathForSlug(slugMap[k.filename])})`)
            .join('\n');
        const block = `<!-- toc -->\n${list}\n<!-- /toc -->`;
        const current = readFileSync(parent.path, 'utf8');
        const updated = TOC_RE.test(current)
            ? current.replace(TOC_RE, block)
            : current.replace(/\s*$/, '') + '\n\n' + block + '\n';
        if (updated !== current) {
            writeFileSync(parent.path, updated, 'utf8');
            wrote = true;
        }
    }
    if (wrote)
        reExtract(); // refresh corpus so doc.text includes the new TOCs
}
