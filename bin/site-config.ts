/*
Build configuration for the static doc-system site.

A project drops a `tosijs-site.config.ts` at its root that does
`export default defineSiteConfig({ ... })`; the build (bin/dev.ts) imports it and
feeds it to the generator. This is the single place a consuming repo (tosijs-ui,
tosijs-3d, ...) configures branding, links, theme, SEO defaults, and build paths —
the seam that makes the build system reusable.

Imports here are type-only so this module stays free of runtime/DOM dependencies
(it is loaded by the build, which has no DOM).
*/

import type { ProjectLinks, LinkItem } from '../src/doc-browser'
import type { DocSystemTheme } from '../src/doc-system/doc-system-styles'

export interface SiteConfig {
  /** project / brand name — header, <title> suffix, og:site_name */
  name: string
  /** one-line site description — home-page meta + structured data */
  description?: string
  /** absolute site origin for canonical/og URLs, e.g. https://ui.tosijs.net */
  baseUrl?: string
  /** <html lang>, default 'en' */
  lang?: string

  /** logo + view-source links (createDocBrowser projectLinks) */
  projectLinks?: ProjectLinks
  /** header-bar icon links */
  navbarLinks?: LinkItem[]

  /** base theme colors — most of the palette is derived from `accent` */
  theme?: DocSystemTheme

  /** favicon href, default /favicon.svg */
  favicon?: string
  /** default social/share image (og:image); per-page overridable via doc metadata */
  ogImage?: string
  /** extra raw lines injected into every <head> */
  headExtra?: string

  /** translation table (TSV) powering the settings menu's language picker */
  localizedStrings?: string

  /** doc-extraction source paths, default ['src', 'README.md', 'bin', 'icons'] */
  docPaths?: string[]
  /** served web-root output dir, default 'docs' */
  outputDir?: string
  /** dev-server port, default 8787 */
  port?: number
}

/** Identity helper that gives a site config module full type-checking + IDE help. */
export function defineSiteConfig(config: SiteConfig): SiteConfig {
  return config
}
