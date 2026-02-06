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
  liveExampleTagName: string
): void {
  const sources: SourceBlock[] = [
    ...element.querySelectorAll(
      '.language-html,.language-js,.language-css,.language-test'
    ),
  ]
    .filter((el) => !el.closest(liveExampleTagName))
    .map((code) => ({
      block: code.parentElement as HTMLPreElement,
      language: code.classList[0].split('-').pop(),
      code: (code as HTMLElement).innerText,
    }))

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
    const parent = exampleSources[0].block.parentElement as HTMLElement
    parent.insertBefore(example, exampleSources[0].block)

    exampleSources.forEach((source) => {
      switch (source.language) {
        case 'js':
          example.js = source.code
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
  }
}
