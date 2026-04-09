/*#
# layout

Thin structural layout components that wrap CSS flexbox and grid.

## tosi-row

A flex row container. Children are laid out horizontally.

```html
<tosi-row gap="12px" align="center">
  <button>One</button>
  <button>Two</button>
  <button>Three</button>
</tosi-row>
```
```js
import { tosiRow } from 'tosijs-ui'

preview.append(
  tosiRow(
    { gap: '8px', wrap: true },
    ...Array.from({ length: 8 }, (_, i) => {
      const btn = document.createElement('button')
      btn.textContent = `Item ${i + 1}`
      return btn
    })
  )
)
```

## tosi-column

A flex column container. Children are laid out vertically.

```html
<tosi-column gap="8px">
  <span>First</span>
  <span>Second</span>
  <span>Third</span>
</tosi-column>
```
```js
import { tosiColumn } from 'tosijs-ui'

preview.append(
  tosiColumn(
    { gap: '4px' },
    ...['Alpha', 'Beta', 'Gamma'].map((t) => {
      const span = document.createElement('span')
      span.textContent = t
      return span
    })
  )
)
```

## tosi-grid

A CSS grid container.

```html
<tosi-grid columns="1fr 1fr 1fr" gap="8px">
  <div style="background:#eee;padding:8px">A</div>
  <div style="background:#ddd;padding:8px">B</div>
  <div style="background:#ccc;padding:8px">C</div>
  <div style="background:#bbb;padding:8px">D</div>
  <div style="background:#aaa;padding:8px">E</div>
  <div style="background:#999;padding:8px;color:white">F</div>
</tosi-grid>
```
```js
import { tosiGrid } from 'tosijs-ui'

preview.append(
  tosiGrid(
    { columns: 'repeat(3, 1fr)', gap: '4px' },
    ...Array.from({ length: 6 }, (_, i) => {
      const d = document.createElement('div')
      d.textContent = `Cell ${i + 1}`
      d.style.padding = '8px'
      d.style.background = '#eee'
      return d
    })
  )
)
```
*/
import { Component, elements, varDefault } from 'tosijs';
const { slot } = elements;
// ============================================================================
// TosiRow
// ============================================================================
export class TosiRow extends Component {
    static preferredTagName = 'tosi-row';
    static initAttributes = {
        gap: '',
        wrap: false,
        align: '',
        justify: '',
    };
    content = [slot()];
    static shadowStyleSpec = {
        ':host': {
            display: 'flex',
            flexDirection: 'row',
            gap: varDefault.tosiRowGap('0'),
            alignItems: varDefault.tosiRowAlign('stretch'),
            justifyContent: varDefault.tosiRowJustify('flex-start'),
        },
    };
    render() {
        super.render();
        if (this.gap) {
            this.style.setProperty('--tosi-row-gap', this.gap);
        }
        else {
            this.style.removeProperty('--tosi-row-gap');
        }
        if (this.align) {
            this.style.setProperty('--tosi-row-align', this.align);
        }
        else {
            this.style.removeProperty('--tosi-row-align');
        }
        if (this.justify) {
            this.style.setProperty('--tosi-row-justify', this.justify);
        }
        else {
            this.style.removeProperty('--tosi-row-justify');
        }
        this.style.flexWrap = this.wrap ? 'wrap' : '';
    }
}
export const tosiRow = TosiRow.elementCreator();
// ============================================================================
// TosiColumn
// ============================================================================
export class TosiColumn extends Component {
    static preferredTagName = 'tosi-column';
    static initAttributes = {
        gap: '',
        wrap: false,
        align: '',
        justify: '',
    };
    content = [slot()];
    static shadowStyleSpec = {
        ':host': {
            display: 'flex',
            flexDirection: 'column',
            gap: varDefault.tosiColumnGap('0'),
            alignItems: varDefault.tosiColumnAlign('stretch'),
            justifyContent: varDefault.tosiColumnJustify('flex-start'),
        },
    };
    render() {
        super.render();
        if (this.gap) {
            this.style.setProperty('--tosi-column-gap', this.gap);
        }
        else {
            this.style.removeProperty('--tosi-column-gap');
        }
        if (this.align) {
            this.style.setProperty('--tosi-column-align', this.align);
        }
        else {
            this.style.removeProperty('--tosi-column-align');
        }
        if (this.justify) {
            this.style.setProperty('--tosi-column-justify', this.justify);
        }
        else {
            this.style.removeProperty('--tosi-column-justify');
        }
        this.style.flexWrap = this.wrap ? 'wrap' : '';
    }
}
export const tosiColumn = TosiColumn.elementCreator();
// ============================================================================
// TosiGrid
// ============================================================================
export class TosiGrid extends Component {
    static preferredTagName = 'tosi-grid';
    static initAttributes = {
        columns: '',
        rows: '',
        gap: '',
    };
    content = [slot()];
    static shadowStyleSpec = {
        ':host': {
            display: 'grid',
            gridTemplateColumns: varDefault.tosiGridColumns('1fr'),
            gridTemplateRows: varDefault.tosiGridRows('auto'),
            gap: varDefault.tosiGridGap('0'),
        },
    };
    render() {
        super.render();
        if (this.columns) {
            this.style.setProperty('--tosi-grid-columns', this.columns);
        }
        else {
            this.style.removeProperty('--tosi-grid-columns');
        }
        if (this.rows) {
            this.style.setProperty('--tosi-grid-rows', this.rows);
        }
        else {
            this.style.removeProperty('--tosi-grid-rows');
        }
        if (this.gap) {
            this.style.setProperty('--tosi-grid-gap', this.gap);
        }
        else {
            this.style.removeProperty('--tosi-grid-gap');
        }
    }
}
export const tosiGrid = TosiGrid.elementCreator();
