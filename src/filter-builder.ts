/*#
# filter

Automatically creates `ArrayFilter` functions `(a: any[]) => any[]` based on the query you build using its
macOS Finder-inspired interface, using an easily customizable / extensible collection of `Filter` objects.

```js
import { elements } from 'tosijs'
import { dataTable, filterBuilder, availableFilters } from 'tosijs-ui'

const sourceWords = ['acorn', 'bubblegum', 'copper', 'daisy', 'ellipse', 'fabulous', 'gerund', 'hopscotch', 'idiom', 'joke']
function randomWords () {
  let numWords = Math.random() * 4
  const words = []
  while (numWords > 0) {
    numWords -= 1
    words.push(sourceWords[Math.floor(Math.random() * 10)])
  }
  return [...new Set(words)]
}

const array = []
for(let i = 0; i < 1000; i++) {
  array.push({
    date: new Date(Math.random() * Date.now()).toISOString().split('T')[0],
    isLucky: Math.random() < 0.1,
    number: Math.floor(Math.random() * 200 - 100),
    string: randomWords().join(' '),
    tags: randomWords()
  })
}

const { span } = elements
const tagsBinding = {
  value: '^.tags',
  binding: {
    toDOM(element, value) {
      element.classList.add('tag-list')
      element.textContent = ''
      element.append(...value.map(tag => span(tag, {class: 'tag'})))
    }
  }
}

const columns = [
  {
    prop: 'date',
    width: 120
  },
  {
    prop: 'isLucky',
    type: 'boolean',
    width: 90
  },
  {
    prop: 'number',
    align: 'right',
    width: 90
  },
  {
    prop: 'string',
    width: 200
  },
  {
    prop: 'tags',
    width: 200,
    dataCell() {
      return elements.div({ bind: tagsBinding })
    }
  },
]

const table = dataTable({ array, columns })
const filter = filterBuilder({
  fields: columns,
  onChange(event) {
    table.filter = filter.filter
  }
})
preview.append(filter, table)
```
```css
.preview {
  display: flex;
  flex-direction: column;
}

.preview xin-table {
  flex: 1 1 auto;
}

.preview .tag-list {
  display: flex;
  font-size: 80%;
  align-items: center;
  gap: 2px;
}

.preview .tag {
  display: inline-block;
  border-radius: 4px;
  padding: 0 5px;
  line-height: 20px;
  height: 20px;
  color: var(--brand-text-color);
  background: var(--brand-color);
}
```

## serialization

The current state of a `<xin-filter>` can be serialized as, and restored from, a Javascript object (which itself
can easily be converted into JSON or a URL component) via its `state` property. Obviously, a `<xin-filter>` can
only restore state if it has the necessary constituent `filters`.

## availableFilters

`<xin-filter>` has a default set of `FilterMaker` objects which it uses to construct filter function.
In the example above, the default collection of filters is reduced to `contains`, `equals`, `after`, and `isTrue`.

The full collection includes:

- **contains** * looks for fields containing a string (ignoring case)
- **equals** * looks for fields containing equivalent values (ignoring case)
- **after** * looks for fields with a date after a provided value
- **greaterThan** * looks for fields with a value greater than a provided value
- **truthy** * looks for fields that are true / non-zero / non-empty
- **true** looks for fields that are `true`
- **false** looks for fields that are `false`
- **hasTags** looks for fields that are arrays containing all the (space/comma) delimited strings
- **doesNotHaveTags** looks for fields that are arrays containing *none* of the strings

**Note**: the filters marked with an * have negative version (e.g. does not contain).

```
type ObjectTest (obj: any) => boolean

interface FilterMaker {
  caption: string                                 // describes the test condition
  negative?: string                               // describes the negative test condition
  needsValue?: boolean                            // if false, the filterMaker doesn't need a needle value
  filterMaker(needle: any) => ObjectTest          // builds an ObjectTest
}
```
*/

import {
  Component as WebComponent,
  ElementCreator,
  elements,
  PartsMap,
} from 'tosijs'
import { icons } from './icons'
import { tosiSelect, TosiSelect, SelectOption } from './select'

const { div, input, button, span } = elements

type ObjectTest = (obj: any) => boolean
type ArrayFilter = (array: any[]) => any[]

const passThru = (array: any[]) => array
const NULL_FILTER_DESCRIPTION = 'null filter, everything matches'

interface FilterMaker {
  caption: string
  negative?: string
  needsValue?: boolean // default true
  makeTest: (value: any) => ObjectTest
}

