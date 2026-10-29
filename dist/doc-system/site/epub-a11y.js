/*
EPUB Accessibility 1.1 metadata for a built book (#3522).

With the site's `accessibility` mode on, the package document says what the book is and what it
offers a reader who cannot see it: its access modes, which of them is sufficient on its own, its
features, its hazards, a summary, and, only when a checker has verified it, the standard it
conforms to.

Every statement is DERIVED, so it cannot say more than the build knows. "alternativeText" and
"textual is sufficient" are claimed only when every image in the volume has alt text or a
caption, by the same report the site build prints. `conformsTo` is never claimed from metadata
alone: a conformance claim nothing verified is worse than none (an e-book distributor takes the
claim at face value). DAISY Ace is the verifier, when the adopter has it installed.
*/
import { spawn } from 'bun';
import { existsSync, mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import * as path from 'path';
/** The `dcterms:conformsTo` value EPUB Accessibility 1.1 defines for WCAG 2.2 AA. */
export const EPUB_A11Y_CONFORMANCE = 'EPUB Accessibility 1.1 - WCAG 2.2 Level AA';
const escapeXml = (s) => s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
/** The `<meta>` lines for the package document's `<metadata>`, indented to sit in it. */
export function accessibilityMetadata(facts, opts = {}) {
    const meta = (property, value) => `<meta property="${property}">${escapeXml(value)}</meta>`;
    const textualEnough = !facts.hasImages || facts.imagesDescribed;
    const features = [
        'structuralNavigation',
        'tableOfContents',
        'readingOrder',
        'displayTransformability',
        ...(facts.hasImages && facts.imagesDescribed ? ['alternativeText'] : []),
    ];
    const summary = opts.summary ??
        [
            'Reflowable text with a navigable table of contents and headings in reading order.',
            facts.hasImages
                ? facts.imagesDescribed
                    ? 'Every image has a text alternative or a caption.'
                    : 'Some images have no text alternative.'
                : 'The book has no images.',
            facts.verified
                ? 'Checked with DAISY Ace against WCAG 2.2 AA.'
                : 'Not checked against WCAG 2.2 AA by an accessibility checker.',
        ].join(' ');
    return [
        meta('schema:accessMode', 'textual'),
        ...(facts.hasImages ? [meta('schema:accessMode', 'visual')] : []),
        ...(textualEnough ? [meta('schema:accessModeSufficient', 'textual')] : []),
        ...(facts.hasImages
            ? [meta('schema:accessModeSufficient', 'textual,visual')]
            : []),
        ...features.map((f) => meta('schema:accessibilityFeature', f)),
        ...(opts.hazards ?? ['none']).map((h) => meta('schema:accessibilityHazard', h)),
        meta('schema:accessibilitySummary', summary),
        ...(facts.verified
            ? [meta('dcterms:conformsTo', EPUB_A11Y_CONFORMANCE)]
            : []),
        ...(opts.certifiedBy ? [meta('a11y:certifiedBy', opts.certifiedBy)] : []),
    ]
        .map((line) => `\n    ${line}`)
        .join('');
}
/**
 * Check a built `.epub` with DAISY Ace (`@daisy/ace`), resolved from the project's own
 * `node_modules/.bin`. It is the adopter's: never a dependency of tosijs-ui.
 */
export async function runAce(epubFile, projectDir = process.cwd()) {
    const bin = path.join(projectDir, 'node_modules', '.bin', 'ace');
    if (!existsSync(bin))
        return {
            ran: false,
            reason: 'DAISY Ace is not installed in this project (bun add -d @daisy/ace)',
        };
    const out = mkdtempSync(path.join(tmpdir(), 'tosijs-ace-'));
    try {
        const child = spawn([bin, '--silent', '--force', '--outdir', out, epubFile], {
            cwd: projectDir,
            stdout: 'pipe',
            stderr: 'pipe',
        });
        const [stderr, code] = await Promise.all([
            new Response(child.stderr).text(),
            child.exited,
        ]);
        const reportFile = path.join(out, 'report.json');
        if (!existsSync(reportFile))
            return {
                ran: false,
                reason: `DAISY Ace wrote no report (exit ${code}): ${stderr
                    .trim()
                    .slice(0, 300)}`,
            };
        return { ran: true, ...aceVerdict(await Bun.file(reportFile).json()) };
    }
    finally {
        rmSync(out, { recursive: true, force: true });
    }
}
/** Pass or fail, and the failing checks' titles, from an Ace `report.json`. */
export function aceVerdict(report) {
    const failures = new Set();
    const walk = (assertion) => {
        if (assertion?.['earl:result']?.['earl:outcome'] === 'fail') {
            const title = assertion['earl:test']?.['dct:title'];
            if (title)
                failures.add(String(title));
        }
        for (const child of assertion?.assertions ?? [])
            walk(child);
    };
    for (const assertion of report?.assertions ?? [])
        walk(assertion);
    const outcome = report?.['earl:result']?.['earl:outcome'];
    return { passed: outcome === 'pass', failures: [...failures] };
}
