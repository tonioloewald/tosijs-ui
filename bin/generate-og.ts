/*
Generate per-page Open Graph cards (1200x630 webp) for the doc site.

Each card is a branded panel — theme background, favicon, page title + description —
with a screenshot of the page's first live example composited in when one exists
(the component itself is the most informative possible share image).

This is a SEPARATE, opt-in step (`bun run og`): it needs the dev server running so
it can capture the live examples, and og cards change rarely. Output lands in
demo/static/og/ so it survives the build's `rm -rf docs` and is copied + committed
like any other static asset; the generator then references /og/<slug>.webp.

Tooling: Playwright renders the card + captures examples (ergonomic setContent /
element screenshot); ffmpeg encodes webp (Playwright emits only png/jpeg).

Usage: bun bin/generate-og.ts [serverUrl] [slug ...]
  serverUrl defaults to https://localhost:8787; pass slugs to limit (for testing).
*/

import { chromium } from 'playwright'
import { readFileSync } from 'fs'
import siteConfig from '../tosijs-site.config'
import { buildSlugMap, pathForSlug } from '../src/doc-system/routing'
import { docDescription } from '../src/doc-system/render'

declare global {
  var Bun: any
}

interface DocLike {
  filename: string
  title: string
  text: string
  description?: string
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
  const description = doc.description || docDescription(doc.text) || ''
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
  .watermark { position: absolute; right: -40px; top: -40px; width: 280px; height: 280px; opacity: 0.12; }
  </style></head><body>
  <div class="card">
    <div class="watermark">${favicon}</div>
    <div class="brand">${favicon}<span class="name">${escapeHtml(projectName)}</span></div>
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

  const browser = await chromium.launch()
  const page = await browser.newPage({
    ignoreHTTPSErrors: true,
    viewport: { width: 1200, height: 630 },
  })

  let made = 0
  for (const doc of docs) {
    const slug = slugMap[doc.filename]
    if (onlySlugs.length && !onlySlugs.includes(slug || 'index')) continue

    // Capture the first live example (best-effort — many docs have one, some don't).
    let shot: string | null = null
    const hasExample = /```(js|html)/.test(doc.text)
    if (hasExample) {
      try {
        await page.goto(`${serverUrl}${pathForSlug(slug)}`, {
          waitUntil: 'domcontentloaded',
        })
        await page.waitForSelector('tosi-example .preview, tosi-example', {
          timeout: 8000,
        })
        await page.waitForTimeout(900)
        const el = await page.$('tosi-example')
        if (el) {
          const buf = await el.screenshot({ type: 'png' })
          shot = `data:image/png;base64,${buf.toString('base64')}`
        }
      } catch {
        /* no capturable example — fall back to a text-only card */
      }
    }

    await page.setContent(cardHtml(doc, shot), { waitUntil: 'networkidle' })
    const pngPath = `/tmp/og-${slug || 'index'}.png`
    await page.screenshot({ path: pngPath })

    const webpName = (slug || 'index') + '.webp'
    await Bun.$`ffmpeg -y -loglevel error -i ${pngPath} -c:v libwebp -quality 82 ${outDir}/${webpName}`
    made += 1
    console.log(`og: ${webpName}${shot ? ' (with example)' : ''}`)
  }

  await browser.close()
  console.log(`generated ${made} og cards in ${outDir}/`)
}

await main()