export const availableFilters: { [key: string]: FilterMaker } = {
  contains: {
    caption: 'contains',
    negative: 'does not contain',
    makeTest: (value: string) => {
      value = value.toLocaleLowerCase()
      return (obj: any) => String(obj).toLocaleLowerCase().includes(value)
    },
  },
  hasTags: {
    caption: 'has tags',
    makeTest: (value: string) => {
      const tags = value
        .split(/[\s,]/)
        .map((tag) => tag.trim().toLocaleLowerCase())
        .filter((tag) => tag !== '')
      return (obj: any) =>
        Array.isArray(obj) &&
        tags.find((tag) => !obj.includes(tag)) === undefined
    },
  },
  doesNotHaveTags: {
    caption: 'does not have tags',
    makeTest: (value: string) => {
      const tags = value
        .split(/[\s,]/)
        .map((tag) => tag.trim().toLocaleLowerCase())
        .filter((tag) => tag !== '')
      return (obj: any) =>
        Array.isArray(obj) &&
        tags.find((tag) => obj.includes(tag)) === undefined
    },
  },
  equals: {
    caption: '=',
    negative: '≠',
    makeTest: (value: string) => {
      if (isNaN(Number(value))) {
        value = String(value).toLocaleLowerCase()
        return (obj: any) => String(obj).toLocaleLowerCase() === value
      }
      const num = Number(value)
      return (obj: any) => Number(obj) === num
    },
  },
  after: {
    caption: 'is after',
    negative: 'is before',
    makeTest: (value: any) => {
      const date = new Date(value)
      return (obj: any) => new Date(obj) > date
    },
  },
  greaterThan: {
    caption: '>',
    negative: '≤',
    makeTest: (value: any) => {
      if (!isNaN(Number(value))) {
        const num = Number(value)
        return (obj: any) => Number(obj) > num
      }
      value = value.toLocaleLowerCase()
      return (obj: any) => String(obj).toLocaleLowerCase() > value
    },
  },
  truthy: {
    caption: 'is true/non-empty/non-zero',
    negative: 'is false/empty/zero',
    needsValue: false,
    makeTest: () => (obj: any) => !!obj,
  },
  isTrue: {
    caption: '= true',
    needsValue: false,
    makeTest: () => (obj: any) => obj === true,
  },
  isFalse: {
    caption: '= false',
    needsValue: false,
    makeTest: () => (obj: any) => obj === false,
  },
}

interface Filter {
  description: string
  test: ObjectTest
}

const passAnything = {
  description: 'anything',
  test: () => true,
}

function getSelectText(select: TosiSelect): string {
  return (select.options[select.selectedIndex] as SelectOption)?.caption || ''
}

type Fields = Array<{ name?: string; prop: string }>

export interface FilterPartState {
  haystack: string
  condition: string
  needle: string
}

interface FilterPartParts extends PartsMap {
  haystack: TosiSelect
  condition: TosiSelect
  needle: HTMLInputElement
  remove: HTMLButtonElement
}

export class FilterPart extends WebComponent<FilterPartParts> {
  static initAttributes = {
    haystack: '*',
    condition: 'contains',
    needle: '',
  }

  fields: Fields = []
  filters = availableFilters

  content = () => [
    tosiSelect({ part: 'haystack' }),
    tosiSelect({ part: 'condition' }),
    input({ part: 'needle', type: 'search' }),
    span({ part: 'padding' }),
    button({ part: 'remove', title: 'delete' }, icons.trash()),
  ]

  filter: Filter = passAnything

  get state(): FilterPartState {
    const { haystack, needle, condition } = this.parts
    return {
      haystack: haystack.value,
      needle: needle.value,
      condition: condition.value,
    }
  }

  set state(newState: FilterPartState) {
    Object.assign(this, newState)
  }

  buildFilter = (/* event: Event */) => {
    const { haystack, condition, needle } = this.parts

    const negative = condition.value.startsWith('~')
    const key = negative ? condition.value.slice(1) : condition.value
    const filter = this.filters[key] as FilterMaker
    needle.hidden = filter.needsValue === false

    const baseTest =
      filter.needsValue === false
        ? filter.makeTest(undefined)
        : filter.makeTest(needle.value)
    const field = haystack.value
    let test

    if (field !== '*') {
      test = negative
        ? (obj: any) => !baseTest(obj[field])
        : (obj: any) => baseTest(obj[field])
    } else {
      test = negative
        ? (obj: any) =>
            Object.values(obj).find((v) => !baseTest(v)) !== undefined
        : (obj: any) =>
            Object.values(obj).find((v) => baseTest(v)) !== undefined
    }

    const matchValue = filter.needsValue !== false ? ` "${needle.value}"` : ''
    const description = `${getSelectText(haystack)} ${getSelectText(
      condition
    )}${matchValue}`

    this.filter = {
      description,
      test,
    }

    this.parentElement?.dispatchEvent(new Event('change'))
  }

  connectedCallback() {
    super.connectedCallback()

    const { haystack, condition, needle, remove } = this.parts

    haystack.addEventListener('change', this.buildFilter)
    condition.addEventListener('change', this.buildFilter)
    needle.addEventListener('input', this.buildFilter)
    haystack.value = this.haystack
    condition.value = this.condition
    needle.value = this.needle

    remove.addEventListener('click', () => {
      const { parentElement } = this
      this.remove()
      parentElement?.dispatchEvent(new Event('change'))
    })
  }

