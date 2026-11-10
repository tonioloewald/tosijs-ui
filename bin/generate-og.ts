/*
Generate per-page Open Graph cards (1200x630 webp) for the doc site.

Each card is a branded panel — theme background, favicon, page title + description —
with a screenshot of the page's first live example composited in (the component itself is
the most informative possible share image).

Only pages that can show something get a card: the home page (every other page's fallback),
and a page with a live example and no `image` of its own. A text-only card for every other
page said nothing the title doesn't, so those share the home page's card (or the site's
`ogImage`) instead. A page with a live example whose capture fails is an error, not a quiet
text-only card.

This is a SEPARATE, opt-in step (`bun run og`): it needs the dev server running so
it can capture the live examples, and og cards change rarely. Output lands in
demo/static/og/ so it survives the build's `rm -rf docs` and is copied + committed
like any other static asset; the generator then references /og/<slug>.webp.

Tooling: Playwright renders the card + captures examples (ergonomic setContent /
element screenshot); cwebp encodes webp (Playwright emits only png/jpeg, and Homebrew's
ffmpeg dropped its webp encoder in 8.x). Install it with `brew install webp`.

Usage: bun bin/generate-og.ts [serverUrl] [slug ...]
  serverUrl defaults to https://localhost:8787; pass slugs to limit (for testing).
*/

