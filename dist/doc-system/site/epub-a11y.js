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
import { runBounded } from './bounded-child.js';
import { existsSync, mkdtempSync, readFileSync, realpathSync, rmSync } from 'fs';
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
/** Why Ace did not run, when it is not installed anywhere. */
export const ACE_NOT_INSTALLED = 'DAISY Ace is not installed (npm install -g @daisy/ace, which keeps it out of your lockfile)';
/** Is `bin` DAISY Ace? Its real path sits inside a `@daisy/ace` package (#3864). */
export function isDaisyAce(bin) {
    let dir;
    try {
        dir = path.dirname(realpathSync(bin));
    }
    catch {
        return false;
    }
    for (let i = 0; i < 8; i++) {
        const manifest = path.join(dir, 'package.json');
        if (existsSync(manifest)) {
            try {
                const { name } = JSON.parse(readFileSync(manifest, 'utf8'));
                if (typeof name === 'string' && name.startsWith('@daisy/ace'))
                    return true;
            }
            catch {
                // not a manifest we can read: keep looking up
            }
        }
        const parent = path.dirname(dir);
        if (parent === dir)
            break;
        dir = parent;
    }
    return false;
}
/**
 * Where DAISY Ace is: the project's own `node_modules/.bin` first, then `PATH`. A global install
 * is the one the docs recommend: Ace brings Electron and Puppeteer, whose advisories would
 * otherwise fail the project's own dependency audit (#3577). It is the adopter's, never a
 * dependency of tosijs-ui.
 *
 * Only DAISY Ace counts: an unrelated program named `ace` would otherwise decide whether a book
 * claims conformance (#3864). `notAce` lists any `ace` found that is not it.
 */
export function locateAce(projectDir = process.cwd(), searchPath = process.env.PATH ?? '') {
    const candidates = [
        path.join(projectDir, 'node_modules', '.bin', 'ace'),
        ...searchPath
            .split(path.delimiter)
            .filter(Boolean)
            .map((dir) => path.join(dir, 'ace')),
    ].filter((file) => existsSync(file));
    const bin = candidates.find(isDaisyAce) ?? null;
    return {
        bin,
        notAce: bin ? [] : [...new Set(candidates)],
    };
}
export function findAce(projectDir = process.cwd(), searchPath = process.env.PATH ?? '') {
    return locateAce(projectDir, searchPath).bin;
}
const ACE_TIMEOUT_MS = 10 * 60_000;
/** Check a built `.epub` with DAISY Ace (`@daisy/ace`). */
export async function runAce(epubFile, projectDir = process.cwd(), searchPath = process.env.PATH ?? '') {
    const { bin, notAce } = locateAce(projectDir, searchPath);
    if (!bin)
        return {
            ran: false,
            reason: notAce.length
                ? `${ACE_NOT_INSTALLED}. Found \`ace\` at ${notAce.join(', ')}, which is not DAISY Ace`
                : ACE_NOT_INSTALLED,
        };
    const out = mkdtempSync(path.join(tmpdir(), 'tosijs-ace-'));
    try {
        // Ace drives a browser; ten minutes is far past any real book, so past it Ace is hung (#3860).
        const { stderr, code, timedOut } = await runBounded([bin, '--silent', '--force', '--outdir', out, epubFile], { cwd: projectDir, timeoutMs: ACE_TIMEOUT_MS });
        if (timedOut)
            return {
                ran: false,
                reason: `DAISY Ace did not finish in ${ACE_TIMEOUT_MS / 60_000} minutes and was stopped`,
            };
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
