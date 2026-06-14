/*
Public entry for `tosijs-ui/site` — the static, pre-rendered, hydrating
doc-site build system. Build-time only (Bun/node APIs); never import this from
browser code. See ./README is at ../doc-site-system.md and the repo docs.
*/

export { defineSiteConfig } from './site-config'
export type { SiteConfig, SiteHost } from './site-config'
export { buildSite } from './orchestrator'
export { devServer } from './dev-server'
export { extractDocs, saveDocsJSON } from './docs'
export type { Doc } from './docs'
export { generateSite } from './generate-site'
export type { GenerateSiteConfig } from './generate-site'
