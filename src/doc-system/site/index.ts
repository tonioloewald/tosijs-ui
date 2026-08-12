/*
Public entry for `tosijs-ui/site` — the static, pre-rendered, hydrating
doc-site build system. Build-time only (Bun/node APIs); never import this from
browser code. See ./README is at ../doc-site-system.md and the repo docs.
*/

export { defineSiteConfig } from './site-config.js'
export type {
  SiteConfig,
  SiteHost,
  LibraryBuildContext,
} from './site-config.js'
export { buildSite } from './orchestrator.js'
export { devServer } from './dev-server.js'
export {
  auditDependencies,
  reportAudit,
  resolveAuditMode,
} from './audit-guard.js'
export type {
  AuditConfig,
  AuditGate,
  AuditResult,
  AuditSeverity,
  AuditMode,
  AuditAdvisory,
} from './audit-guard.js'
export { openDevBrowser, buildOpenPlan } from './open-browser.js'
export type { OpenPlan, OpenPlanInput } from './open-browser.js'
export { extractDocs, saveDocsJSON } from './docs.js'
export type { Doc } from './docs.js'
export { generateSite } from './generate-site.js'
export type { GenerateSiteConfig } from './generate-site.js'
export { buildEpub, DEFAULT_BOOK_CSS } from './epub.js'
export type { BuildEpubOptions, BookMeta } from './epub.js'
export { selectBookDocs } from '../book-manifest.js'
export type { BookManifest } from '../book-manifest.js'

export {
  listEpubVolumes,
  epubVolumeIdentity,
  renderEpubDownloads,
  type EpubVolume,
} from './epub-volumes.js'
