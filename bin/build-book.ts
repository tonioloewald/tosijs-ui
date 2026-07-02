/*
Build the ePub of the doc site from the extracted corpus. Run after a normal
build so demo/docs.json is current:

  bun run build && bun bin/build-book.ts          # ePub

Build-time only. (PDF generation is now the in-app Print button, not a batch job.)
*/
import siteConfig from '../tosijs-site.config'
import { buildEpub } from '../src/doc-system/site'

const config = { ...siteConfig }

await buildEpub(config, {
  author: 'Tonio Loewald',
})
