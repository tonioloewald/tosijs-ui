/*!
# filter

Automatically creates `ArrayFilter` functions `(a: any[]) => any[]` based on the query you build using its
macOS Finder-inspired interface, using an easily customizable / extensible collection of `Filter` objects.

```js
const { elements } = xinjs
const { dataTable, filterBuilder, availableFilters } = xinjsui

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
import { Component as WebComponent, ElementCreator } from 'xinjs';
type ObjectTest = (obj: any) => boolean;
type ArrayFilter = (array: any[]) => any[];
interface FilterMaker {
    caption: string;
    negative?: string;
    needsValue?: boolean;
    makeTest: (value: any) => ObjectTest;
}
export declare const availableFilters: {
    [key: string]: FilterMaker;
};
interface Filter {
    description: string;
    test: ObjectTest;
}
type Fields = Array<{
    name?: string;
    prop: string;
}>;
export interface FilterPartState {
    haystack: string;
    condition: string;
    needle: string;
}
export declare class FilterPart extends WebComponent {
    fields: Fields;
    filters: {
        [key: string]: FilterMaker;
    };
    haystack: string;
    condition: string;
    needle: string;
    content: () => any[];
    filter: Filter;
    constructor();
    get state(): FilterPartState;
    set state(newState: FilterPartState);
    buildFilter: () => void;
    connectedCallback(): void;
    render(): void;
}
export declare const filterPart: ElementCreator<FilterPart>;
export type FilterState = FilterPartState[];
export declare class FilterBuilder extends WebComponent {
    private _fields;
    get fields(): Fields;
    set fields(_fields: Fields);
    get state(): FilterState;
    set state(parts: FilterState);
    filter: ArrayFilter;
    description: string;
    addFilter: () => void;
    content: () => any[];
    filters: {
        [key: string]: FilterMaker;
    };
    reset: () => void;
    buildFilter: () => void;
    connectedCallback(): void;
    render(): void;
}
export declare const filterBuilder: ElementCreator<FilterBuilder>;
export {};
