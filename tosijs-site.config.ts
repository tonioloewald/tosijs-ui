// Site configuration for the tosijs-ui documentation site.
// See bin/site-config.ts for the full set of options.

import { defineSiteConfig } from './src/doc-system/site/site-config'
import localizedStrings from './demo/src/localized-strings'

const PROJECT = 'tosijs-ui'

export default defineSiteConfig({
  name: PROJECT,
  description:
    'Simple, robust web-components for use with tosijs or anything else.',
  baseUrl: 'https://ui.tosijs.net',

  // Used for the logo and the view-source link.
  projectLinks: {
    tosijs: 'https://tosijs.net',
    github: `https://github.com/tonioloewald/${PROJECT}`,
  },
  // Header-bar icon links.
  navbarLinks: [
    { href: 'https://tosijs.net', label: 'tosijs', icon: 'tosi' },
    {
      href: 'https://discord.com/invite/ramJ9rgky5',
      label: 'discord',
      icon: 'discord',
    },
    { href: 'https://loewald.com', label: 'blog', icon: 'blog' },
    {
      href: `https://github.com/tonioloewald/${PROJECT}`,
      label: 'github',
      icon: 'github',
    },
    {
      href: `https://www.npmjs.com/package/${PROJECT}`,
      label: 'npmjs',
      icon: 'npm',
    },
  ],

  localizedStrings,
  favicon: '/favicon.svg',

  // tosijs-ui's build also publishes the npm package, and bundles its own IIFE.
  emitLibrary: true,
  bundleEntry: './src/index-iife.ts',
  docPaths: ['src', 'README.md', 'bin', 'icons'],
  staticDirs: ['demo/static'],
  // Served from GitHub Pages at the apex custom domain (CNAME in demo/static;
  // domain derives from baseUrl). basePath stays '/'.
  host: 'github-pages',
  // version stamp + icon-data regeneration are wired in bin/dev.ts (prebuild).
})
