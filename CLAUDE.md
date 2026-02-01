# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

tosijs-ui (formerly xinjs-ui) is a web-component library built on [tosijs](https://tosijs.net). Components augment HTML5/CSS3 rather than replacing native elements. The library is developed using [bun](https://bun.sh/).

## Common Commands

```bash
bun start              # Dev server at https://localhost:8787 (hot reload)
bun tests              # Run unit tests + Playwright tests
bun format             # ESLint + Prettier
bun latest             # Clean install (removes node_modules + bun.lock)
bunx tsc --noEmit      # Type check without emitting (used in CI)
```

Running a single unit test:
```bash
bun test src/make-sorter.test.ts
```

Running a single Playwright test:
```bash
bun playwright test tests/form.pw.ts
```

## Architecture

### Build Pipeline

`bin/dev.ts` orchestrates the build:
1. Writes version from `package.json` to `src/version.ts`
2. Extracts `/*#` doc comments from `src/` and `README.md` → `demo/docs.json`
3. Generates icon data via `bin/make-icon-data.js`
4. Compiles TypeScript → ESM in `dist/`
5. Generates type declarations → `dist/*.d.ts`
6. Bundles IIFE version (tosijs + marked included) → `dist/iife.js`
7. Builds demo site → `docs/`

The dev server watches:
- `src/` and `README.md` → triggers doc extraction + rebuild
- `demo/src/` → triggers demo rebuild only
- `demo/xin-icon-font/` → triggers icon data regeneration

### Directory Structure

- `src/` - Library source code and unit tests (`*.test.ts`)
- `tests/` - Playwright end-to-end tests (`*.pw.ts`)
- `demo/src/` - Demo site source (separate from library)
- `demo/static/` - Static assets copied to `docs/`
- `dist/` - Built library output (ESM + IIFE + types)
- `docs/` - Built demo site (served at https://localhost:8787)

### Component Structure

Each component lives in `src/<component>.ts` and exports:
- A `Component` subclass (the custom element)
- An `ElementCreator` function (factory for creating instances)

New components must be added to `src/index.ts`.

Example pattern:
```typescript
export class MyComponent extends Component {
  myProperty: string = ''
  
  constructor() {
    super()
    this.initAttributes('myProperty')  // Make reactive
  }
  
  content = () => [/* elements or template */]
}

export const myComponent = MyComponent.elementCreator({
  tag: 'my-component',
  styleSpec: { /* styles */ }
}) as ElementCreator<MyComponent>
```

### Documentation System

Components are self-documenting via `/*#` comment blocks containing markdown. Live examples use consecutive code blocks (html/js/css). Control nav ordering with JSON metadata:
- `/*{ "pin": "top" }*/` or `<!--{ "pin": "top" }-->` for pinning

The `createDocBrowser()` function renders documentation from extracted `docs.json`.

### Key Dependencies

- `tosijs`: Core component framework (peer dependency)
- `marked`: Markdown parsing (peer dependency)
- Components use custom HTML tags with `xin-` prefix (e.g., `<xin-table>`, `<xin-select>`)

### Component Philosophy

- Work with the browser, not against it
- `value` property for state, `change` event when it changes
- `action` event for user interactions (distinct from value changes)
- Binary attributes (`hidden`, `disabled`) work as expected
- Interoperable with other web-component libraries

## Task Tracking

Open tasks and planned work are tracked in `TODO.md` at the project root.