  render() {
    super.render()

    const { haystack, condition, needle } = this.parts

    haystack.options = [
      {
        caption: 'any field',
        value: '*',
      },
      ...this.fields.map((field) => field.prop),
    ]

    condition.options = Object.keys(this.filters)
      .map((key) => {
        const filter = this.filters[key]
        return filter.negative !== undefined
          ? [
              { caption: filter.caption, value: key },
              { caption: filter.negative, value: '~' + key },
            ]
          : { caption: filter.caption, value: key }
      })
      .flat() as SelectOption[]

    if (this.haystack !== '') {
      haystack.value = this.haystack
    }
    if (this.condition !== '') {
      condition.value = this.condition
    }
    if (this.needle !== '') {
      needle.value = this.needle
    }
    this.buildFilter()
  }
}

export const filterPart = FilterPart.elementCreator({
  tag: 'xin-filter-part',
  styleSpec: {
    ':host': {
      display: 'flex',
    },

    ':host .xin-icon:': {
      verticalAlign: 'middle',
      pointerEvents: 'none',
    },

    ':host [part="haystack"], :host [part="condition"]': {
      flex: '1',
    },

    ':host [part="needle"]': {
      flex: 2,
    },

    ':host [hidden]+[part="padding"]': {
      display: 'block',
      content: ' ',
      flex: '1 1 auto',
    },
  },
}) as ElementCreator<FilterPart>

export type FilterState = FilterPartState[]

export interface FilterBuilderParts extends PartsMap {
  add: HTMLButtonElement
  resent: HTMLButtonElement
}

export class FilterBuilder extends WebComponent<FilterBuilderParts> {
  private _fields: Fields = []

  get fields(): Fields {
    return this._fields
  }

  set fields(_fields: Fields) {
    this._fields = _fields
    this.queueRender()
  }

  get state(): FilterState {
    const { filterContainer } = this.parts
    return ([...filterContainer.children] as FilterPart[]).map(
      (part) => part.state
    )
  }

  set state(parts: FilterState) {
    const { fields, filters } = this
    const { filterContainer } = this.parts
    filterContainer.textContent = ''
    for (const state of parts) {
      filterContainer.append(filterPart({ fields, filters, ...state }))
    }
  }

  filter: ArrayFilter = passThru
  description = NULL_FILTER_DESCRIPTION

  addFilter = () => {
    const { fields, filters } = this
    const { filterContainer } = this.parts
    filterContainer.append(filterPart({ fields, filters }))
  }

  content = () => [
    button(
      {
        part: 'add',
        title: 'add filter condition',
        onClick: this.addFilter,
        class: 'round',
      },
      icons.plus()
    ),
    div({ part: 'filterContainer' }),
    button(
      { part: 'reset', title: 'reset filter', onClick: this.reset },
      icons.x()
    ),
  ]

  filters = availableFilters

  reset = () => {
    const { fields, filters } = this
    const { filterContainer } = this.parts
    this.description = NULL_FILTER_DESCRIPTION
    this.filter = passThru
    filterContainer.textContent = ''
    filterContainer.append(filterPart({ fields, filters }))
    this.dispatchEvent(new Event('change'))
  }

  buildFilter = (/* event: Event */) => {
    const { filterContainer } = this.parts
    if (filterContainer.children.length === 0) {
      this.reset()
      return
    }
    const filters = ([...filterContainer.children] as FilterPart[]).map(
      (filterPart) => filterPart.filter
    ) as Filter[]
    const tests = filters.map((filter) => filter.test) as ObjectTest[]
    this.description = filters.map((filter) => filter.description).join(', ')
    this.filter = (array: any[]) =>
      array.filter(
        (obj: any) => tests.find((f) => f(obj) === false) === undefined
      )
    this.dispatchEvent(new Event('change'))
  }

  connectedCallback(): void {
    super.connectedCallback()

    const { filterContainer } = this.parts
    filterContainer.addEventListener('change', this.buildFilter)

    this.reset()
  }

  render() {
    super.render()
  }
}

export const filterBuilder = FilterBuilder.elementCreator({
  tag: 'xin-filter',
  styleSpec: {
    ':host': {
      height: 'auto',
      display: 'grid',
      gridTemplateColumns: '32px calc(100% - 64px) 32px',
      alignItems: 'center',
    },

    ':host [part="filterContainer"]': {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'stretch',
      flex: '1 1 auto',
    },

    ':host [part="haystack"]': {
      _fieldWidth: '100px',
    },

    ':host [part="condition"]': {
      _fieldWidth: '60px',
    },

    ':host [part="needle"]': {
      _fieldWidth: '80px',
    },

    ':host [part="add"], :host [part="reset"]': {
      '--button-size': 'var(--touch-size, 32px)',
      borderRadius: '999px',
      height: 'var(--button-size)',
      lineHeight: 'var(--button-size)',
      margin: '0',
      padding: '0',
      textAlign: 'center',
      width: 'var(--button-size)',
      flex: '0 0 var(--button-size)',
    },
  },
}) as ElementCreator<FilterBuilder>
