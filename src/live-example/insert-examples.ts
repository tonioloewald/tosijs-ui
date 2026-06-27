import { ElementCreator } from 'tosijs'
import { ExampleContext } from './types'
import type { LiveExample } from './component'

interface SourceBlock {
  block: HTMLPreElement
  language: string | undefined
  code: string
}

/**
 * Find and replace sequences of code blocks with live examples
 */
export function insertExamples(
  element: HTMLElement,
  context: ExampleContext,
  liveExampleCreator: ElementCreator<LiveExample>,
  liveExampleTagName: string,
  // The source file this doc was extracted from (a `.md`, or a `.ts`/`.js`/`.css`
  // with extracted doc comments). Stamped onto each example as
  // `data-source-file` + `data-example-ordinal` so a DocStore can locate the
  // originating fenced block to save edits back. Read-only; the write path comes
  // with Foundation B. Omitted when there's no source (e.g. embedded corpora).
  sourceFile?: string
): void {
  const sources: SourceBlock[] = [
    ...element.querySelectorAll(
      '.language-html,.language-js,.language-tjs,.language-ts,.language-css,.language-test'
    ),
  ]
    .filter((el) => !el.closest(liveExampleTagName))
    .map((code) => ({
      block: code.parentElement as HTMLPreElement,
      language: code.classList[0].split('-').pop(),
      code: (code as HTMLElement).innerText,
    }))

  // Per-doc ordinal: the Nth live example on the page. Combined with sourceFile
  // it's the key back to the originating fenced-block group in the source.
  let ordinal = 0
  for (let index = 0; index < sources.length; index += 1) {
    const exampleSources = [sources[index]]

    // Group consecutive code blocks
    while (
      index < sources.length - 1 &&
      sources[index].block.nextElementSibling === sources[index + 1].block
    ) {
      exampleSources.push(sources[index + 1])
      index += 1
    }

    const example = liveExampleCreator({ context })
    if (sourceFile !== undefined) {
      example.setAttribute('data-source-file', sourceFile)
      example.setAttribute('data-example-ordinal', String(ordinal))
    }
    ordinal += 1
    const parent = exampleSources[0].block.parentElement as HTMLElement
    parent.insertBefore(example, exampleSources[0].block)

    exampleSources.forEach((source) => {
      switch (source.language) {
        case 'js':
        case 'tjs':
        case 'ts':
          // All three are the example's executable "source" block; they land in
          // the same editor and the dialect drives how it's transpiled/run.
          example.js = source.code
          example.dialect = source.language
          break
        case 'html':
          example.html = source.code
          break
        case 'css':
          example.css = source.code
          break
        case 'test':
          example.test = source.code
          break
      }
      source.block.remove()
    })

    example.showDefaultTab()
    // Snapshot the original source, then restore any locally-saved edit on top
    // (per-browser scratchpad, keyed by the data-source-file/ordinal stamps).
    example.snapshotAndRestoreLocalEdit()
  }
}
