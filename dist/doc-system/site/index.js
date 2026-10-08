/*
Public entry for `tosijs-ui/site` — the static, pre-rendered, hydrating
doc-site build system. Build-time only (Bun/node APIs); never import this from
browser code. See ./README is at ../doc-site-system.md and the repo docs.
*/
export { defineSiteConfig } from './site-config.js';
export { buildSite } from './orchestrator.js';
// Thrown by `buildSite` under `strict: true` — exported so a caller can tell a refused
// misconfiguration from a crash (`catch (e) { if (e instanceof SiteMisconfiguredError) … }`).
export { SiteMisconfiguredError } from './build-warnings.js';
// THE pass/fail rule for a browser-test report (`window.__docTestResults`), for adopters'
// own gates: it fails on pages that never reported, not only on failed tests.
export { testReportVerdict } from './test-report.js';
export { devServer } from './dev-server.js';
export { auditDependencies, reportAudit, resolveAuditMode, } from './audit-guard.js';
export { openDevBrowser, buildOpenPlan } from './open-browser.js';
export { extractDocs, saveDocsJSON } from './docs.js';
export { generateSite } from './generate-site.js';
export { buildEpub, DEFAULT_BOOK_CSS } from './epub.js';
export { selectBookDocs } from '../book-manifest.js';
export { placeInBook, bookTextOf } from '../book-target.js';
// Insets and conditional text (#217): `extractDocs` applies these; exported for a consumer
// that builds its corpus some other way.
export { assembleCorpus, resolveInsets, splitConditions, SingleSourceError, } from './single-source.js';
export { listEpubVolumes, epubVolumeIdentity, renderEpubDownloads, } from './epub-volumes.js';
/*
Reading the build lock is part of the PUBLIC surface, not an internal detail (#117).

A consumer writing `bun run stop` needs to answer "is a server already running for this
project, and which process is it?" — and the honest answer lives in the lock file this
package writes. Without these exports the only routes were an internal path (`blocked by the
exports map`) or re-deriving the lock path locally, which means copying the FNV-1a hash of
the resolved root. That copy is the dangerous option: if the hash ever changes, the consumer
reports "nothing running" WHILE a server runs — a silently wrong answer, which is precisely
the failure this whole area exists to prevent. Exporting the reader is what makes the safe
choice also the easy one.
*/
export { currentHolder, describeHolder, lockPathFor, lockDecision, isProcessAlive, } from './build-lock.js';
/*
Syntax highlighting for static code blocks.

`registerGrammar` is the seam for a language that ships its own Prism definition — tjs-lang
generates one for TJS from the same source that emits their TextMate grammars (#155), and
hardcoding it in our alias table would put their grammar behind our release cadence.

Registered grammars are used by the BUILD-time pass too, so they reach the pre-rendered page,
the ePub and print — not just a hydrated browser tab. That matters more than usual here: a
wrong token colour is cosmetic on the web and permanent in a printed book.
*/
export { registerGrammar, registeredGrammars, highlightHtml, highlightBlocks, grammarFor, } from '../highlight.js';
// For a site whose registered dialect (#184) shares its name with a highlighter grammar: call
// this in the site config so the build treats those fences as live examples too.
export { registerLiveLanguage } from '../example-policy.js';