import { chromium } from 'playwright'
import { cpSync, mkdtempSync, readFileSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import * as path from 'path'
import siteConfig from '../tosijs-site.config'
import { buildSlugMap, pathForSlug } from '../src/doc-system/routing'
import { pageDescription } from '../src/doc-system/site/page-metadata'
import { liveFenceLanguages } from '../src/doc-system/site/build-warnings'

declare global {
  var Bun: any
}

interface DocLike {
  filename: string
  title: string
  text: string
  description?: string
  image?: string
}

const accent = siteConfig.theme?.accent ?? '#ee247b'
const projectName = siteConfig.name
const favicon = readFileSync('demo/static/favicon.svg', 'utf8')
  // strip the xml prolog / comments so it inlines cleanly
  .replace(/<\?xml[^>]*\?>/, '')
  .replace(/<!--[\s\S]*?-->/g, '')
  .trim()

const escapeHtml = (s: string): string =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

function cardHtml(doc: DocLike, shot: string | null): string {
  const description = pageDescription(doc).text
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
  * { margin: 0; box-sizing: border-box; }
  html, body { width: 1200px; height: 630px; }
  .card {
    width: 1200px; height: 630px; padding: 64px; display: flex; flex-direction: column;
    font-family: system-ui, -apple-system, sans-serif; color: #fff; position: relative; overflow: hidden;
    background: radial-gradient(120% 120% at 0% 0%, ${accent} 0%, #1a1a1a 130%);
  }
  .brand { display: flex; align-items: center; gap: 20px; }
  .brand svg { width: 64px; height: 64px; filter: drop-shadow(0 2px 6px #0006); }
  .brand .name { font-size: 40px; font-weight: 700; letter-spacing: -0.02em; }
  h1 { font-size: 92px; font-weight: 800; line-height: 1.02; letter-spacing: -0.03em; margin: 40px 0 0; }
  p { font-size: 34px; line-height: 1.35; margin-top: 24px; max-width: 18em; opacity: 0.92; }
  .shot {
    position: absolute; right: 56px; bottom: 56px; width: 560px; max-height: 360px;
    object-fit: contain; object-position: right bottom; border-radius: 16px;
    box-shadow: 0 24px 64px #0008; background: #fff;
  }
  /* Beside a screenshot the text gets the left column: it ran under the shot before. */
  .has-shot h1, .has-shot p { max-width: 500px; }
  .has-shot h1 { font-size: 72px; overflow-wrap: anywhere; }
  .has-shot p {
    font-size: 28px; display: -webkit-box; -webkit-box-orient: vertical;
    -webkit-line-clamp: 6; overflow: hidden;
  }
  .watermark { position: absolute; right: -40px; top: -40px; width: 280px; height: 280px; opacity: 0.12; }
  </style></head><body>
  <div class="card${shot ? ' has-shot' : ''}">
    <div class="watermark">${favicon}</div>
    <div class="brand">${favicon}<span class="name">${escapeHtml(
      projectName
    )}</span></div>
    <h1>${escapeHtml(doc.title)}</h1>
    <p>${escapeHtml(description)}</p>
    ${shot ? `<img class="shot" src="${shot}" />` : ''}
  </div>
  </body></html>`
}

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  const serverUrl =
    args.find((a) => a.startsWith('http')) ?? 'https://localhost:8787'
  const onlySlugs = args.filter((a) => !a.startsWith('http'))

  const docs: DocLike[] = JSON.parse(
    await Bun.file(`${siteConfig.outputDir ?? 'docs'}/docs.json`).text()
  )
  const slugMap = buildSlugMap(docs)
  const outDir = 'demo/static/og'
  /*
  Cards are written OUTSIDE the watched tree and copied in at the end. demo/static is a
  watched static dir, so writing each card there as it was made rebuilt the dev server once
  per card, and its rebuild-loop guard stopped the server this run depends on, part way through.
  */
  const workDir = mkdtempSync(path.join(tmpdir(), 'tosijs-og-'))

  const browser = await chromium.launch()
  const page = await browser.newPage({
    ignoreHTTPSErrors: true,
    viewport: { width: 1200, height: 630 },
  })

  const policy = siteConfig.liveExamples ?? 'auto'
  let made = 0
  const failed: string[] = []
  for (const doc of docs) {
    const slug = slugMap[doc.filename]
    const name = slug || 'index'
    if (onlySlugs.length && !onlySlugs.includes(name)) continue
    const hasExample = liveFenceLanguages([doc], policy).size > 0
    if (name !== 'index' && (doc.image || !hasExample)) {
      if (onlySlugs.length)
        console.log(
          `og: ${name} skipped (${
            doc.image ? 'has its own image' : 'no live example'
          })`
        )
      continue
    }

    // Capture the first live example.
    let shot: string | null = null
    if (hasExample) {
      try {
        await page.goto(`${serverUrl}${pathForSlug(slug)}`, {
          waitUntil: 'domcontentloaded',
        })
        // The preview alone: the example's toolbar says nothing in a share card.
        const el = await page.waitForSelector('tosi-example .preview', {
          timeout: 8000,
        })
        await page.waitForTimeout(900)
        // A dev server with haltijaDev floats haltija's widget over the page; it is not the
        // page, and it landed in the corner of every card.
        await page.evaluate(() =>
          document.querySelector('haltija-dev')?.remove()
        )
        const buf = await el!.screenshot({ type: 'png' })
        shot = `data:image/png;base64,${buf.toString('base64')}`
      } catch (error) {
        console.error(`og: ${name}: could not capture its example: ${error}`)
        failed.push(name)
        continue
      }
    }

    await page.setContent(cardHtml(doc, shot), { waitUntil: 'networkidle' })
    const pngPath = `${workDir}/${slug || 'index'}.png`
    await page.screenshot({ path: pngPath })

    const webpName = (slug || 'index') + '.webp'
    await Bun.$`cwebp -quiet -q 82 ${pngPath} -o ${workDir}/${webpName}`
    rmSync(pngPath)
    made += 1
    console.log(`og: ${webpName}${shot ? ' (with example)' : ''}`)
  }

  await browser.close()
  cpSync(workDir, outDir, { recursive: true })
  rmSync(workDir, { recursive: true, force: true })
  console.log(`generated ${made} og cards in ${outDir}/`)
  if (failed.length) {
    console.error(`og: no card for ${failed.join(', ')}`)
    process.exit(1)
  }
}

await main()
