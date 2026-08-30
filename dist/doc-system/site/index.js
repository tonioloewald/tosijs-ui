/*
Public entry for `tosijs-ui/site` — the static, pre-rendered, hydrating
doc-site build system. Build-time only (Bun/node APIs); never import this from
browser code. See ./README is at ../doc-site-system.md and the repo docs.
*/
export { defineSiteConfig } from './site-config.js';
export { buildSite } from './orchestrator.js';
export { devServer } from './dev-server.js';
export { auditDependencies, reportAudit, resolveAuditMode, } from './audit-guard.js';
export { openDevBrowser, buildOpenPlan } from './open-browser.js';
export { extractDocs, saveDocsJSON } from './docs.js';
export { generateSite } from './generate-site.js';
export { buildEpub, DEFAULT_BOOK_CSS } from './epub.js';
export { selectBookDocs } from '../book-manifest.js';
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
