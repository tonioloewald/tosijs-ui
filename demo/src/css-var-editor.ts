import {
  Component as WebComponent,
  ElementCreator,
  elements,
  Color,
} from 'tosijs'
import { tosiForm, TosiForm, tosiField } from '../../src'

const { h2, code } = elements

class TosiCssVarEditor extends WebComponent {
  elementSelector = ''
  targetSelector = ''

  constructor() {
    super()

    this.initAttributes('elementSelector', 'targetSelector')
  }

  content = () => [
    h2({ part: 'title' }, 'CSS variables'),
    tosiForm({ part: 'variables', changeCallback: this.update }),
  ]

  loadVars = () => {
    const { title, variables } = this.parts

    variables.textContent = ''

    if (this.elementSelector) {
      title.textContent = `CSS variables for ${this.elementSelector}`
      const element = document.querySelector(this.elementSelector)
      if (!element) {
        setTimeout(this.loadVars, 250)
        return
      }
      const styleNode = element.shadowRoot
        ? element.shadowRoot.querySelector('style')
        : document.querySelector(`style#${this.elementSelector}-component`)
      const computedStyle = getComputedStyle(element)
      if (styleNode && styleNode.textContent) {
        const cssVars = [
          ...new Set([...(styleNode.textContent!.match(/--[\w-]+/g) || [])]),
        ]

        for (const cssVar of cssVars) {
          let value = computedStyle.getPropertyValue(cssVar)
          const type = value.match(/^(#|rgb|hsl)[\d()a-fA-F]+$/)
            ? 'color'
            : 'string'
          if (type === 'color') {
            value = Color.fromCss(value).html
          }
          variables.append(
            tosiField(code(cssVar), { key: cssVar, value, type })
          )
        }
      }
    }
  }

  update = () => {
    const selector = this.targetSelector || this.elementSelector
    if (selector) {
      const targets = [
        ...(document.querySelectorAll(selector) || []),
      ] as HTMLElement[]
      const { value } = this.parts.variables as TosiForm
      for (const target of targets) {
        for (const key of Object.keys(value)) {
          target.style.setProperty(key, value[key])
        }
      }
    }
  }

  connectedCallback() {
    super.connectedCallback()

    this.loadVars()

    this.parts.variables.addEventListener('change', this.update)
  }
}

export const tosiCssVarEditor = TosiCssVarEditor.elementCreator({
  tag: 'tosi-css-var-editor',
}) as ElementCreator<TosiCssVarEditor>
