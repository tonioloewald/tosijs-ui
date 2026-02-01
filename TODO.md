# TODO

## High Priority

- **JSON Schema-driven form editor** - Integrate schema-based form generation
- **Agent-based QA using Haltija** - Build automated QA testing with Haltija

## Medium Priority

- **Vector similarity search for doc-browser** - Replace current search with vector-based approach
- **Focus management and focus-visible styling** - Improve keyboard navigation and focus indicators

## Localization

- Adding automatic localization where appropriate:
  - `<xin-password-strength>`
  - `<xin-tag-list>`
  - `<xin-filter>`

## Components

### `<xin-b3d>`
- Converting this to a blueprint

### `<xin-filter>`
- Leverage `<xin-select>` for picking fields etc.
- Leverage `<xin-tag-list>` for displaying filters compactly
- Leverage `popFloat` for disclosing filter-editor

### `<xin-editable>`
- Add support for disabling / enabling options
- Hide lock icons while resizing
- Maybe show lines under locks indicating the parent
- Support snapping to sibling boundaries and centers

## Build System

- Better leveraging of tree-shaking

## Completed

- ~~Add unit tests for components~~
- ~~Add accessibility (ARIA) attributes to components~~
