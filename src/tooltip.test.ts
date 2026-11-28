import { expect, test } from 'bun:test'
import { initTooltips } from './tooltip'

/*
#4342: a tooltip is usually a converted `title`, which often holds text the page did not write.
Its markdown used to be written through innerHTML, so `<img onerror>` in a title ran on hover.
*/
test('a tooltip from a hostile title renders no live markup (#4342)', async () => {
  initTooltips({ delay: 0 })
  const target = document.createElement('button')
  target.title = 'hello <img src="x" onerror="alert(1)"> **bold**'
  document.body.append(target)
  target.dispatchEvent(
    new Event('pointermove', { bubbles: true, composed: true })
  )
  await new Promise((resolve) => setTimeout(resolve, 20))
  const shown = [...document.querySelectorAll('*')].find(
    (el) =>
      el.textContent?.includes('hello') && el !== target && !el.contains(target)
  ) as HTMLElement | undefined
  expect(shown).toBeDefined()
  expect(shown!.innerHTML).not.toContain('onerror')
  // still markdown, just safe markdown
  expect(shown!.querySelector('strong')?.textContent).toBe('bold')
  target.remove()
})
