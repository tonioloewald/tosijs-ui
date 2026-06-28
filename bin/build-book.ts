/*
Build the ePub (and, with --pdf, the PDF) of the doc site from the extracted
corpus. Run after a normal build so demo/docs.json is current:

  bun run build && bun bin/build-book.ts          # ePub
  bun run build && bun bin/build-book.ts --pdf     # ePub + PDF

Build-time only.
*/
import siteConfig from '../tosijs-site.config'
import { buildEpub } from '../src/doc-system/site'

const config = { ...siteConfig }

const epub = await buildEpub(config, {
  author: 'Tonio Loewald',
})

if (process.argv.includes('--pdf')) {
  const { buildPdf } = await import('../src/doc-system/site/pdf')
  await buildPdf(config)
}

void epub
