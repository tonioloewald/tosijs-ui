import { Component } from 'xinjs'
import { marked } from 'marked'
class MarkdownViewer extends Component {
  src = ''
  value = ''
  content = null
  constructor() {
    super()
    this.initAttributes('src')
  }
  connectedCallback(): void {
    super.connectedCallback()
    if (this.src !== '') {
      ;(async () => {
        const request = await fetch(this.src)
        this.value = await request.text()
      })()
    } else if (this.value === '') {
      this.value = this.textContent != null ? this.textContent : ''
    }
  }
  render() {
    super.render()
    this.innerHTML = marked(this.value, { mangle: false, headerIds: false })
  }
}

export const markdownViewer = MarkdownViewer.elementCreator({
  tag: 'markdown-viewer',
})
